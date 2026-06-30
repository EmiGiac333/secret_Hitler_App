// ============================================================
// game.js — Core game logic
// ============================================================

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function assignRoles() {
  const n   = state.players.length;
  const cfg = PLAYER_CONFIG[n];
  const xl  = state.xl;
  let fascists = cfg.fascists;
  const pool = ['hitler'];

  let communists = xl.communists ? (COMMUNIST_COUNT[n] || 0) : 0;
  let anarchistsToAdd = 0;
  if (xl.anarchist) {
    if (xl.communists && communists >= 1) { communists--; anarchistsToAdd = 1; }
    else anarchistsToAdd = 1;
  }
  for (let i = 0; i < communists; i++) pool.push('communist');
  for (let i = 0; i < anarchistsToAdd; i++) pool.push('anarchist');

  let monarchistToAdd = 0;
  if (xl.monarchist && fascists >= 1) { fascists--; monarchistToAdd = 1; }
  for (let i = 0; i < fascists; i++) pool.push('fascist');
  for (let i = 0; i < monarchistToAdd; i++) pool.push('monarchist');

  let liberals = n - pool.length;
  if (xl.capitalist && xl.communists && liberals >= 1) { liberals--; pool.push('capitalist'); }
  if (xl.anarchist && !xl.communists) liberals = Math.max(0, liberals - 1);
  for (let i = 0; i < liberals; i++) pool.push('liberal');

  while (pool.length < n) pool.push('liberal');
  while (pool.length > n) pool.pop();

  shuffleArray(pool);
  state.roles = {};
  pool.forEach((role, i) => { state.roles[i] = { role }; });
}

// ===== POLICY DECK =====

function replacePolicy(deck, from, to) {
  const idx = deck.indexOf(from);
  if (idx >= 0) deck[idx] = to;
}

function buildPolicyDeck() {
  const n  = state.players.length;
  const xl = state.xl;
  let counts;
  if (!xl.communists) counts = { fascist: 11, liberal: 6, communist: 0 };
  else if (n === 5) counts = { fascist: 7, liberal: 6, communist: 6 };
  else if (xl.communistShort) counts = { fascist: 10, liberal: 4, communist: 6 };
  else if (n === 8) counts = { fascist: 9, liberal: 6, communist: 8 };
  else counts = { fascist: 10, liberal: 5, communist: 8 };

  const deck = [];
  Object.entries(counts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) deck.push(type);
  });
  if (xl.anarchist && xl.communists) {
    replacePolicy(deck, 'communist', 'anarchist');
    replacePolicy(deck, 'communist', 'anarchist');
  } else if (xl.anarchist) {
    deck.push('anarchist', 'anarchist', 'anarchist');
  }
  if (xl.antiPolicies && xl.communists) {
    replacePolicy(deck, 'communist', 'anti-fascist');
    replacePolicy(deck, 'fascist', 'anti-communist');
    replacePolicy(deck, 'liberal', 'social-dem');
  }
  return shuffleArray(deck);
}

function initializePolicyDeck() {
  state.policyDeck = buildPolicyDeck();
  state.discardPile = [];
  state.legislative = null;
  state.revealedPolicy = null;
  state.revealedPolicySource = null;
}

function ensurePolicyCards(count) {
  if (state.policyDeck.length >= count) return true;
  if (state.discardPile.length) {
    state.policyDeck.push(...state.discardPile);
    state.discardPile = [];
    shuffleArray(state.policyDeck);
    addHistory('<strong>Mazzo politiche rimescolato</strong> con le carte scartate rimaste.', 'system');
  }
  return state.policyDeck.length >= count;
}

function drawPolicyCards(count) {
  if (!ensurePolicyCards(count)) return [];
  const cards = [];
  for (let i = 0; i < count; i++) cards.push(state.policyDeck.pop());
  return cards;
}

function beginLegislativeSession() {
  const cards = drawPolicyCards(3);
  if (cards.length !== 3) { alert('Non ci sono abbastanza politiche nel mazzo o negli scarti.'); return false; }
  state.legislative = { cards };
  state.revealedPolicy = null;
  state.revealedPolicySource = null;
  state.screen = 'legislative-pass-president';
  saveGame();
  return true;
}

function prepareChaosPolicy() {
  const cards = drawPolicyCards(1);
  if (!cards.length) return false;
  state.legislative = null;
  state.revealedPolicy = cards[0];
  state.revealedPolicySource = 'chaos';
  state.screen = 'policy-reveal';
  return true;
}

// ===== TURN MANAGEMENT =====

function nextTurn() {
  state.turn++;
  state.president = null;
  state.chancellor = null;
  state.votes = {};
  state.governmentConfirmed = false;
}

