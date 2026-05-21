const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const GRID_COLS = 32;
const GRID_ROWS = 32;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS; // 1024
const COOLDOWN_MS = 3000;

// ── Database ────────────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'grid.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cells (
    id          INTEGER PRIMARY KEY,
    owner_id    TEXT    DEFAULT NULL,
    owner_name  TEXT    DEFAULT NULL,
    owner_color TEXT    DEFAULT NULL,
    claimed_at  INTEGER DEFAULT NULL
  )
`);

const cellCount = db.prepare('SELECT COUNT(*) as c FROM cells').get().c;
if (cellCount === 0) {
  const insert = db.prepare('INSERT INTO cells (id) VALUES (?)');
  db.transaction(() => {
    for (let i = 0; i < TOTAL_CELLS; i++) insert.run(i);
  })();
  console.log(`Initialised ${TOTAL_CELLS} cells`);
}

// Prepared statements
const stmtGetGrid        = db.prepare('SELECT id, owner_id, owner_name, owner_color, claimed_at FROM cells ORDER BY id');
const stmtClaimCell      = db.prepare('UPDATE cells SET owner_id=?, owner_name=?, owner_color=?, claimed_at=? WHERE id=?');
const stmtLeaderboard    = db.prepare(`
  SELECT owner_name AS name, owner_color AS color, COUNT(*) AS count
  FROM cells
  WHERE owner_id IS NOT NULL
  GROUP BY owner_id
  ORDER BY count DESC
  LIMIT 10
`);
const stmtTotalClaimed   = db.prepare('SELECT COUNT(*) AS c FROM cells WHERE owner_id IS NOT NULL');

// ── HTTP + WebSocket server ──────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

// ── User generation ──────────────────────────────────────────────────────────

const ADJ   = ['Swift','Bold','Bright','Calm','Clever','Dark','Daring','Epic','Fierce','Grand','Happy','Keen','Lucky','Magic','Noble','Proud','Quick','Sharp','Wise','Zany','Jade','Neon','Cosmic','Savage','Royal'];
const NOUN  = ['Fox','Bear','Eagle','Wolf','Tiger','Lion','Hawk','Raven','Panda','Shark','Lynx','Cobra','Falcon','Dragon','Storm','Blaze','Comet','Quasar','Nova','Titan','Specter','Vortex','Cipher','Nomad','Flux'];
const COLORS = [
  '#FF6B6B','#FF9F43','#FECA57','#48DBFB','#FF9FF3',
  '#54A0FF','#A29BFE','#00D2D3','#1DD1A1','#FF6348',
  '#7BED9F','#70A1FF','#FF4757','#2ED573','#FFA502',
  '#EE5A24','#009432','#0652DD','#9980FA','#C4E538',
  '#F368E0','#00CEC9','#FDCB6E','#6C5CE7','#E17055',
];

function genUser() {
  const adj   = ADJ[Math.floor(Math.random() * ADJ.length)];
  const noun  = NOUN[Math.floor(Math.random() * NOUN.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { name: `${adj} ${noun}`, color };
}

// ── State ────────────────────────────────────────────────────────────────────

const clients   = new Map(); // ws → { userId, userName, userColor }
const cooldowns = new Map(); // userId → lastClaimTimestamp

// ── Helpers ──────────────────────────────────────────────────────────────────

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients.keys()) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ── Connection handler ───────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  const userId = uuidv4();
  const { name: userName, color: userColor } = genUser();
  clients.set(ws, { userId, userName, userColor });

  console.log(`+ ${userName} connected  (${clients.size} online)`);

  send(ws, {
    type: 'init',
    userId,
    userName,
    userColor,
    grid:         stmtGetGrid.all(),
    leaderboard:  stmtLeaderboard.all(),
    totalClaimed: stmtTotalClaimed.get().c,
    onlineCount:  clients.size,
  });

  broadcast({ type: 'online_count', count: clients.size });

  // ── Message handler ────────────────────────────────────────────────────────

  ws.on('message', (raw) => {
    try {
      const msg  = JSON.parse(raw.toString());
      const user = clients.get(ws);
      if (!user) return;

      if (msg.type === 'claim') {
        const cellId = parseInt(msg.cellId, 10);
        if (isNaN(cellId) || cellId < 0 || cellId >= TOTAL_CELLS) return;

        const now       = Date.now();
        const lastClaim = cooldowns.get(user.userId) ?? 0;
        const remaining = COOLDOWN_MS - (now - lastClaim);

        if (remaining > 0) {
          send(ws, { type: 'cooldown_error', remaining });
          return;
        }

        stmtClaimCell.run(user.userId, user.userName, user.userColor, now, cellId);
        cooldowns.set(user.userId, now);

        broadcast({
          type:       'cell_claimed',
          cellId,
          ownerId:    user.userId,
          ownerName:  user.userName,
          ownerColor: user.userColor,
          claimedAt:  now,
        });

        broadcast({
          type:         'leaderboard_update',
          leaderboard:  stmtLeaderboard.all(),
          totalClaimed: stmtTotalClaimed.get().c,
        });
      }
    } catch (err) {
      console.error('WS message error:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`- disconnected  (${clients.size} online)`);
    broadcast({ type: 'online_count', count: clients.size });
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
    clients.delete(ws);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`GridApp server → http://localhost:${PORT}`);
});
