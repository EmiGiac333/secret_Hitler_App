// ============================================================
// state.js — Application state and persistence
// ============================================================

const state = {
  screen: 'home',
  tab: 'board',
  players: [],
  roles: {},
  liberalPolicies: 0,
  fascistPolicies: 0,
  communistPolicies: 0,
  anarchistOnCommunistTracker: 0,
  liberalSlotsTotal: 5,
  electionTracker: 0,
  president: null,
  chancellor: null,
  prevPresident: null,
  prevChancellor: null,
  votes: {},
  pendingFascistPower: null,
  pendingCommunistPower: null,
  pendingCommunistPresident: null,
  communistDeckAdditions: { communist: 0, liberal: 0 },
  policyDeck: [],
  discardPile: [],
  legislative: null,
  revealedPolicy: null,
  revealedPolicySource: null,
  useDigitalPolicyDeck: true,
  turn: 0,
  history: [],
  reveal: { idx: 0, shown: false },
  roleRefreshInProgress: false,
  timer: { running: false, seconds: 60, remaining: 60 },
  timerInterval: null,
  xl: {
    communists: false,
    capitalist: false,
    anarchist: false,
    monarchist: false,
    antiPolicies: false,
    socialDem: false,
    emergencyPowers: false,
    liberalTrackerLong: false,
    communistShort: false,
  },
  emergencyArticle48: 0,
  emergencyEnabling: 0,
  markedForExecution: null,
  executedPlayers: [],
  vetoUnlocked: false,
  governmentConfirmed: false,
  endResult: null,
  endReason: null,
};

const multiplayer = {
  peer: null,
  hostConnection: null,
  connections: new Map(),
  players: [],
  isHost: false,
  connected: false,
  gameStarted: false,
  roomCode: '',
  playerName: '',
  playerIndex: null,
  privateRole: null,
  knownPlayers: [],
  voteSubmitted: false,
  voteResult: null,
  error: '',
};

// ===== PERSISTENCE =====

function hasSavedGame() {
  try { return !!localStorage.getItem('sh_save'); } catch (e) { return false; }
}

function saveGame() {
  try {
    const data = {
      screen: state.screen, tab: state.tab, players: state.players, roles: state.roles,
      liberalPolicies: state.liberalPolicies, fascistPolicies: state.fascistPolicies,
      communistPolicies: state.communistPolicies, liberalSlotsTotal: state.liberalSlotsTotal,
      electionTracker: state.electionTracker, president: state.president, chancellor: state.chancellor,
      prevPresident: state.prevPresident, prevChancellor: state.prevChancellor, votes: state.votes,
      pendingFascistPower: state.pendingFascistPower, pendingCommunistPower: state.pendingCommunistPower,
      pendingCommunistPresident: state.pendingCommunistPresident,
      communistDeckAdditions: state.communistDeckAdditions,
      policyDeck: state.policyDeck, discardPile: state.discardPile, legislative: state.legislative,
      revealedPolicy: state.revealedPolicy, revealedPolicySource: state.revealedPolicySource,
      useDigitalPolicyDeck: state.useDigitalPolicyDeck, reveal: state.reveal,
      roleRefreshInProgress: state.roleRefreshInProgress, turn: state.turn, history: state.history,
      endResult: state.endResult, endReason: state.endReason, xl: state.xl,
      emergencyArticle48: state.emergencyArticle48, emergencyEnabling: state.emergencyEnabling,
      markedForExecution: state.markedForExecution, executedPlayers: state.executedPlayers,
      vetoUnlocked: state.vetoUnlocked, governmentConfirmed: state.governmentConfirmed,
      anarchistOnCommunistTracker: state.anarchistOnCommunistTracker,
    };
    localStorage.setItem('sh_save', JSON.stringify(data));
    broadcastGameState();
  } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('sh_save');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, data);
    if (!state.xl) state.xl = { communists: false, capitalist: false, anarchist: false, monarchist: false, antiPolicies: false, socialDem: false, emergencyPowers: false, liberalTrackerLong: false, communistShort: false };
    if (!state.executedPlayers) state.executedPlayers = [];
    if (state.markedForExecution === undefined) state.markedForExecution = null;
    if (state.communistPolicies === undefined) state.communistPolicies = 0;
    if (state.anarchistOnCommunistTracker === undefined) state.anarchistOnCommunistTracker = 0;
    if (state.liberalSlotsTotal === undefined) state.liberalSlotsTotal = 5;
    if (state.emergencyArticle48 === undefined) state.emergencyArticle48 = 0;
    if (state.emergencyEnabling === undefined) state.emergencyEnabling = 0;
    if (state.pendingCommunistPower === undefined) state.pendingCommunistPower = null;
    if (state.pendingFascistPower === undefined) state.pendingFascistPower = null;
    if (state.pendingCommunistPresident === undefined) state.pendingCommunistPresident = null;
    if (!state.communistDeckAdditions) state.communistDeckAdditions = { communist: 0, liberal: 0 };
    if (!Array.isArray(state.policyDeck)) state.policyDeck = [];
    if (!Array.isArray(state.discardPile)) state.discardPile = [];
    if (state.legislative === undefined) state.legislative = null;
    if (state.revealedPolicy === undefined) state.revealedPolicy = null;
    if (state.revealedPolicySource === undefined) state.revealedPolicySource = null;
    if (state.useDigitalPolicyDeck === undefined) state.useDigitalPolicyDeck = true;
    if (!state.reveal) state.reveal = { idx: 0, shown: false };
    if (state.roleRefreshInProgress === undefined) state.roleRefreshInProgress = false;
    if (state.governmentConfirmed === undefined) state.governmentConfirmed = false;
    if (state.endResult === undefined) state.endResult = null;
    if (state.endReason === undefined) state.endReason = null;
  } catch (e) {}
}

