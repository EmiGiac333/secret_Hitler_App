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
  advanceOnlinePresidency(null);
  state.chancellor = null;
  state.governmentConfirmed = false;
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
    if (multiplayer.gameStarted) {
      const idx = multiplayer.players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        multiplayer.players[idx].id = conn.peer;
        multiplayer.players[idx].connected = true;
        multiplayer.connections.set(conn.peer, conn);
        conn.send({ type: 'game-start', playerIndex: idx, private: privateRoleInfo(idx), snapshot: publicGameSnapshot() });
      }
      return;
    }
    if (!multiplayer.players.some(p => p.id === conn.peer)) multiplayer.players.push({ id: conn.peer, name, host: false, connected: true });
    broadcastLobby();
  } else if (data.type === 'vote' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx >= 0 && !state.executedPlayers.includes(idx) && state.votes[idx] === undefined) {
      state.votes[idx] = data.vote === 'nein' ? 'nein' : 'ja';
      saveGame();
      broadcastGameState();
    }
  } else if (data.type === 'nominate' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.president || state.governmentConfirmed) return;
    const chIdx = parseInt(data.chancellor);
    if (isNaN(chIdx) || chIdx === idx || state.executedPlayers.includes(chIdx)) return;
    state.chancellor = chIdx;
    state.governmentConfirmed = true;
    state.votes = {};
    state.currentVoterIdx = null;
    multiplayer.voteSubmitted = false;
    saveGame();
    broadcastGameState();
    render();
  } else if (data.type === 'advance-round' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.president) return;
    const alive = state.players.length - state.executedPlayers.length;
    const ja    = Object.values(state.votes).filter(v => v === 'ja').length;
    const nein  = Object.values(state.votes).filter(v => v === 'nein').length;
    if (alive <= 0 || ja + nein !== alive) return;
    if (data.decision === 'reject') resolveElectionReject();
    else resolveElectionConfirm();
    broadcastGameState();
    render();
  } else if (data.type === 'president-discard' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.president || !state.legislative || state.legislative.cards.length !== 3) return;
    const discIdx = parseInt(data.idx);
    if (isNaN(discIdx) || discIdx < 0 || discIdx > 2) return;
    const discarded = state.legislative.cards.splice(discIdx, 1)[0];
    state.discardPile.push(discarded);
    routeLegislativeToChancellor();
    saveGame();
    broadcastGameState();
    render();
  } else if (data.type === 'chancellor-enact' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.chancellor || !state.legislative || state.legislative.cards.length !== 2) return;
    const enIdx = parseInt(data.idx);
    if (isNaN(enIdx) || enIdx < 0 || enIdx > 1) return;
    state.revealedPolicy       = state.legislative.cards[enIdx];
    state.revealedPolicySource = 'legislative';
    state.discardPile.push(state.legislative.cards[1 - enIdx]);
    state.legislative = null;
    state.screen       = 'policy-reveal';
    saveGame();
    broadcastGameState();
    render();
  } else if (data.type === 'request-veto' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.chancellor || !state.vetoUnlocked || !state.legislative || state.legislative.cards.length !== 2) return;
    routeVetoToPresident();
    saveGame();
    render();
  } else if (data.type === 'veto-decision' && multiplayer.gameStarted) {
    const idx = multiplayer.players.findIndex(p => p.id === conn.peer);
    if (idx !== state.president || !state.legislative || state.legislative.cards.length !== 2) return;
    if (data.approved) {
      state.discardPile.push(...state.legislative.cards);
      state.legislative     = null;
      state.electionTracker = Math.min(3, state.electionTracker + 1);
      addHistory('<strong>Veto approvato</strong>: entrambe le politiche sono state scartate.', 'system');
      state.screen = 'game';
      state.tab    = 'vote';
      if (state.electionTracker >= 3) { state.electionTracker = 0; prepareChaosPolicy(); }
      nextTurn();
      saveGame();
      broadcastGameState();
      render();
    } else {
      routeLegislativeToChancellor();
      saveGame();
      render();
    }
  }
}

