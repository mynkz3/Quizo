# 🎯 Quizo

A real-time, Kahoot-style quiz & presentation platform. A host creates slides and
launches a live session; players join from their phones with a game PIN, answer
questions in real time, and compete on a live leaderboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101.svg)](https://socket.io/)

## ✨ Features

- 🖥️ **Host view** — build slides, open a lobby, and present questions live
- 📱 **Mobile join** — players connect over the LAN with a game PIN and nickname
- ⚡ **Real-time** — answers, scoring, and the leaderboard update instantly via Socket.io
- 🏆 **Live scoring & podium** — speed-based points and an end-game podium
- 💾 **MongoDB persistence** — sessions and participants stored in the database

## 🛠️ Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 19, React Router, Vite, Socket.io-client    |
| Backend  | Node.js, Express 5, Socket.io, Mongoose           |
| Database | MongoDB                                            |

## 📁 Project Structure

```
quizo/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── host/        # SlideCreator, HostLobby, PresenterView
│       │   └── participant/ # JoinPage, LobbyPage, GamePage
│       ├── components/      # Podium, etc.
│       └── socket.js        # Socket.io client connection
├── server/                 # Node + Express + Socket.io backend
│   ├── config/db.js         # MongoDB connection
│   ├── models/              # Session, Participant schemas
│   ├── routes/              # REST API routes
│   ├── socket/              # room / state / scoring handlers
│   └── utils/scoring.js     # Scoring logic
├── LICENSE
└── README.md
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18 or later) installed on your machine.
2. **MongoDB** installed and running locally on the default port `27017`.

### 1. Database Setup

Ensure your local MongoDB server is running. You can start it in a separate
terminal with:

```bash
mongod
```

> **Windows users:** make sure the `C:\data\db` folder exists first.

### 2. Backend Setup

```bash
cd server
cp .env.example .env      # then edit values if needed
npm install
npm run dev
```

The server starts on `http://localhost:3001` and connects to the database.

### 3. Frontend Setup

In a **new** terminal:

```bash
cd client
npm install
npm run dev
```

The client starts on port `5173`.

## 🎮 How to Play

### As the Host

1. On your laptop, open 👉 **`http://localhost:5173/host/create`**
2. Create your slides and click **"Create Session"**.
3. A large **Game PIN** appears on the lobby screen.
4. Wait for players to join, then click **"Start Game"**!

### As a Participant (mobile phone)

1. Connect your phone to the **same Wi-Fi network** as the host's laptop.
2. In the terminal running Vite, find the **Network** IP (e.g. `http://192.168.x.x:5173/`).
3. Open that address in your phone's browser.
4. Enter the **Game PIN**, pick a nickname, and join!

## 📄 License

Licensed under the MIT License — see [LICENSE](LICENSE) for details.