function governmentSummary() {
  if (state.president !== null && state.chancellor !== null) {
    return `<br>Pres. ${escapeHtml(state.players[state.president])} · Canc. ${escapeHtml(state.players[state.chancellor])}`;
  }
  return '';
}

function addHistory(body, type) {
  const now  = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  state.history.push({ turn: state.turn + 1, time, body, type });
}

function endGame(winner, reason) {
  state.endResult = winner;
  state.endReason = reason;
  const winnerLabels = { liberal: 'Liberali', fascist: 'Fascisti', communist: 'Comunisti', capitalist: 'Capitalista', anarchist: 'Anarchico', monarchist: 'Monarchico' };
  addHistory(`<strong>FINE PARTITA</strong> — ${reason}. ${winnerLabels[winner] || winner} vince.`, 'system');
  state.screen = 'end';
  saveGame();
}

function resetGame() {
  state.players = [];
  state.roles = {};
  state.liberalPolicies = 0;
  state.fascistPolicies = 0;
  state.communistPolicies = 0;
  state.anarchistOnCommunistTracker = 0;
  state.liberalSlotsTotal = 5;
  state.electionTracker = 0;
  state.president = null;
  state.chancellor = null;
  state.prevPresident = null;
  state.prevChancellor = null;
  state.votes = {};
  state.pendingFascistPower = null;
  state.pendingCommunistPower = null;
  state.pendingCommunistPresident = null;
  state.communistDeckAdditions = { communist: 0, liberal: 0 };
  state.policyDeck = [];
  state.discardPile = [];
  state.legislative = null;
  state.revealedPolicy = null;
  state.revealedPolicySource = null;
  state.useDigitalPolicyDeck = true;
  state.roleRefreshInProgress = false;
  state.reveal = { idx: 0, shown: false };
  state.turn = 0;
  state.history = [];
  state.endResult = null;
  state.endReason = null;
  state.markedForExecution = null;
  state.executedPlayers = [];
  state.vetoUnlocked = false;
  state.emergencyArticle48 = 0;
  state.emergencyEnabling = 0;
  state.governmentConfirmed = false;
  state.xl = {
    communists: false, capitalist: false, anarchist: false, monarchist: false,
    antiPolicies: false, socialDem: false, emergencyPowers: false,
    liberalTrackerLong: false, communistShort: false,
  };
  stopTimer();
  state.timer = { running: false, seconds: 60, remaining: 60 };
  try { localStorage.removeItem('sh_save'); } catch (e) {}
}

// ===== POLICY APPLICATION =====