// ICE servers: STUN for most NATs, TURN as fallback for restrictive/mobile
// networks where a direct P2P channel can't be established.
const PEER_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',            username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',           username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

function createPeer(id) {
  const opts = { config: PEER_CONFIG };
  return id ? new Peer(id, opts) : new Peer(opts);
}

// Keep the broker socket alive: if it drops (phone sleep, network switch),
// reconnect so new guests can still join and rejoin works.
function keepPeerAlive(peer) {
  peer.on('disconnected', () => {
    try { if (!peer.destroyed) peer.reconnect(); } catch (_) {}
  });
}

function connectAsHost(name, attempt = 0) {
  if (typeof Peer === 'undefined') { multiplayer.error = 'Modulo rete non disponibile.'; render(); return; }
  multiplayer.playerName = name;
  multiplayer.isHost     = true;
  if (attempt === 0) multiplayer.roomCode = makeRoomCode();
  multiplayer.error = attempt > 0 ? 'Codice occupato, ne genero un altro…' : 'Creazione stanza…';

  const peer = createPeer(`sh-${multiplayer.roomCode.toLowerCase()}`);
  multiplayer.peer = peer;
  keepPeerAlive(peer);

  peer.on('open', id => {
    multiplayer.connected = true;
    multiplayer.error     = '';
    multiplayer.players   = [{ id, name, host: true, connected: true }];
    state.screen = 'online-lobby';
    render();
  });
  peer.on('connection', conn => {
    multiplayer.connections.set(conn.peer, conn);
    conn.on('data', data => handleHostData(conn, data));
    conn.on('close', () => {
      multiplayer.connections.delete(conn.peer);
      if (multiplayer.gameStarted) {
        const p = multiplayer.players.find(p => p.id === conn.peer);
        if (p) p.connected = false;
        render();
      } else {
        multiplayer.players = multiplayer.players.filter(p => p.id !== conn.peer);
        broadcastLobby();
      }
    });
  });
  peer.on('error', err => {
    const type = err && err.type;
    // Chosen room code already registered on the broker → pick a new one.
    if (type === 'unavailable-id' && attempt < 4) {
      try { peer.destroy(); } catch (_) {}
      multiplayer.roomCode = makeRoomCode();
      connectAsHost(name, attempt + 1);
      return;
    }
    // Transient broker/network issues once we're already live → just reconnect.
    if (multiplayer.connected && ['network', 'server-error', 'socket-error', 'disconnected'].includes(type)) {
      try { if (!peer.destroyed) peer.reconnect(); } catch (_) {}
      return;
    }
    multiplayer.error = 'Impossibile creare la stanza. Controlla la connessione e riprova.';
    state.screen = 'online-menu';
    render();
  });
}

function handleGuestData(data, name, code) {
  if (data.type === 'lobby')      { multiplayer.players = data.players || []; state.screen = 'online-lobby'; render(); }
  if (data.type === 'game-start') {
    multiplayer.gameStarted = true; multiplayer.playerIndex = data.playerIndex;
    multiplayer.privateRole = data.private.role; multiplayer.knownPlayers = data.private.known || [];
    applyPublicGameSnapshot(data.snapshot); state.screen = 'online-role'; render();
  }
  if (data.type === 'state') { applyPublicGameSnapshot(data.snapshot); render(); }
  if (data.type === 'legislative-president') {
    multiplayer.legislativeCards = data.cards; multiplayer.legislativeRole = 'president';
    state.screen = 'legislative-president'; render();
  }
  if (data.type === 'legislative-chancellor') {
    multiplayer.legislativeCards = data.cards; multiplayer.legislativeRole = 'chancellor';
    state.screen = 'legislative-chancellor'; render();
  }
  if (data.type === 'legislative-veto-president') {
    multiplayer.legislativeCards = null; multiplayer.legislativeRole = null;
    state.screen = 'legislative-veto-president'; render();
  }
}

