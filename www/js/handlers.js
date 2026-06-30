// ============================================================
// handlers.js — User action handlers
// ============================================================

function addPlayer() {
  const input = $('#player-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (state.players.length >= 20) { alert('Massimo 20 giocatori.'); return; }
  if (state.players.some(p => p.toLowerCase() === name.toLowerCase())) { alert('Nome già usato.'); return; }
  state.players.push(name);
  input.value = '';
  render();
}

function castNextSecretVote(vote) {
  if (multiplayer.connected && multiplayer.gameStarted) {
    if (multiplayer.voteSubmitted) return false;
    const normalized = vote === 'nein' ? 'nein' : 'ja';
    if (multiplayer.isHost) {
      const idx = multiplayer.playerIndex ?? 0;
      if (state.executedPlayers.includes(idx) || state.votes[idx] !== undefined) return false;
      state.votes[idx] = normalized;
      saveGame();
      broadcastGameState();
    } else if (multiplayer.hostConnection?.open) {
      multiplayer.hostConnection.send({ type: 'vote', vote: normalized });
    } else return false;
    multiplayer.voteSubmitted = true;
    return true;
  }
  const idx = state.players.findIndex((_, i) => !state.executedPlayers.includes(i) && state.votes[i] === undefined);
  if (idx < 0) return false;
  state.votes[idx] = vote;
  saveGame();
  return true;
}

function handleEmergencyPower(type, power) {
  const role = type === 'article48' ? 'Presidente' : 'Cancelliere';
  const labels = {
    'propaganda':    'Propaganda (guarda 1 carta, scarta o ripone)',
    'policy-peek':   'Policy Peek (guarda le 3 carte in cima)',
    'impeachment':   "Impeachment (l'altro mostra Affiliazione al giocatore scelto)",
    'marked':        'Marked for Execution (target ucciso dopo 3 politiche fasciste)',
    'execution':     'Execution (uccidi un giocatore)',
    'pardon':        'Presidential Pardon (rimuovi marker dal Marked)',
    'no-confidence': 'Vote of No Confidence (la scartata diventa legge)',
  };
  if (power === 'execution') {
    showExecutionModal(true, role);
  } else if (power === 'marked') {
    showMarkedForExecutionModal(role);
  } else if (power === 'pardon') {
    if (state.markedForExecution === null) { alert('Nessuno è marcato per esecuzione.'); return; }
    if (confirm(`Rimuovere il marcatura da ${state.players[state.markedForExecution]}?`)) {
      addHistory(`<strong>Presidential Pardon</strong>: ${escapeHtml(state.players[state.markedForExecution])} non è più marcato.`, 'system');
      state.markedForExecution = null;
    } else return;
  } else if (power === 'no-confidence') {
    addHistory(`<strong>Enabling Act · Vote of No Confidence</strong>: la carta scartata dal Presidente è stata promulgata. Aggiungila al tracker manualmente.`, 'system');
  } else {
    addHistory(`<strong>${type === 'article48' ? 'Article 48' : 'Enabling Act'} · ${labels[power]}</strong> attivata dal ${role}.`, 'system');
  }
  if (type === 'article48') state.emergencyArticle48--;
  else state.emergencyEnabling--;
  saveGame();
  render();
}

function handleAction(e) {
  const el     = e.currentTarget;
  const action = el.dataset.action;

  if (multiplayer.connected && multiplayer.gameStarted && !multiplayer.isHost &&
      !['tab', 'cast-secret-vote', 'online-role-ready', 'leave-online-room', 'home'].includes(action)) return;

  switch (action) {
    case 'online-menu':
      multiplayer.error = '';
      state.screen = 'online-menu';
      render();
      break;

    case 'create-online-room': {
      const name = ($('#online-name')?.value || '').trim();
      if (!name) { multiplayer.error = 'Inserisci il tuo nome.'; render(); return; }
      connectAsHost(name);
      break;
    }

    case 'join-online-room': {
      const name = ($('#online-name')?.value || '').trim();
      const code = ($('#online-room-code')?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!name || code.length !== 6) { multiplayer.error = 'Inserisci nome e codice stanza di 6 caratteri.'; render(); return; }
      connectAsGuest(name, code);
      break;
    }

    case 'online-configure':
      if (!multiplayer.isHost) return;
      if (multiplayer.players.length < 5) { multiplayer.error = 'Servono almeno 5 giocatori connessi.'; render(); return; }
      state.players = multiplayer.players.map(p => p.name);
      state.screen  = 'setup';
      render();
      break;

    case 'leave-online-room':
      leaveOnlineRoom();
      break;

    case 'online-role-ready':
      state.screen = 'game';
      state.tab    = 'board';
      render();
      break;

    case 'home':
      state.screen = 'home';
      saveGame();
      render();
      break;

    case 'new-game':
      if (state.players.length > 0 && state.screen !== 'home') {
        if (!confirm('Iniziare una nuova partita? La partita corrente verrà persa.')) return;
      }
      resetGame();
      state.screen = 'setup';
      render();
      break;

    case 'resume-game':
      loadGame();
      render();
      break;

    case 'rules':
      showRulesModal();
      break;

    case 'xl-toggle': {
      const key = el.dataset.key;
      if (key === 'communists'    && state.players.length < 5)   return;
      if (key === 'communistShort' && state.players.length <= 5)  return;
      if ((key === 'capitalist' || key === 'communistShort') && !state.xl.communists) return;
      state.xl[key] = !state.xl[key];
      if (key === 'communists' && !state.xl.communists) { state.xl.capitalist = false; state.xl.communistShort = false; }
      render();
      break;
    }

    case 'deck-mode-toggle':
      state.useDigitalPolicyDeck = !state.useDigitalPolicyDeck;
      render();
      break;

    case 'add-player':
      addPlayer();
      break;

    case 'remove-player':
      state.players.splice(parseInt(el.dataset.idx), 1);
      render();
      break;

    case 'start-roles':
      if (state.players.length === 5) state.xl.communistShort = false;
      if (state.xl.communistShort) state.liberalSlotsTotal = 3;
      else if (state.xl.liberalTrackerLong) state.liberalSlotsTotal = 6;
      else state.liberalSlotsTotal = 5;
      computeEmergencyPool();
      assignRoles();
      initializePolicyDeck();
      if (multiplayer.isHost && multiplayer.connected) { sendOnlineGameStart(); saveGame(); render(); break; }
      state.roleRefreshInProgress = false;
      state.screen = 'pass-reveal';
      state.reveal = { idx: 0, shown: false };
      render();
      break;

    case 'show-role':
      state.screen = 'role-reveal';
      render();
      break;

    case 'hide-role':
      state.reveal.idx++;
      if (state.reveal.idx >= state.players.length) {
        state.screen = 'game';
        if (state.roleRefreshInProgress) {
          state.roleRefreshInProgress = false;
          addHistory('Aggiornamento segreto dei ruoli completato dopo la Radicalizzazione.', 'system');
        } else {
          state.turn = 0;
          addHistory('Distribuzione ruoli completata. Inizia il gioco.', 'system');
        }
        saveGame();
      } else {
        state.screen = 'pass-reveal';
      }
      render();
      break;

    case 'tab':
      state.tab = el.dataset.tab;
      render();
      break;

    case 'add-policy':
      applyPolicy(el.dataset.type);
      saveGame();
      render();
      break;

    case 'undo-policy': {
      if (!confirm("Annullare l'ultima politica?")) return;
      for (let i = state.history.length - 1; i >= 0; i--) {
        const h = state.history[i];
        if (h.type === 'liberal')   { state.liberalPolicies   = Math.max(0, state.liberalPolicies   - 1); state.history.splice(i, 1); break; }
        if (h.type === 'fascist')   { state.fascistPolicies   = Math.max(0, state.fascistPolicies   - 1); state.pendingFascistPower   = null; state.history.splice(i, 1); break; }
        if (h.type === 'communist') { state.communistPolicies = Math.max(0, state.communistPolicies - 1); state.pendingCommunistPower = null; state.pendingCommunistPresident = null; state.history.splice(i, 1); break; }
      }
      saveGame();
      render();
      break;
    }

    case 'tracker': {
      const dir = parseInt(el.dataset.dir);
      state.electionTracker = Math.max(0, Math.min(3, state.electionTracker + dir));
      if (state.electionTracker >= 3) {
        addHistory('<strong>Election Tracker a 3</strong> — politica in cima al mazzo applicata.', 'system');
        state.electionTracker = 0;
        state.prevPresident   = null;
        state.prevChancellor  = null;
        prepareChaosPolicy();
      }
      saveGame();
      render();
      break;
    }

    case 'confirm-government':
      if (state.president === null || state.chancellor === null) return;
      if (state.president === state.chancellor) { alert('Presidente e Cancelliere devono essere giocatori diversi.'); return; }
      state.governmentConfirmed = true;
      state.votes = {};
      saveGame();
      broadcastGameState();
      render();
      break;

    case 'set-role': {
      const role = el.dataset.role;
      const val  = el.value === '' ? null : parseInt(el.value);
      if (role === 'president')   state.president   = val;
      if (role === 'chancellor')  state.chancellor  = val;
      state.governmentConfirmed = false;
      state.votes = {};
      saveGame();
      render();
      break;
    }

    case 'clear-votes':
      state.votes = {};
      saveGame();
      render();
      break;

    case 'cast-secret-vote':
      if (castNextSecretVote(el.dataset.v)) render();
      break;

    case 'confirm-election': {
      const ja   = Object.values(state.votes).filter(v => v === 'ja').length;
      const nein = Object.values(state.votes).filter(v => v === 'nein').length;
      addHistory(`<strong>Governo eletto</strong> (${ja} Ja / ${nein} Nein)`, 'system');
      state.votes = {};
      multiplayer.voteSubmitted = false;
      multiplayer.voteResult    = null;
      if (state.useDigitalPolicyDeck) beginLegislativeSession();
      else state.screen = 'post-election-choice';
      saveGame();
      render();
      break;
    }

    case 'reject-election': {
      const ja   = Object.values(state.votes).filter(v => v === 'ja').length;
      const nein = Object.values(state.votes).filter(v => v === 'nein').length;
      addHistory(`<strong>Governo respinto</strong> (${ja} Ja / ${nein} Nein)`, 'system');
      state.electionTracker = Math.min(3, state.electionTracker + 1);
      if (state.electionTracker >= 3) {
        addHistory('<strong>Election Tracker a 3</strong> — politica in cima al mazzo applicata.', 'system');
        state.electionTracker = 0;
        state.prevPresident   = null;
        state.prevChancellor  = null;
        prepareChaosPolicy();
      }
      state.votes = {};
      multiplayer.voteSubmitted = false;
      multiplayer.voteResult    = null;
      nextTurn();
      saveGame();
      render();
      break;
    }

    case 'legislative-ready':
      state.screen = el.dataset.role === 'president' ? 'legislative-president' : 'legislative-chancellor';
      saveGame();
      render();
      break;

    case 'physical-use-digital-draw':
      beginLegislativeSession();
      render();
      break;

    case 'continue-physical-game':
      state.screen = 'game';
      state.tab    = 'board';
      addHistory('Sessione legislativa gestita con il mazzo fisico.', 'system');
      nextTurn();
      saveGame();
      render();
      break;

    case 'president-discard': {
      if (!state.legislative || state.legislative.cards.length !== 3) return;
      const idx = parseInt(el.dataset.idx);
      const discarded = state.legislative.cards.splice(idx, 1)[0];
      state.discardPile.push(discarded);
      state.screen = 'legislative-pass-chancellor';
      saveGame();
      render();
      break;
    }

    case 'chancellor-enact': {
      if (!state.legislative || state.legislative.cards.length !== 2) return;
      const idx = parseInt(el.dataset.idx);
      state.revealedPolicy       = state.legislative.cards[idx];
      state.revealedPolicySource = 'legislative';
      state.discardPile.push(state.legislative.cards[1 - idx]);
      state.legislative = null;
      state.screen      = 'policy-reveal';
      saveGame();
      render();
      break;
    }

    case 'request-veto':
      if (!state.vetoUnlocked || !state.legislative || state.legislative.cards.length !== 2) return;
      state.screen = 'legislative-veto-president';
      saveGame();
      render();
      break;

    case 'refuse-veto':
      state.screen = 'legislative-chancellor';
      saveGame();
      render();
      break;

    case 'approve-veto':
      if (!state.legislative || state.legislative.cards.length !== 2) return;
      state.discardPile.push(...state.legislative.cards);
      state.legislative    = null;
      state.electionTracker = Math.min(3, state.electionTracker + 1);
      addHistory('<strong>Veto approvato</strong>: entrambe le politiche sono state scartate.', 'system');
      state.screen = 'game';
      state.tab    = 'vote';
      if (state.electionTracker >= 3) { state.electionTracker = 0; prepareChaosPolicy(); }
      nextTurn();
      saveGame();
      render();
      break;

    case 'apply-revealed-policy': {
      if (!state.revealedPolicy) return;
      const type      = state.revealedPolicy;
      const fromChaos = state.revealedPolicySource === 'chaos';
      state.revealedPolicy       = null;
      state.revealedPolicySource = null;
      state.screen = 'game';
      state.tab    = 'board';
      applyPolicy(type, { suppressPower: fromChaos });
      saveGame();
      render();
      break;
    }

    case 'timer-set':
      stopTimer();
      state.timer.seconds   = parseInt(el.dataset.sec);
      state.timer.remaining = state.timer.seconds;
      render();
      break;

    case 'timer-toggle':
      if (state.timer.running) stopTimer(); else startTimer();
      render();
      break;

    case 'timer-reset':
      stopTimer();
      state.timer.remaining = state.timer.seconds;
      render();
      break;

    case 'menu':             showMenuModal(); break;
    case 'show-power-script': showPowerScriptModal(el.dataset.power); break;
    case 'activate-communist-power': showCommunistPowerModal(el.dataset.power); break;
    case 'activate-fascist-power':   showFascistPowerModal(el.dataset.power); break;
    case 'show-execution':           showExecutionModal(); break;

    case 'emergency': {
      const type  = el.dataset.type;
      const power = el.dataset.power;
      if (type === 'article48' && state.emergencyArticle48 <= 0) return;
      if (type === 'enabling'  && state.emergencyEnabling   <= 0) return;
      handleEmergencyPower(type, power);
      break;
    }
  }
}

function attachHandlers() {
  $$('[data-action]:not(select)').forEach(el => el.addEventListener('click', handleAction));
  $$('select[data-action="set-role"]').forEach(el => el.addEventListener('change', handleAction));

  const input = $('#player-name');
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } });
    input.focus();
  }
}