// ===== MULTIPLAYER SYNC =====

function publicGameSnapshot() {
  const aliveCount = state.players.length - state.executedPlayers.length;
  const ja   = Object.values(state.votes).filter(v => v === 'ja').length;
  const nein = Object.values(state.votes).filter(v => v === 'nein').length;
  const allVoted = aliveCount > 0 && ja + nein === aliveCount;
  return {
    players: state.players, liberalPolicies: state.liberalPolicies, fascistPolicies: state.fascistPolicies,
    communistPolicies: state.communistPolicies, anarchistOnCommunistTracker: state.anarchistOnCommunistTracker,
    liberalSlotsTotal: state.liberalSlotsTotal, electionTracker: state.electionTracker, turn: state.turn,
    history: state.history, xl: state.xl, pendingFascistPower: state.pendingFascistPower,
    pendingCommunistPower: state.pendingCommunistPower, executedPlayers: state.executedPlayers,
    markedForExecution: state.markedForExecution, vetoUnlocked: state.vetoUnlocked,
    policyDeckCount: state.policyDeck.length, discardCount: state.discardPile.length,
    endResult: state.endResult, endReason: state.endReason,
    president: state.president, chancellor: state.chancellor,
    governmentConfirmed: state.governmentConfirmed,
    voteResult: allVoted ? { ja, nein, passed: ja > nein } : null,
  };
}

function applyPublicGameSnapshot(snapshot) {
  const previousResult = multiplayer.voteResult;
  const fields = [
    'players', 'liberalPolicies', 'fascistPolicies', 'communistPolicies', 'anarchistOnCommunistTracker',
    'liberalSlotsTotal', 'electionTracker', 'turn', 'history', 'xl', 'pendingFascistPower',
    'pendingCommunistPower', 'executedPlayers', 'markedForExecution', 'vetoUnlocked',
    'endResult', 'endReason', 'president', 'chancellor', 'governmentConfirmed'
  ];
  fields.forEach(key => { if (snapshot[key] !== undefined) state[key] = snapshot[key]; });
  state.policyDeck  = Array(snapshot.policyDeckCount || 0).fill('hidden');
  state.discardPile = Array(snapshot.discardCount    || 0).fill('hidden');
  multiplayer.voteResult = snapshot.voteResult || null;
  if (previousResult && !multiplayer.voteResult) multiplayer.voteSubmitted = false;
  if (state.endResult) state.screen = 'end';
  else if (state.screen !== 'online-role') { state.screen = 'game'; state.tab = state.tab || 'board'; }
}