function connectAsGuest(name, code, attempt = 0) {
  if (typeof Peer === 'undefined') { multiplayer.error = 'Modulo rete non disponibile.'; render(); return; }
  const MAX_ATTEMPTS = 4;
  multiplayer.roomCode   = code;
  multiplayer.playerName = name;
  multiplayer.isHost     = false;
  multiplayer.error      = attempt > 0 ? `Riprovo la connessione… (${attempt + 1})` : 'Connessione alla stanza…';
  render();

  const peer = createPeer();
  multiplayer.peer = peer;
  keepPeerAlive(peer);

  let done = false; // this attempt has settled (opened, retried, or failed)

  const retry = () => {
    if (done) return; done = true;
    try { peer.destroy(); } catch (_) {}
    if (attempt < MAX_ATTEMPTS) setTimeout(() => connectAsGuest(name, code, attempt + 1), 700);
    else { multiplayer.error = 'Impossibile connettersi. Controlla il codice stanza e la rete, poi riprova.'; state.screen = 'online-menu'; render(); }
  };

  peer.on('open', () => {
    const conn = peer.connect(`sh-${code.toLowerCase()}`, { reliable: true });
    multiplayer.hostConnection = conn;

    // If the data channel doesn't open in time (NAT/firewall), retry.
    const timer = setTimeout(() => { if (!done) { try { conn.close(); } catch (_) {} retry(); } }, 14000);

    conn.on('open', () => {
      if (done) return; done = true;
      clearTimeout(timer);
      multiplayer.connected = true;
      multiplayer.error     = '';
      conn.send({ type: 'join', name });
      try { sessionStorage.setItem('sh_rejoin', JSON.stringify({ name, code })); } catch (_) {}
      state.screen = 'online-lobby';
      render();
    });
    conn.on('data', data => handleGuestData(data, name, code));
    conn.on('error', () => { clearTimeout(timer); retry(); });
    conn.on('close', () => {
      clearTimeout(timer);
      if (!multiplayer.connected) return; // never fully connected → handled by retry/timeout
      multiplayer.connected = false;
      multiplayer.error = multiplayer.gameStarted
        ? 'Connessione con l\'host interrotta. Puoi rientrare nella stanza.'
        : 'Connessione con l\'host terminata.';
      state.screen = 'online-menu';
      render();
    });
  });

  peer.on('error', err => {
    const type = err && err.type;
    // Host id not found yet (host still registering, or brief broker lag) → retry.
    if (['peer-unavailable', 'network', 'server-error', 'socket-error'].includes(type) && !multiplayer.connected) {
      retry();
      return;
    }
    if (!multiplayer.connected && !done) {
      done = true;
      multiplayer.error = 'Stanza non trovata o connessione non disponibile.';
      state.screen = 'online-menu';
      render();
    }
  });
}

function rejoinOnlineRoom() {
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem('sh_rejoin') || 'null'); } catch (_) {}
  if (!session || !session.name || !session.code) return;
  try { multiplayer.peer?.destroy(); } catch (_) {}
  multiplayer.peer = null; multiplayer.hostConnection = null; multiplayer.connections.clear();
  multiplayer.error = '';
  connectAsGuest(session.name, session.code);
}

function leaveOnlineRoom() {
  try { multiplayer.peer?.destroy(); } catch (_) {}
  try { sessionStorage.removeItem('sh_rejoin'); } catch (_) {}
  multiplayer.peer = null; multiplayer.hostConnection = null; multiplayer.connections.clear();
  multiplayer.players = []; multiplayer.connected = false; multiplayer.gameStarted = false;
  multiplayer.isHost = false; multiplayer.roomCode = ''; multiplayer.privateRole = null;
  state.screen = 'home';
  render();
}
