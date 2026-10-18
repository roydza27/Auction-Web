const Player = require("../models/player.model");
const Team = require("../models/team.model");
const { parse } = require("csv-parse");
const fs = require("fs");
const path = require("path");

// Helper to extract Google Drive file ID from various link formats
const extractGoogleDriveId = (url) => {
    if (!url || typeof url !== "string") return null;
    const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile) return matchFile[1];
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId) return matchId[1];
    const matchLh3 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (matchLh3) return matchLh3[1];
    return null;
};

// Helper to download player image locally to uploads/player-images/
const downloadPlayerPhoto = async (photoSource, regNo) => {
    if (!photoSource || typeof photoSource !== "string") return "";
    const cleanUrl = photoSource.trim();
    if (!cleanUrl) return "";

    // If it's already a local uploaded path, keep it
    if (cleanUrl.startsWith("/uploads/")) {
        return cleanUrl;
    }

    const driveId = extractGoogleDriveId(cleanUrl);
    const isHttp = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://");

    if (!driveId && !isHttp) {
        return cleanUrl;
    }

    const uploadDir = path.join(__dirname, "../uploads/player-images");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeRegNo = (regNo || "PLAYER").replace(/[^a-zA-Z0-9_-]/g, "_");
    const targetFilename = `${safeRegNo}.jpg`;
    const targetFilePath = path.join(uploadDir, targetFilename);

    // If already downloaded and valid, return local path
    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 1000) {
        return `/uploads/player-images/${targetFilename}`;
    }

    const candidateUrls = driveId
        ? [
            `https://lh3.googleusercontent.com/d/${driveId}`,
            `https://drive.google.com/uc?id=${driveId}&export=download`,
            `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
        ]
        : [cleanUrl];

    for (const url of candidateUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                if (buffer.length > 500) {
                    fs.writeFileSync(targetFilePath, buffer);
                    console.log(`✅ Downloaded photo for ${safeRegNo} -> ${targetFilename} (${buffer.length} bytes)`);
                    return `/uploads/player-images/${targetFilename}`;
                }
            }
        } catch (err) {
            console.warn(`Failed downloading image for ${safeRegNo} from ${url}:`, err.message);
        }
    }

    // Fallback if download failed
    if (driveId) {
        return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
    return cleanUrl;
};

// Upload players from CSV
exports.uploadPlayers = async (req, res) => {
    try {
        console.log("Upload request received");
        console.log("File:", req.file);
        console.log("Headers:", req.headers);

        if (!req.file) {
            console.error("No file in request");
            return res.status(400).json({ error: "No CSV file uploaded" });
        }

        console.log("Processing CSV file:", req.file.originalname);
        const results = [];

        fs.createReadStream(req.file.path)
            .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
            .on("data", data => {
                console.log("CSV row:", data);

                // Map CSV columns to database fields
                let rawPhoto = data["photoUrl"] || data["Photo URL"] || data["Player Photo"] || data["Photo"] || "";

                const player = {
                    name: (data["Player Name"] || data.name || data.Name || "").trim(),
                    regNo: (data["Registration Number"] || data.regNo || data["Reg No"] || data["Registration No"] || data["Register Number"] || data["Roll No"] || "").trim(),
                    class: (data["Player Year and Course"] || data.class || data.Class || data["Year and Course"] || "").trim(),
                    position: (data["Player Specialization"] || data.position || data.Position || data.Specialization || "").trim(),
                    photoUrl: rawPhoto.trim(),
                    rawPhoto: rawPhoto.trim(),
                    email: (data["Username"] || data.email || data.Email || "").trim(),
                    status: "available",
                };

                results.push(player);
            })
            .on("end", async () => {
                try {
                    console.log("CSV parsing complete. Total rows:", results.length);

                    if (results.length === 0) {
                        fs.unlinkSync(req.file.path);
                        return res.status(400).json({ error: "CSV file is empty or has no valid data" });
                    }

                    // Auto-generate regNo if missing
                    const existingCount = await Player.countDocuments();
                    results.forEach((player, index) => {
                        if (!player.regNo) {
                            player.regNo = `APL-${String(existingCount + index + 1).padStart(3, "0")}`;
                        }
                    });

                    // Validate required fields
                    const requiredFields = ["name", "class", "position"];
                    const missingFields = [];

                    results.forEach((row, index) => {
                        requiredFields.forEach(field => {
                            if (!row[field] || (typeof row[field] === "string" && row[field].trim() === "")) {
                                missingFields.push(`Row ${index + 2}: missing '${field}'`); // +2 because row 1 is header, index starts at 0
                            }
                        });
                    });

                    if (missingFields.length > 0) {
                        fs.unlinkSync(req.file.path);
                        return res.status(400).json({
                            error: "CSV validation failed",
                            details:
                                "Missing required fields. " +
                                missingFields.slice(0, 5).join(", ") +
                                (missingFields.length > 5 ? `... and ${missingFields.length - 5} more` : ""),
                        });
                    }

                    // Download photos locally for all players
                    console.log("Downloading player photos locally...");
                    for (const player of results) {
                        if (player.rawPhoto) {
                            player.photoUrl = await downloadPlayerPhoto(player.rawPhoto, player.regNo);
                        }
                        delete player.rawPhoto;
                    }

                    console.log("Attempting to insert players:", results.length);
                    const players = await Player.insertMany(results, { ordered: false });
                    console.log("Players inserted:", players.length);

                    // Delete the temporary file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        message: "Players uploaded successfully",
                        count: players.length,
                    });
                } catch (error) {
                    console.error("Error inserting players:", error);
                    // Clean up file even on error
                    if (req.file && fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }

                    // Handle duplicate key error
                    if (error.code === 11000) {
                        return res.status(400).json({
                            error: "Duplicate player registration number found",
                            details: "One or more players with the same regNo already exist in the database",
                        });
                    }

                    res.status(400).json({
                        error: "Invalid CSV format or data",
                        details: error.message,
                    });
                }
            })
            .on("error", error => {
                console.error("CSV parsing error:", error);
                // Clean up file on error
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(400).json({
                    error: "Error parsing CSV file",
                    details: error.message,
                });
            });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            error: "Error uploading players",
            details: error.message,
        });
    }
};

// Create a single player
exports.createPlayer = async (req, res) => {
    try {
        const { name, regNo, class: playerClass, yearCourse, position, email } = req.body;
        let photoUrl = req.body.photoUrl || "";

        const className = (playerClass || yearCourse || "").trim();

        if (!name || !name.trim() || !className || !position || !position.trim()) {
            return res.status(400).json({ error: "Name, class, and position are required" });
        }

        // Determine registration number
        let finalRegNo = regNo ? regNo.trim() : "";
        if (!finalRegNo) {
            const count = await Player.countDocuments();
            finalRegNo = `APL-${String(count + 1).padStart(3, "0")}`;
        } else {
            const existing = await Player.findOne({ regNo: finalRegNo });
            if (existing) {
                return res.status(400).json({ error: `Player with registration number '${finalRegNo}' already exists` });
            }
        }

        // Handle uploaded photo file or download remote photo
        if (req.file) {
            photoUrl = `/uploads/player-images/${req.file.filename}`;
        } else if (photoUrl) {
            photoUrl = await downloadPlayerPhoto(photoUrl, finalRegNo);
        }

        const player = new Player({
            name: name.trim(),
            regNo: finalRegNo,
            class: className,
            position: position.trim(),
            photoUrl: photoUrl.trim(),
            email: (email || "").trim(),
            status: "available",
        });

        await player.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("playerCreated", player);
            io.emit("playerUpdated", player);
        }

        res.status(201).json(player);
    } catch (error) {
        console.error("Error creating player:", error);
        if (error.code === 11000) {
            return res.status(400).json({ error: "Duplicate player registration number found" });
        }
        res.status(500).json({ error: "Error creating player", details: error.message });
    }
};

// Get random player (supports ?status=available or ?status=unsold)
exports.getRandomPlayer = async (req, res) => {
    try {
        const poolStatus = req.query.status === "unsold" ? "unsold" : "available";

        // Core rule: Unsold players can only be drawn if Round 1 is complete
        if (poolStatus === "unsold") {
            const availableCount = await Player.countDocuments({ status: "available" });
            if (availableCount > 0) {
                return res.status(400).json({
                    error: `Unsold players can only be auctioned after Round 1 is complete (${availableCount} players remaining)`
                });
            }
        }

        const count = await Player.countDocuments({ status: poolStatus });
        if (count === 0) {
            return res.status(404).json({ message: `No ${poolStatus} players found` });
        }

        const random = Math.floor(Math.random() * count);
        const player = await Player.findOne({ status: poolStatus }).skip(random);
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: "Error fetching random player" });
    }
};

// Assign player to team
exports.assignPlayer = async (req, res) => {
    try {
        const { playerId, teamId, amount } = req.body;

        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        // Check if team has available slots
        if (!team.canAddPlayer()) {
            return res.status(400).json({ error: "Team has no available slots" });
        }

        // Check if team has enough budget
        if (!team.hasEnoughBudget(amount)) {
            return res.status(400).json({ error: "Team does not have enough budget" });
        }

        // Update player
        player.status = "sold";
        player.team = teamId;
        player.soldAmount = amount;
        await player.save();

        // Update team
        team.players.push(playerId);
        team.filledSlots += 1;
        if (team.budget !== null) {
            team.remainingBudget -= amount;
        }
        await team.save();

        res.json({ message: "Player assigned successfully", player, team });
    } catch (error) {
        res.status(500).json({ error: "Error assigning player" });
    }
};

// Mark player as unsold
exports.markUnsold = async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        player.status = "unsold";
        await player.save();

        // Emit socket event for real-time updates
        const io = req.app.get("io");
        if (io) {
            io.emit("playerMarkedUnsold", player);
            io.emit("playerUpdated", player);
        }

        res.json({ message: "Player marked as unsold", player });
    } catch (error) {
        res.status(500).json({ error: "Error marking player as unsold" });
    }
};

// Get all unsold players
exports.getUnsoldPlayers = async (req, res) => {
    try {
        const players = await Player.find({ status: "unsold" });
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: "Error fetching unsold players" });
    }
};

// Get all players (supports search and filter)
exports.getAllPlayers = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status && ['available', 'sold', 'unsold'].includes(status)) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { regNo: { $regex: search, $options: 'i' } },
                { position: { $regex: search, $options: 'i' } },
                { class: { $regex: search, $options: 'i' } },
            ];
        }

        const players = await Player.find(query).populate("team", "name remainingBudget logoUrl");
        res.json(players);
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ error: "Error fetching players" });
    }
};

// Get single player by ID
exports.getPlayerById = async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId).populate("team", "name remainingBudget logoUrl");
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }
        res.json(player);
    } catch (error) {
        console.error("Error fetching player by ID:", error);
        res.status(500).json({ error: "Error fetching player" });
    }
};

// Delete single player
exports.deletePlayer = async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        // If player is assigned to a team, refund budget and decrement slots
        if (player.team && player.status === "sold") {
            const team = await Team.findById(player.team);
            if (team) {
                team.players = team.players.filter(p => String(p) !== String(playerId));
                team.filledSlots = team.players.length;
                team.remainingBudget = (team.remainingBudget || 0) + (player.soldAmount || 0);
                await team.save();

                const io = req.app.get("io");
                if (io) {
                    io.emit("teamUpdated", team);
                }
            }
        }

        await Player.findByIdAndDelete(playerId);

        const io = req.app.get("io");
        if (io) {
            io.emit("playerDeleted", { playerId });
        }

        res.json({ message: "Player deleted successfully", playerId });
    } catch (error) {
        console.error("Error deleting player:", error);
        res.status(500).json({ error: "Error deleting player", details: error.message });
    }
};

// Delete all players (for auction reset)
exports.deleteAllPlayers = async (req, res) => {
    try {
        const result = await Player.deleteMany({});

        // Reset all teams' players and budgets
        const teams = await Team.find();
        for (const team of teams) {
            team.players = [];
            team.filledSlots = 0;
            team.remainingBudget = team.budget;
            await team.save();
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("dataReset");
        }

        res.json({
            message: "All players deleted successfully and teams reset",
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("Error deleting all players:", error);
        res.status(500).json({ error: "Error deleting all players" });
    }
};

// Remove player from team
exports.removePlayerFromTeam = async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        if (!player.team || player.status !== "sold") {
            return res.status(400).json({ error: "Player is not assigned to any team" });
        }

        const teamId = player.team;
        const soldAmount = player.soldAmount || 0;

        // Find and update the team
        const team = await Team.findById(teamId);
        if (team) {
            // Remove player from team's players array
            team.players = team.players.filter(p => String(p) !== String(playerId));
            team.filledSlots = team.players.length;

            // Refund the sold amount to team's budget
            team.remainingBudget = (team.remainingBudget || 0) + soldAmount;

            await team.save();

            // Emit socket event for team update
            const io = req.app.get("io");
            if (io) {
                io.emit("teamUpdated", team);
            }
        }

        // Update player to available status
        player.status = "available";
        player.team = null;
        player.soldAmount = null;
        await player.save();

        // Emit socket events for real-time updates
        const io = req.app.get("io");
        if (io) {
            io.emit("playerUpdated", player);
            io.emit("playerRemovedFromTeam", { player, team });
        }

        res.json({
            message: "Player removed from team successfully",
            player,
            team,
        });
    } catch (error) {
        console.error("Error removing player from team:", error);
        res.status(500).json({ error: "Error removing player from team" });
    }
};

// Update player (PUT / PATCH)
exports.updatePlayer = async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        const updateData = req.body;

        // Handle uploaded photo file or download remote photo
        if (req.file) {
            player.photoUrl = `/uploads/player-images/${req.file.filename}`;
        } else if (updateData.photoUrl !== undefined) {
            let pUrl = updateData.photoUrl.trim();
            player.photoUrl = await downloadPlayerPhoto(pUrl, player.regNo);
        }

        // Check regNo uniqueness if changed
        if (updateData.regNo && updateData.regNo.trim() !== player.regNo) {
            const existing = await Player.findOne({ regNo: updateData.regNo.trim() });
            if (existing && String(existing._id) !== String(player._id)) {
                return res.status(400).json({ error: `Registration number '${updateData.regNo.trim()}' is already in use` });
            }
            player.regNo = updateData.regNo.trim();
        }

        // Basic fields
        if (updateData.name) player.name = updateData.name.trim();
        if (updateData.class) player.class = updateData.class.trim();
        if (updateData.position) player.position = updateData.position.trim();
        if (updateData.email !== undefined) player.email = updateData.email.trim();

        // Team and status synchronization
        const oldTeamId = player.team ? String(player.team) : null;
        const oldSoldAmount = player.soldAmount || 0;
        const oldStatus = player.status;

        const newStatus = updateData.status !== undefined ? updateData.status : oldStatus;
        const newTeamId = updateData.team !== undefined 
            ? (updateData.team ? String(updateData.team) : null)
            : oldTeamId;
        const newSoldAmount = updateData.soldAmount !== undefined 
            ? (updateData.soldAmount ? Number(updateData.soldAmount) : 0)
            : oldSoldAmount;

        // If player is marked available or unsold
        if (newStatus === "available" || newStatus === "unsold") {
            if (oldTeamId) {
                const oldTeam = await Team.findById(oldTeamId);
                if (oldTeam) {
                    oldTeam.players = oldTeam.players.filter(p => String(p) !== String(playerId));
                    oldTeam.filledSlots = oldTeam.players.length;
                    oldTeam.remainingBudget = (oldTeam.remainingBudget || 0) + oldSoldAmount;
                    await oldTeam.save();

                    const io = req.app.get("io");
                    if (io) io.emit("teamUpdated", oldTeam);
                }
            }
            player.team = null;
            player.soldAmount = 0;
            player.status = newStatus;
        } else if (newStatus === "sold") {
            player.status = "sold";
            player.soldAmount = newSoldAmount;

            // Team transfer or assignment
            if (newTeamId !== oldTeamId) {
                // Refund old team if existed
                if (oldTeamId) {
                    const oldTeam = await Team.findById(oldTeamId);
                    if (oldTeam) {
                        oldTeam.players = oldTeam.players.filter(p => String(p) !== String(playerId));
                        oldTeam.filledSlots = oldTeam.players.length;
                        oldTeam.remainingBudget = (oldTeam.remainingBudget || 0) + oldSoldAmount;
                        await oldTeam.save();

                        const io = req.app.get("io");
                        if (io) io.emit("teamUpdated", oldTeam);
                    }
                }

                // Add to new team
                if (newTeamId) {
                    const newTeam = await Team.findById(newTeamId);
                    if (newTeam) {
                        if (!newTeam.players.map(String).includes(String(playerId))) {
                            newTeam.players.push(playerId);
                        }
                        newTeam.filledSlots = newTeam.players.length;
                        if (newTeam.budget !== null) {
                            newTeam.remainingBudget = (newTeam.remainingBudget !== undefined ? newTeam.remainingBudget : newTeam.budget) - newSoldAmount;
                        }
                        await newTeam.save();

                        const io = req.app.get("io");
                        if (io) io.emit("teamUpdated", newTeam);
                    }
                }
                player.team = newTeamId;
            } else if (newTeamId && oldSoldAmount !== newSoldAmount) {
                // Same team, adjust soldAmount difference
                const team = await Team.findById(newTeamId);
                if (team) {
                    const diff = oldSoldAmount - newSoldAmount;
                    team.remainingBudget = (team.remainingBudget || 0) + diff;
                    await team.save();

                    const io = req.app.get("io");
                    if (io) io.emit("teamUpdated", team);
                }
            }
        }

        await player.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("playerUpdated", player);
            if (newStatus === "unsold" && oldStatus !== "unsold") {
                io.emit("playerMarkedUnsold", player);
            }
            if (newStatus === "sold" && oldStatus !== "sold") {
                io.emit("playerSold", player);
            }
        }

        const populated = await Player.findById(playerId).populate("team", "name remainingBudget logoUrl");
        res.json(populated || player);
    } catch (error) {
        console.error("Error updating player:", error);
        res.status(500).json({ error: "Error updating player", details: error.message });
    }
};
