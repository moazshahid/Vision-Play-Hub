<div align="center">

```
██╗   ██╗██╗███████╗██╗ ██████╗ ███╗   ██╗    ██████╗ ██╗      █████╗ ██╗   ██╗    ██╗  ██╗██╗   ██╗██████╗ 
██║   ██║██║██╔════╝██║██╔═══██╗████╗  ██║    ██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝    ██║  ██║██║   ██║██╔══██╗
██║   ██║██║███████╗██║██║   ██║██╔██╗ ██║    ██████╔╝██║     ███████║ ╚████╔╝     ███████║██║   ██║██████╔╝
╚██╗ ██╔╝██║╚════██║██║██║   ██║██║╚██╗██║    ██╔═══╝ ██║     ██╔══██║  ╚██╔╝      ██╔══██║██║   ██║██╔══██╗
 ╚████╔╝ ██║███████║██║╚██████╔╝██║ ╚████║    ██║     ███████╗██║  ██║   ██║       ██║  ██║╚██████╔╝██████╔╝
  ╚═══╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ 
```

### 🎮 Play with your hands. No controller needed.

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-00897B?style=for-the-badge&logo=google&logoColor=white)](https://mediapipe.dev)

</div>

---

## 🕹️ What is Vision Play Hub?

**Vision Play Hub** is a full-stack, browser-based arcade gaming platform where your hands *are* the controller. Powered by [MediaPipe](https://mediapipe.dev) computer vision, the platform tracks your hand and facial gestures in real time — no mouse, no keyboard, no hardware required.

Seven uniquely designed arcade games. One webcam. Zero controllers.

> 🎬 **[Watch the Demo Video](#demo)**

---

## 🎮 Games

| Game | Controls | Mode |
|------|----------|------|
| 🐍 **Snake** | Hand tracking | Single Player |
| 🔨 **Whack-a-Mole** | Hand + Nose tracking | Single Player |
| 🏒 **Air Hockey** | Hand tracking | Single & Two Player |
| 🍰 **Dessert Slash** | Hand tracking | Single Player |
| 🏄 **Surf Dash** | Hand gestures for lane switching | Single Player |
| 🧱 **Tetris** | Hand tracking | Single Player |
| 🚀 **Space Wars** | Hand tracking | Single Player |

---

## ✨ Features

**🖐️ Gesture-Based Controls**
Real-time hand and facial tracking via MediaPipe. A live camera preview lets you see your gestures as you play. Detection latency reduced by **25%** through optimized processing pipelines.

**♿ Accessibility First**
- Colorblind mode (Deuteranopia & Protanopia)
- Light / Dark mode
- Nose-tracking controls in Whack-a-Mole for players with limited hand mobility
- High-contrast visuals and adjustable UI settings

**🏆 Live Leaderboards**
Real-time leaderboard with per-game filtering. Scores are submitted and ranked instantly via JWT-authenticated API calls.

**🔐 Secure Authentication**
Google OAuth + JWT + CSRF protection. User passwords are encrypted. Webcam footage is **never stored or transmitted** — all gesture processing happens entirely client-side.

**🐳 Docker Deployment**
One-command setup. The entire stack (React frontend, Django backend, PostgreSQL) runs in isolated Docker containers for consistent, reproducible environments.

**👥 Multiplayer**
Air Hockey supports real-time two-player mode — two hands, one screen, one game.

**🎨 Retro Arcade Theme**
A fully responsive retro-arcade UI built in React, with a game carousel, animated transitions, and a unified visual style across all games.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js |
| **Backend** | Django (Python) |
| **Database** | PostgreSQL |
| **Computer Vision** | MediaPipe |
| **Authentication** | Google OAuth, JWT, CSRF |
| **Deployment** | Docker, Docker Compose |
| **Version Control** | Git |

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.10+](https://python.org/)
- [PostgreSQL 17.4+](https://postgresql.org/)
- [Git](https://git-scm.com/)
- A **webcam-enabled device**
- **OS:** Windows 10+ or macOS 10.15+

---

## 🚀 Getting Started

### Step 1 — Clone the Repository

```bash
git clone https://github.com/moazshahid/Vision-Play-Hub.git
cd Vision-Play-Hub
```

### Step 2 — Start Docker Desktop

Open Docker Desktop and make sure it is running in the background before proceeding.

### Step 3 — Run the Setup Script

This step launches the full application stack. It may take **2–5 minutes** on first run.

**On macOS / Linux:**
```bash
chmod +x setup-app.sh
./setup-app.sh
```

**On Windows:**
```bash
./setup-app.bat
```

The setup script will automatically:
- ✅ Verify Docker is installed and running
- ✅ Start all Docker containers (frontend, backend, database)
- ✅ Wait for PostgreSQL to be ready
- ✅ Apply Django migrations to set up the database schema
- ✅ Load initial game data from `database/init_data.sql`

### Step 4 — Open the App

Once you see:
```
✅ Setup complete! You can now access the app at http://localhost:8000/
```

Open your browser and go to:

```
http://localhost:8000/
```

---

## 🎬 Demo

<a name="demo"></a>

> 📹 Add your demo video link here — e.g. `[![Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)`

---

## 📁 Project Structure

```
Vision-Play-Hub/
├── frontend/          # React.js application
├── backend/           # Django backend & API
│   └── cv_games/      # Core Django app & settings
├── database/          # PostgreSQL init scripts & migrations
├── testing/           # Integration test suite
├── docs/              # Documentation
├── setup-app.sh       # Linux/macOS setup script
└── setup-app.bat      # Windows setup script
```

---

## 👥 Contributors

| Contributor | Role |
|-------------|------|
| **Moaz Shahid** | Snake, Air Hockey, Tetris & Space Wars — full game logic, UI & gesture integration. SurfDash UI redesign. |
| **Aahana Bhowmick** | Whack-a-Mole, Dessert Slash & Surf Dash — game logic, UI, nose-tracking, merge master. |
| **Farheen Faisal** | PostgreSQL database, Google OAuth, JWT auth, leaderboards, Docker deployment. |
| **Nhlonipho Marwala** | Accessibility features — colorblind & light/dark mode frontend & backend implementation. |
| **Yuri Bautista** | Full website UI/UX — home, leaderboard, profile, FAQs, About Us pages. Merge master. |

---

## 📄 License

This project is open source. Contributions are welcome — feel free to fork, improve, and submit a pull request.

---

<div align="center">

*Built with 🎮 and a lot of hand gestures.*

</div>
