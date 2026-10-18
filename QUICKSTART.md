# ⚡ Local Development Quickstart Guide

A step-by-step guide to clone, configure, run, and test the **Sports Auction Web Application** locally on your machine.

---

## 📋 Prerequisites

Before starting, make sure you have the following installed:

| Tool | Minimum Version | Recommended | Check Command |
|---|---|---|---|
| **Node.js** | `v16.x` | `v18.x` or `v20.x` | `node -v` |
| **npm** | `v8.x` | `v9.x`+ | `npm -v` |
| **Git** | `v2.x` | Latest | `git -v` |
| **MongoDB** | Cloud or Local | MongoDB Atlas (Free M0) or MongoDB Community | — |

> [!TIP]
> If you don't have MongoDB installed locally, create a free cloud database cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) in under 2 minutes.

---

## 🚀 5-Minute Setup

### Step 0: Clone the Repository

```bash
git clone https://github.com/roydza27/Auction-Web.git
cd Auction-Web
```

---

### Step 1: Configure & Start Backend (Terminal 1)

1. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Create the environment file (`backend/.env`)**:
   
   **Linux / macOS (Bash):**
   ```bash
   cat << 'EOF' > .env
   PORT=5001
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sports-auction?retryWrites=true&w=majority
   EOF
   ```

   **Windows (PowerShell):**
   ```powershell
   @"
   PORT=5001
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sports-auction?retryWrites=true&w=majority
   "@ | Out-File -FilePath .env -Encoding utf8
   ```

   *(Or simply create `backend/.env` in your text editor and paste the lines above. If using a local MongoDB, use `MONGODB_URI=mongodb://127.0.0.1:27017/sports-auction`)*.

3. **Start the backend server**:
   ```bash
   npm run dev
   # Or: npm start
   ```

   ✅ **Expected Output**:
   ```text
   Server running on port 5001
   MongoDB connected successfully: sports-auction
   ```

---

### Step 2: Configure & Start Frontend (Terminal 2)

1. **Open a new terminal tab/window and navigate to the frontend directory**:
   ```bash
   cd frontend
   npm install
   ```

2. **Create the environment file (`frontend/.env`)**:

   **Linux / macOS (Bash):**
   ```bash
   echo "REACT_APP_API_URL=http://localhost:5001/api" > .env
   ```

   **Windows (PowerShell):**
   ```powershell
   "REACT_APP_API_URL=http://localhost:5001/api" | Out-File -FilePath .env -Encoding utf8
   ```

3. **Start the React development server**:
   ```bash
   npm start
   ```

   ✅ The web application will automatically open in your default browser at **`http://localhost:3000`**.

---

## 🖼️ Note on Images & Media

To keep the git repository lightweight and protect private photos:
- All raw image formats (`.png`, `.jpg`, `.svg`, etc.) are ignored by Git.
- **Built-in Fallbacks**: The frontend UI automatically generates polished avatar initials and position-colored badges whenever a player photo is missing or offline.
- **Using Custom Photos**: You can provide any public HTTPS URL (e.g., Unsplash, Cloudinary, or Google Drive share links) in your CSV upload. The backend will automatically fetch or serve them seamlessly!

---

## 🎯 60-Second Demo Data Setup

We provide a ready-to-use sample dataset [`sample_players.csv.example`](./sample_players.csv.example) at the project root.

### 1️⃣ Prepare Sample CSV
Copy the sample template to `sample_players.csv`:

**Linux / macOS:**
```bash
cp sample_players.csv.example sample_players.csv
```

**Windows (PowerShell):**
```powershell
Copy-Item sample_players.csv.example -Destination sample_players.csv
```

