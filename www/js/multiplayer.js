// ============================================================
// multiplayer.js — Peer-to-peer multiplayer logic
// ============================================================

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function broadcastLobby() {
  if (!multiplayer.isHost) return;
  const message = { type: 'lobby', roomCode: multiplayer.roomCode, players: multiplayer.players };
  multiplayer.connections.forEach(conn => { if (conn.open) conn.send(message); });
  render();
}

function broadcastGameState() {
  if (!multiplayer.isHost || !multiplayer.gameStarted) return;
  const message = { type: 'state', snapshot: publicGameSnapshot() };
  multiplayer.connections.forEach(conn => { if (conn.open) conn.send(message); });
}

function privateRoleInfo(idx) {
  const role = state.roles[idx]?.role || 'liberal';
  const n    = state.players.length;
  let known  = [];
  if (role === 'fascist' || role === 'monarchist') {
    known = Object.entries(state.roles)
      .filter(([i, r]) => +i !== idx && ['fascist', 'hitler', 'monarchist'].includes(r.role))
      .map(([i]) => state.players[+i]);
  } else if (role === 'hitler' && PLAYER_CONFIG[n]?.hitlerKnows) {
    known = Object.entries(state.roles)
      .filter(([i, r]) => +i !== idx && ['fascist', 'monarchist'].includes(r.role))
      .map(([i]) => state.players[+i]);
  } else if ((role === 'communist' || role === 'anarchist') && state.xl.communists && n >= 11) {
    known = Object.entries(state.roles)
      .filter(([i, r]) => +i !== idx && ['communist', 'anarchist'].includes(r.role))
      .map(([i]) => state.players[+i]);
  }
  return { role, known };
}

function sendOnlineGameStart() {
  multiplayer.gameStarted = true;
  multiplayer.playerIndex = 0;
  const own = privateRoleInfo(0);
  multiplayer.privateRole  = own.role;
  multiplayer.knownPlayers = own.known;
  multiplayer.players.forEach((player, idx) => {
    if (idx === 0) return;
    const conn = multiplayer.connections.get(player.id);
    if (conn?.open) conn.send({ type: 'game-start', playerIndex: idx, private: privateRoleInfo(idx), snapshot: publicGameSnapshot() });
  });
  state.screen = 'online-role';
}

function handleHostData(conn, data) {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'join') {
    const name = String(data.name || 'Giocatore').trim().slice(0, 20);
    if (!multiplayer.players.some(p => p.id === conn.peer)) multiplayer.players.push({ id: conn.peer, name, host: false });
    broadcastLobby();
  } else if (data.type === 'vote' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx >= 0 && !state.executedPlayers.includes(idx) && state.votes[idx] === undefined) {
      state.votes[idx] = data.vote === 'nein' ? 'nein' : 'ja';
      saveGame();
      broadcastGameState();
    }
  }
}

function connectAsHost(name) {
  if (typeof Peer === 'undefined') { multiplayer.error = 'Modulo rete non disponibile.'; render(); return; }
  multiplayer.roomCode  = makeRoomCode();
  multiplayer.playerName = name;
  multiplayer.isHost    = true;
  multiplayer.peer      = new Peer(`sh-${multiplayer.roomCode.toLowerCase()}`);
  multiplayer.peer.on('open', id => {
    multiplayer.connected = true;
    multiplayer.players   = [{ id, name, host: true }];
    state.screen = 'online-lobby';
    render();
  });
  multiplayer.peer.on('connection', conn => {
    multiplayer.connections.set(conn.peer, conn);
    conn.on('data', data => handleHostData(conn, data));
    conn.on('close', () => {
      multiplayer.connections.delete(conn.peer);
      multiplayer.players = multiplayer.players.filter(p => p.id !== conn.peer);
      broadcastLobby();
    });
  });
  multiplayer.peer.on('error', () => {
    multiplayer.error = 'Impossibile creare la stanza. Riprova.';
    state.screen = 'online-menu';
    render();
  });
}

function connectAsGuest(name, code) {
  if (typeof Peer === 'undefined') { multiplayer.error = 'Modulo rete non disponibile.'; render(); return; }
  multiplayer.roomCode   = code;
  multiplayer.playerName = name;
  multiplayer.isHost     = false;
  multiplayer.peer       = new Peer();
  multiplayer.peer.on('open', () => {
    const conn = multiplayer.peer.connect(`sh-${code.toLowerCase()}`, { reliable: true });
    multiplayer.hostConnection = conn;
    conn.on('open', () => { multiplayer.connected = true; conn.send({ type: 'join', name }); state.screen = 'online-lobby'; render(); });
    conn.on('data', data => {
      if (data.type === 'lobby')      { multiplayer.players = data.players || []; state.screen = 'online-lobby'; render(); }
      if (data.type === 'game-start') {
        multiplayer.gameStarted = true; multiplayer.playerIndex = data.playerIndex;
        multiplayer.privateRole = data.private.role; multiplayer.knownPlayers = data.private.known || [];
        applyPublicGameSnapshot(data.snapshot); state.screen = 'online-role'; render();
      }
      if (data.type === 'state') { applyPublicGameSnapshot(data.snapshot); render(); }
    });
    conn.on('close', () => { multiplayer.connected = false; multiplayer.error = 'Connessione con l\'host terminata.'; state.screen = 'online-menu'; render(); });
  });
  multiplayer.peer.on('error', () => { multiplayer.error = 'Stanza non trovata o connessione non disponibile.'; state.screen = 'online-menu'; render(); });
}

function leaveOnlineRoom() {
  try { multiplayer.peer?.destroy(); } catch (_) {}
  multiplayer.peer = null; multiplayer.hostConnection = null; multiplayer.connections.clear();
  multiplayer.players = []; multiplayer.connected = false; multiplayer.gameStarted = false;
  multiplayer.isHost = false; multiplayer.roomCode = ''; multiplayer.privateRole = null;
  state.screen = 'home';
  render();
}
