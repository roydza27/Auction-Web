# 🏐 Premier Sports Auction Web Platform

> A real-time sports auction platform designed for managing sports tournaments and player auctions. Built with real-time WebSocket synchronization, animated randomized spin wheel selection, automated countdown timers, dynamic purse budget tracking, and instant CSV roster reporting.

[![Quickstart Guide](https://img.shields.io/badge/Docs-Quickstart%20Guide-brightgreen?style=for-the-badge)](./QUICKSTART.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> [!TIP]
> **Trying to run this repository locally?** Follow our step-by-step [⚡ QUICKSTART GUIDE](./QUICKSTART.md) to get up and running with demo data in under 5 minutes on Linux, macOS, or Windows!

---

## 🌟 Key Features

- 🎡 **Randomized Spin Wheel**: Smooth 4-second animated wheel that randomly selects the next player for auction.
- ⏱️ **Countdown Bidding Timer**: 30-second countdown with visual pulse alerts when reaching the final 10 seconds.
- 💰 **Purse & Budget Enforcement**: Real-time validation preventing teams from exceeding their max budget or roster slot limits.
- 🎊 **Celebration Visual Effects**: Dynamic celebratory confetti explosion and audio cue whenever a player is successfully assigned.
- 🔄 **Real-Time WebSocket Sync**: Instant multi-client synchronization via Socket.io across all connected organizers and screens.
- 📥 **Flexible CSV Import & Export**: One-click roster ingestion with flexible column mapping, and downloadable CSV summary sheets upon auction completion.
- 🔁 **Unsold Player Re-Auction**: Dedicated management view to track and re-enter unsold players back into the bidding pool.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS & Custom Dark/Gold Luxury Theme System
- **Real-Time Client**: Socket.io Client
- **Animations**: Framer Motion & CSS Keyframes
- **Routing**: React Router v6
- **Effects**: Canvas-Confetti

### Backend
- **Runtime**: Node.js & Express
- **Database**: MongoDB with Mongoose ODM
- **Real-Time Server**: Socket.io WebSocket Server
- **File Parsing**: `csv-parse` and Multer

---

## 🚀 Quick Setup Overview

### 1. Clone the Repository
```bash
git clone https://github.com/roydza27/Auction-Web.git
cd Auction-Web
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
```
Start backend:
```bash
npm run dev
# Running on http://localhost:5001
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5001/api
```
Start frontend:
```bash
npm start
# Opens at http://localhost:3000
```

> For full configuration options, troubleshooting tips, and demo walkthroughs, see [QUICKSTART.md](./QUICKSTART.md).

---

## 🖼️ Media & Image Policy

To maintain a lightweight git repository and protect private player photos:
1. **Ignored in Git**: All raw image binaries (`.png`, `.jpg`, `.ico`, `.svg`, etc.) and private spreadsheets (`.csv`, `.xlsx`) are strictly excluded in `.gitignore`.
2. **Graceful UI Fallbacks**: When no image file is found, the frontend automatically generates stylized avatar badges using the player's initials and position color palette.
3. **Using Custom Photos**: In your uploaded CSV, simply specify any public image URL (Google Drive, Cloudinary, Imgur, or direct HTTPS link) in the `photoUrl` column. The backend handles image resolution and caching automatically.
4. **Sample Template**: Use the included [`sample_players.csv.example`](./sample_players.csv.example) at the project root for immediate testing.

---

## 📁 Repository Structure

```text
Auction-Web/
├── backend/
│   ├── controllers/      # Player, Team, and Bidding business logic
│   ├── models/           # Mongoose schemas (Player, Team, Bid)
│   ├── routes/           # REST API endpoints
│   ├── scripts/          # Database maintenance & automated test utilities
│   ├── tests/            # Auction scenario test suites
│   └── server.js         # Express app initialization & Socket.io server
├── frontend/
│   ├── public/           # Static web assets & manifests
│   └── src/
│       ├── components/   # SpinWheel, AuctionCard, PlayerCard, TeamCard, Modals
│       ├── contexts/     # AuctionContext for real-time WebSocket state
│       ├── pages/        # AuctionPage, PlayersPage, TeamsPage, ResultsPage, UnsoldPage
│       ├── services/     # Axios REST API services
│       ├── styles/       # Design tokens, luxury animations, and theme styles
│       └── types/        # TypeScript interfaces and domain models
├── sample_players.csv.example  # Ready-to-use CSV template for player roster import
├── QUICKSTART.md         # Detailed local onboarding guide
└── DEPLOYMENT.md         # Production deployment instructions (Render + Vercel)
```

---

## 📡 API Reference Summary

### Players
- `GET /api/players` - Retrieve all players (supports status/team filters)
- `POST /api/players` - Register an individual player
- `POST /api/players/upload` - Bulk import players via CSV
- `PATCH /api/players/:id` - Update player attributes or status
- `POST /api/players/:id/assign` - Assign a player to a winning team
- `DELETE /api/players/:id` - Remove a player record

### Teams
- `GET /api/teams` - List all teams with budget and roster allocations
- `POST /api/teams` - Create a team with purse budget and slot constraints
- `PATCH /api/teams/:id` - Update team information
- `DELETE /api/teams/:id` - Delete a team (if no active players assigned)

### Real-Time WebSocket Events (Socket.io)
- `playerUpdated` - Broadcast when player status, bid, or team changes
- `teamUpdated` - Broadcast when team remaining budget or slot count changes

---

## 🚢 Deployment

- **Frontend**: One-click deployment to [Vercel](https://vercel.com) using `frontend/vercel.json`.
- **Backend**: Container or Node.js deployment to [Render](https://render.com) or Railway.
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Free Shared Cluster (M0).

Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE) - feel free to use and adapt it for your tournaments!