function applyPolicy(type, options = {}) {
  if (type === 'liberal') {
    state.liberalPolicies = Math.min(state.liberalSlotsTotal, state.liberalPolicies + 1);
    addHistory(`<strong>Politica Liberale</strong> approvata (${state.liberalPolicies}/${state.liberalSlotsTotal})${governmentSummary()}`, 'liberal');
    state.electionTracker = 0;
    if (state.liberalPolicies >= state.liberalSlotsTotal) endGame('liberal', `${state.liberalSlotsTotal} politiche liberali approvate`);
    nextTurn();
  } else if (type === 'fascist') {
    state.fascistPolicies = Math.min(6, state.fascistPolicies + 1);
    const config = PLAYER_CONFIG[state.players.length];
    const power  = options.suppressPower ? null : config.powers[state.fascistPolicies - 1];
    if (power) state.pendingFascistPower = power;
    let powerNote = '';
    if (power) powerNote = `<br><strong>Potere attivato:</strong> ${POWER_LABELS[power]} — ${POWER_DESCRIPTIONS[power]}`;
    if (state.fascistPolicies === 3) powerNote += '<br>⚠ <strong>Hitler può ora vincere come Cancelliere</strong>';
    addHistory(`<strong>Politica Fascista</strong> approvata (${state.fascistPolicies}/6)${governmentSummary()}${powerNote}`, 'fascist');
    state.electionTracker = 0;
    if (state.fascistPolicies >= 6) endGame('fascist', '6 politiche fasciste approvate');
    nextTurn();
  } else if (type === 'communist') {
    const n     = state.players.length;
    const track = getCommunistTrack(n, state.xl.communistShort);
    state.communistPolicies = Math.min(track.slots, state.communistPolicies + 1);
    const cPower = options.suppressPower ? null : track.powers[state.communistPolicies - 1];
    if (cPower) { state.pendingCommunistPower = cPower; state.pendingCommunistPresident = state.president; }
    let powerNote = '';
    if (cPower) powerNote = `<br><strong>Potere comunista attivato:</strong> ${POWER_LABELS[cPower]} — ${POWER_DESCRIPTIONS[cPower]}`;
    addHistory(`<strong>Politica Comunista</strong> approvata (${state.communistPolicies}/${track.slots})${governmentSummary()}${powerNote}`, 'communist');
    state.electionTracker = 0;
    if (state.communistPolicies >= track.slots) endGame('communist', `${track.slots} politiche comuniste approvate`);
    nextTurn();
  } else if (type === 'anti-fascist') {
    const n     = state.players.length;
    const track = getCommunistTrack(n, state.xl.communistShort);
    state.communistPolicies = Math.min(track.slots, state.communistPolicies + 1);
    state.fascistPolicies = Math.max(0, state.fascistPolicies - 1);
    addHistory(`<strong>Politica Anti-Fascista</strong>: +1 sul tracker Comunista, -1 sul Fascista. Nessun potere fascista riusato.${governmentSummary()}`, 'communist');
    state.electionTracker = 0;
    if (state.communistPolicies >= track.slots) endGame('communist', 'Tracker comunista completato (via Anti-Fascista)');
    nextTurn();
  } else if (type === 'anti-communist') {
    state.fascistPolicies = Math.min(6, state.fascistPolicies + 1);
    state.communistPolicies = Math.max(0, state.communistPolicies - 1);
    addHistory(`<strong>Politica Anti-Comunista</strong>: +1 sul tracker Fascista, -1 sul Comunista. Nessun potere comunista riusato.${governmentSummary()}`, 'fascist');
    state.electionTracker = 0;
    if (state.fascistPolicies >= 6) endGame('fascist', 'Tracker fascista completato (via Anti-Comunista)');
    nextTurn();
  } else if (type === 'social-dem') {
    state.liberalPolicies = Math.min(state.liberalSlotsTotal, state.liberalPolicies + 1);
    showSocialDemModal();
    addHistory(`<strong>Politica Social-Democratica</strong>: +1 Liberale. Il Presidente rimuove 1 Fascista o Comunista.${governmentSummary()}`, 'liberal');
    state.electionTracker = 0;
    if (state.liberalPolicies >= state.liberalSlotsTotal) endGame('liberal', 'Tracker liberale completato (via Social-Dem)');
    nextTurn();
  } else if (type === 'anarchist') {
    if (state.xl.communists) {
      const track = getCommunistTrack(state.players.length, state.xl.communistShort);
      state.communistPolicies = Math.min(track.slots, state.communistPolicies + 1);
      state.anarchistOnCommunistTracker++;
      addHistory(`<strong>Politica Anarchica</strong> sul tracker Comunista (${state.communistPolicies}/${track.slots}). Nessun potere comunista attivato.`, 'communist');
      if (state.communistPolicies >= track.slots) {
        endGame(state.anarchistOnCommunistTracker >= 2 ? 'anarchist' : 'communist', 'Tracker comunista completato');
      }
      nextTurn();
    } else {
      addHistory(`<strong>Politica Anarchica</strong> promulgata via Election Tracker. L'Anarchico vince!`, 'system');
      endGame('anarchist', 'Politica anarchica via election tracker');
    }
  }
}

// ===== EXECUTION =====

function executePlayer(idx) {
  if (state.executedPlayers.includes(idx)) return;
  state.executedPlayers.push(idx);
  const role = state.roles[idx].role;
  const name = state.players[idx];
  addHistory(`<strong>Esecuzione</strong>: ⚰ ${escapeHtml(name)}`, 'system');
  if (role === 'hitler') {
    const winner = state.xl.communists ? 'communist' : 'liberal';
    endGame(winner, 'Hitler assassinato' + (state.xl.communists ? ' (Liberali + Comunisti vincono)' : ''));
    return;
  }
  if (role === 'capitalist') {
    state.policyDeck.push('communist');
    shuffleArray(state.policyDeck);
    addHistory('Il Capitalista è morto: aggiungete una politica comunista al mazzo e rimescolate.', 'system');
  }
  if (state.markedForExecution === idx) state.markedForExecution = null;
  saveGame();
}

// ===== EMERGENCY POWERS =====

function computeEmergencyPool() {
  if (!state.xl.emergencyPowers) { state.emergencyArticle48 = 0; state.emergencyEnabling = 0; return; }
  const n = state.players.length;
  let extra = state.xl.communists ? Math.max(0, (n - 13) * 2) : Math.max(0, n - 10);
  extra = Math.min(6, extra);
  state.emergencyArticle48 = Math.min(3, Math.ceil(extra / 2));
  state.emergencyEnabling  = Math.min(3, Math.floor(extra / 2));
}

// ===== TIMER =====

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timerInterval = setInterval(() => {
    state.timer.remaining--;
    if (state.timer.remaining <= 0) {
      state.timer.remaining = 0;
      stopTimer();
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
    }
    if (state.tab === 'timer') render();
  }, 1000);
}

function stopTimer() {
  state.timer.running = false;
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = null;
}
