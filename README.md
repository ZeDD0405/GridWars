# GridWars — Real-time Territory Capture

A multiplayer real-time grid where users claim cells and compete for territory dominance.

## Quick start

### 1. Install & run the server
```bash
cd server
npm install
npm start
```
Server runs on **http://localhost:3001**

### 2. Install & run the client (dev mode)
```bash
cd client
npm install
npm run dev
```
Client runs on **http://localhost:5173** and connects to the backend automatically.

### Production build
```bash
cd client && npm run build   # outputs to client/dist/
cd ../server && npm start    # serves the built client + API on :3001
```

---

## Architecture & tech choices

### Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast DX, strong typing, HMR |
| Styling | Tailwind CSS + custom CSS | Utility classes + fine-grained animations |
| Backend | Node.js + Express | Minimal, non-blocking I/O |
| Real-time | WebSocket (`ws` library) | Lowest latency, full-duplex |
| Database | SQLite (`better-sqlite3`) | Zero-setup, sync API, WAL mode for concurrency |

### Real-time design
- Every connected client maintains a persistent WebSocket connection.
- The server holds a `Map<ws, user>` for all active connections.
- On any cell claim, the server **broadcasts to all clients** in a single loop — no pub/sub middleware needed at this scale.
- Reconnection is handled client-side with a 2.5s backoff; on reconnect the server sends full grid state.

### Conflict handling
- **Server-authoritative**: the server is the single source of truth.
- **Cooldown enforcement** is server-side — client sends a claim, server checks the timestamp, rejects if too soon.
- "Last write wins" if two users claim the same cell simultaneously (SQLite serialises writes).
- No optimistic updates — the cell changes only when the broadcast arrives back, keeping all clients consistent.

### Performance
- `React.memo` on `<Cell>` — only cells whose data actually changed re-render.
- Event delegation on the grid container — one click listener for 1024 cells.
- `useReducer` + `slice()` for immutable cell array updates (no full re-render on unrelated state changes).

### Features
- **1024 cells** (32×32 grid) with smooth pop animations on claim
- **3-second cooldown** enforced server-side, visualised as a fill bar
- **Leaderboard** — top 10 claimers, live-updated on every claim
- **Territory bar** — shows % of grid claimed overall
- **Online count** — live user count in header
- **Random user identity** — each visitor gets a unique name + color on connect
- **Stolen cells** — you can claim any cell, even one already owned

---

## WebSocket protocol

```
Client → Server
  { type: "claim", cellId: number }

Server → Client
  { type: "init",              userId, userName, userColor, grid[], leaderboard[], totalClaimed, onlineCount }
  { type: "cell_claimed",      cellId, ownerId, ownerName, ownerColor, claimedAt }
  { type: "leaderboard_update",leaderboard[], totalClaimed }
  { type: "online_count",      count }
  { type: "cooldown_error",    remaining }  // ms left on cooldown
```