### 2️⃣ Upload Players (30 seconds)
1. Open [http://localhost:3000](http://localhost:3000) and click **Players** in the top navigation.
2. Click the **📤 Upload CSV** button in the header.
3. Select `sample_players.csv` from your project folder.
4. All 10 players will instantly appear with position badges and details.

### 3️⃣ Create Teams (45 seconds)
1. Click **Teams** in the top navigation.
2. Click **➕ Add New Team**.
3. Create your first team:
   - **Name**: `Thunder Strikers`
   - **Budget**: `50000`
   - **Max Slots**: `5`
4. Click **Add Team**.
5. Repeat to add a second team:
   - **Name**: `Lightning Bolts`
   - **Budget**: `50000`
   - **Max Slots**: `5`

---

## 🎡 Running the Live Auction

1. Navigate to the **Auction** tab.
2. Click **🎯 Next Player**:
   - The interactive **Spin Wheel** animates for 4 seconds with smooth physics.
   - A random player is selected and presented with player stats and base information.
3. **Bidding & Assignment**:
   - A **30-second countdown timer** starts ticking down.
   - Select a team from the dropdown.
   - Enter the final winning bid (e.g., `6000`).
   - Click **Assign to Team**.
   - 🎉 Enjoy the celebratory confetti explosion, sound effect, and real-time purse budget deduction!
4. **Handling Unsold Players**:
   - If no team bids on a player, click **Mark as Unsold** (or let the 30s timer expire).
   - Go to the **Unsold** page anytime to review unsold players and click **Re-Auction** to send them back into the active pool.
5. **View & Export Results**:
   - Go to the **Results** page to view team squad breakdowns and remaining purses.
   - Click **📥 Export CSV** to download the completed tournament roster sheet.

---

## 🛠️ Troubleshooting Matrix

| Issue | Root Cause | Solution |
|---|---|---|
| `MongooseServerSelectionError` | MongoDB connection string invalid or IP not whitelisted | In MongoDB Atlas, go to **Network Access** → Add IP Address → Select **Allow Access from Anywhere** (`0.0.0.0/0`). Verify username/password in `backend/.env`. |
| `EADDRINUSE: address already in use :::5001` | Another process is occupying port 5001 | **Linux/macOS**: `lsof -ti:5001 \| xargs kill -9`<br>**Windows**: `netstat -ano \| findstr :5001` then `taskkill /PID <PID> /F` |
| `Failed to fetch` or CORS error in browser | Frontend `.env` missing or backend not running | Verify `backend` is running on port 5001. Ensure `frontend/.env` contains `REACT_APP_API_URL=http://localhost:5001/api` and restart frontend. |
| CSV upload fails: `Missing required fields` | Column headers don't match expected names | Ensure your CSV includes: `name`, `regNo`, `position`, `class`. Refer to [`sample_players.csv.example`](./sample_players.csv.example) for exact formatting. |
| Missing team or player images | Images excluded via `.gitignore` | Expected behavior. The UI provides stylish initials and fallback avatars. To use custom images, provide public image URLs in the CSV `photoUrl` column. |

---

## 📂 Project Architecture Quick Reference

```
Auction-Web/
├── backend/
│   ├── controllers/      # Auction business logic, bid calculations, and CSV parsing
│   ├── models/           # Mongoose schemas (Player, Team, Bid)
│   ├── routes/           # Express REST endpoints (/api/players, /api/teams, /api/bids)
│   ├── server.js         # HTTP server & Socket.io WebSocket setup
│   └── tests/            # Automated test scenarios
├── frontend/
│   ├── src/
│   │   ├── components/   # SpinWheel, AuctionCard, PlayerCard, TeamCard, Modals
│   │   ├── contexts/     # AuctionContext for shared real-time state
│   │   ├── pages/        # AuctionPage, PlayersPage, TeamsPage, ResultsPage, UnsoldPage
│   │   ├── services/     # Axios API layer
│   │   └── styles/       # Dark/Gold luxury theme, animations, celebration particles
└── sample_players.csv.example  # Ready-to-use player import template
```

---

## 🤝 Need Help?

- Check [README.md](./README.md) for full project architecture and system design details.
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deploying to Vercel and Render.
- Open an issue on GitHub: [https://github.com/roydza27/Auction-Web/issues](https://github.com/roydza27/Auction-Web/issues)
