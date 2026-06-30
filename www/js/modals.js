// ============================================================
// modals.js — Modal dialogs
// ============================================================

function showRulesModal() {
  const xl = state.xl;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" style="max-height:85vh; overflow-y:auto;">
      <h3>Regole Rapide · XL</h3>
      <p style="text-align:left; line-height:1.7; font-size:13px;">
        <strong>OBIETTIVI BASE</strong><br>
        • <strong>Liberali</strong>: ${state.liberalSlotsTotal || 5} politiche liberali O eliminare Hitler<br>
        • <strong>Fascisti</strong>: 6 politiche fasciste O eleggere Hitler Cancelliere dopo la 3ª politica fascista<br>
        ${xl?.communists  ? '• <strong>Comunisti</strong>: riempire tracker comunista O assassinare Hitler (con i Liberali)<br>' : ''}
        ${xl?.capitalist  ? '• <strong>Capitalista</strong>: vince se né Comunisti né Anarchico vincono<br>' : ''}
        ${xl?.anarchist && xl?.communists  ? '• <strong>Anarchico (con Com.)</strong>: Comunisti vincono con 2 anarchiche sul tracker, o Hitler muore<br>' : ''}
        ${xl?.anarchist && !xl?.communists ? '• <strong>Anarchico</strong>: una politica anarchica viene promulgata via election tracker<br>' : ''}
        ${xl?.monarchist  ? '• <strong>Monarchico</strong>: Fascisti vincono SENZA Hitler Cancelliere dopo la 3ª fascista<br>' : ''}
        <br><strong>TURNO</strong><br>
        1. Presidente nomina un Cancelliere<br>
        2. Tutti votano Ja!/Nein!<br>
        3. Se passa: Presidente pesca 3 politiche, scarta 1, passa 2 al Cancelliere, che ne sceglie 1<br>
        4. Se la politica attiva un potere, il Presidente lo esegue<br><br>
        <strong>ELECTION TRACKER</strong><br>
        3 voti falliti consecutivi → la prossima carta in cima al mazzo viene promulgata automaticamente.<br>
        ${xl?.communists ? `<br><strong>POTERI COMUNISTI</strong><br>
          • <strong>Bugging</strong>: i Comunisti guardano la tessera di un giocatore<br>
          • <strong>Radicalizza</strong>: scambiano la tessera di un giocatore con una Comunista<br>
          • <strong>Piano 5 anni</strong>: +2 Comuniste +1 Liberale nel mazzo, poi rimescola<br>
          • <strong>Congresso</strong>: i nuovi Comunisti scoprono gli originari<br>
          • <strong>Confessione</strong>: il Presidente rivela a tutti la sua tessera<br>` : ''}
        ${xl?.antiPolicies ? `<br><strong>ANTI-POLICIES</strong><br>
          • <strong>Anti-Fascista</strong>: va sul tracker Comunista, rimuove 1 Fascista<br>
          • <strong>Anti-Comunista</strong>: va sul tracker Fascista, rimuove 1 Comunista<br>
          • <strong>Social-Democratica</strong>: va sul tracker Liberale, rimuove 1 Fascista O 1 Comunista<br>` : ''}
        ${xl?.emergencyPowers ? `<br><strong>EMERGENCY POWERS</strong><br>
          Article 48 (Presidente) o Enabling Act (Cancelliere):<br>
          Propaganda · Policy Peek · Impeachment · Marked for Execution · Execution · Pardon / No Confidence` : ''}
      </p>
      <button class="btn fascist" data-modal-close>Chiudi</button>
    </div>`;
  _attachModal(modal);
}

function showSecretVoteModal(idx) {
  if (state.executedPlayers.includes(idx) || state.votes[idx] !== undefined) return;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  let votingStarted = false;
  let dragStartX    = null;
  let draggedBallot = null;

  const shell = (body) => {
    modal.innerHTML = `<div class="modal"><h3>Voto Segreto</h3>${body}</div>`;
  };

  shell(`
    <div class="info-card">Nascondi lo schermo e passa il telefono a <strong>${escapeHtml(state.players[idx])}</strong>.</div>
    <button class="btn ghost" data-sv="ready">Sono ${escapeHtml(state.players[idx])}</button>
    <button class="btn ghost small" data-sv="cancel">Annulla</button>
  `);

  const registerVote = (vote) => {
    state.votes[idx] = vote;
    saveGame();
    dragStartX = null; draggedBallot = null;
    shell(`
      <div class="info-card"><strong>Voto registrato.</strong><br>La scelta resta segreta.</div>
      <button class="btn ghost" data-sv="done">Nascondi e restituisci</button>
    `);
  };

  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const btn = e.target.closest('[data-sv]');
    if (!btn) { if (e.target === modal && !votingStarted) modal.remove(); return; }
    const action = btn.dataset.sv;
    if (action === 'cancel' && !votingStarted) { modal.remove(); return; }
    if (action === 'ready') {
      votingStarted = true;
      shell(`
        <p><strong>${escapeHtml(state.players[idx])}</strong>, trascina la scheda:</p>
        <div class="swipe-vote-zone">
          <div class="swipe-direction left">← JA</div>
          <div class="swipe-direction right">NEIN →</div>
          <div class="swipe-ballot" data-swipe-ballot>SCORRI<br>PER VOTARE</div>
        </div>
        <div style="font-family:var(--typewriter); font-size:12px;">Sinistra = JA · Destra = NEIN</div>
      `);
      return;
    }
    if (action === 'done') { modal.remove(); render(); }
  });

  modal.addEventListener('pointerdown', e => {
    const ballot = e.target.closest('[data-swipe-ballot]');
    if (!ballot || state.votes[idx] !== undefined) return;
    dragStartX = e.clientX; draggedBallot = ballot;
    ballot.style.transition = 'none';
  });
  modal.addEventListener('pointermove', e => {
    if (dragStartX === null || !draggedBallot) return;
    const delta = Math.max(-130, Math.min(130, e.clientX - dragStartX));
    draggedBallot.style.transform = `translateX(${delta}px) rotate(${delta / 18}deg)`;
  });
  const finishSwipe = (e) => {
    if (dragStartX === null || !draggedBallot) return;
    const delta = e.clientX - dragStartX;
    if (delta <= -70) registerVote('ja');
    else if (delta >= 70) registerVote('nein');
    else {
      draggedBallot.style.transition = 'transform 0.16s ease';
      draggedBallot.style.transform = '';
      dragStartX = null; draggedBallot = null;
    }
  };
  modal.addEventListener('pointerup', finishSwipe);
  modal.addEventListener('pointercancel', finishSwipe);
}

function partyMembership(role) {
  if (['fascist', 'hitler', 'monarchist'].includes(role)) return { label: 'FASCISTA', color: 'var(--fascist-dark)' };
  if (role === 'communist' || (role === 'anarchist' && state.xl.communists)) return { label: 'COMUNISTA', color: 'var(--communist-dark)' };
  return { label: 'LIBERALE', color: 'var(--liberal-dark)' };
}

function hasCommunistMembership(role) {
  return role === 'communist' || (role === 'anarchist' && state.xl.communists);
}

function finishCommunistPower(modal, power, historyText) {
  addHistory(`<strong>${POWER_LABELS[power]}</strong>: ${historyText}`, 'communist-power');
  state.pendingCommunistPower = null;
  state.pendingCommunistPresident = null;
  modal.remove();
  saveGame();
  render();
}

function showCommunistPowerModal(power) {
  if (!power || state.pendingCommunistPower !== power) return;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  let mustFinish     = false;
  let radicalisedIdx = null;

  const shell = (body, showCancel = true) => {
    modal.innerHTML = `
      <div class="modal" style="max-height:88vh; overflow-y:auto;">
        <h3>${POWER_LABELS[power]}</h3>${body}
        ${showCancel ? '<button class="btn ghost" data-cp="cancel">Chiudi e completa dopo</button>' : ''}
      </div>`;
  };

  const privateGate = () => shell(`
    <div class="info-card" style="background:var(--communist-dark); color:var(--paper); border-color:var(--communist-deep);">
      Passa il telefono ai Comunisti. Gli altri giocatori non devono guardare lo schermo.
    </div>
    <button class="btn communist" data-cp="private-ready">I Comunisti sono pronti</button>
  `);

  const renderBugging = () => {
    const targets = state.players.map((name, i) => ({ name, i }))
      .filter(({ i }) => !state.executedPlayers.includes(i) && !hasCommunistMembership(state.roles[i].role));
    shell(`
      <p style="text-align:left;">Scegliete insieme una persona di cui ispezionare l'affiliazione:</p>
      <div class="player-list" style="max-height:48vh; overflow-y:auto;">
        ${targets.map(({ name, i }) => `<button class="btn ghost small" data-cp="bug-target" data-idx="${i}">${escapeHtml(name)}</button>`).join('') || '<div class="info-card">Nessun bersaglio valido.</div>'}
      </div>
    `);
  };

  const renderRadicalisation = () => {
    const targets = state.players.map((name, i) => ({ name, i }))
      .filter(({ i }) => !state.executedPlayers.includes(i) && !hasCommunistMembership(state.roles[i].role));
    shell(`
      <p style="text-align:left;">Scegliete chi radicalizzare:</p>
      <div class="player-list" style="max-height:48vh; overflow-y:auto;">
        ${targets.map(({ name, i }) => `<button class="btn ghost small" data-cp="rad-target" data-idx="${i}">${escapeHtml(name)}</button>`).join('') || '<div class="info-card">Nessun bersaglio valido.</div>'}
      </div>
    `);
  };

  const renderCongress = () => {
    const members = state.players.map((name, i) => ({ name, i }))
      .filter(({ i }) => !state.executedPlayers.includes(i) && hasCommunistMembership(state.roles[i].role));
    mustFinish = true;
    shell(`
      <div class="info-card" style="background:var(--communist-dark); color:var(--paper); border-color:var(--communist-deep);">
        I Comunisti attuali sono:<br><br>
        <strong style="font-size:18px;">${members.map(({ name }) => escapeHtml(name)).join('<br>')}</strong>
      </div>
      <button class="btn communist" data-cp="finish-congress">Ho memorizzato</button>
    `, false);
  };

  const renderConfession = () => {
    const idx = state.pendingCommunistPresident;
    if (idx === null || idx === undefined || !state.roles[idx]) {
      const alive = state.players.map((name, i) => ({ name, i })).filter(({ i }) => !state.executedPlayers.includes(i));
      shell(`
        <p style="text-align:left;">Seleziona il Presidente in carica:</p>
        <div class="player-list">${alive.map(({ name, i }) => `<button class="btn ghost small" data-cp="conf-president" data-idx="${i}">${escapeHtml(name)}</button>`).join('')}</div>
      `);
      return;
    }
    const membership = partyMembership(state.roles[idx].role);
    mustFinish = true;
    shell(`
      <p>${escapeHtml(state.players[idx])}, Presidente in carica, rivela pubblicamente:</p>
      <div class="role-card" style="background:${membership.color}; color:var(--paper); margin:16px 0;">
        <div class="role-name">${membership.label}</div>
        <div class="role-desc">Affiliazione politica</div>
      </div>
      <button class="btn communist" data-cp="finish-confession">Affiliazione rivelata</button>
    `, false);
  };

  const resolveRadicalisation = () => {
    if (radicalisedIdx !== null) {
      const role = state.roles[radicalisedIdx]?.role;
      if (role !== 'hitler' && role !== 'capitalist' && !hasCommunistMembership(role)) {
        state.roles[radicalisedIdx] = { role: 'communist' };
      }
    }
    addHistory(`<strong>${POWER_LABELS[power]}</strong>: la Radicalizzazione è stata risolta in segreto.`, 'communist-power');
    state.pendingCommunistPower = null;
    state.pendingCommunistPresident = null;
    state.roleRefreshInProgress = true;
    state.reveal = { idx: 0, shown: false };
    state.screen = 'pass-reveal';
    modal.remove();
    saveGame();
    render();
  };

  if (power === 'five-year') {
    shell(`
      <div class="info-card"><strong>+2 politiche Comuniste<br>+1 politica Liberale</strong><br>Rimescola il mazzo di pesca.</div>
      <button class="btn communist" data-cp="finish-five-year">Registra il Piano</button>
    `);
  } else if (power === 'confession') {
    renderConfession();
  } else {
    privateGate();
  }

  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const btn = e.target.closest('[data-cp]');
    if (!btn) { if (e.target === modal && !mustFinish) modal.remove(); return; }
    const action = btn.dataset.cp;
    if (action === 'cancel') { modal.remove(); return; }
    if (action === 'private-ready') {
      if (power === 'bugging') renderBugging();
      else if (power === 'radicalisation') renderRadicalisation();
      else if (power === 'congress') renderCongress();
      return;
    }
    if (action === 'bug-target') {
      const idx  = parseInt(btn.dataset.idx);
      const mem  = partyMembership(state.roles[idx].role);
      mustFinish = true;
      shell(`
        <p>Affiliazione di <strong>${escapeHtml(state.players[idx])}</strong>:</p>
        <div class="role-card" style="background:${mem.color}; color:var(--paper); margin:16px 0;">
          <div class="role-name">${mem.label}</div>
          <div class="role-desc">Non mostrare agli altri giocatori</div>
        </div>
        <button class="btn communist" data-cp="finish-bugging">Memorizzato</button>
      `, false);
      return;
    }
    if (action === 'finish-bugging') { finishCommunistPower(modal, power, 'affiliazione ispezionata in privato.'); return; }
    if (action === 'rad-target') { radicalisedIdx = parseInt(btn.dataset.idx); resolveRadicalisation(); return; }
    if (action === 'finish-congress') { finishCommunistPower(modal, power, 'i Comunisti si sono riconosciuti in privato.'); return; }
    if (action === 'conf-president') { state.pendingCommunistPresident = parseInt(btn.dataset.idx); renderConfession(); return; }
    if (action === 'finish-confession') {
      const idx = state.pendingCommunistPresident;
      const mem = partyMembership(state.roles[idx].role);
      finishCommunistPower(modal, power, `${escapeHtml(state.players[idx])} ha rivelato affiliazione ${mem.label}.`);
      return;
    }
    if (action === 'finish-five-year') {
      state.communistDeckAdditions.communist += 2;
      state.communistDeckAdditions.liberal   += 1;
      state.policyDeck.push('communist', 'communist', 'liberal');
      shuffleArray(state.policyDeck);
      finishCommunistPower(modal, power, 'registrate +2 politiche Comuniste e +1 Liberale nel mazzo; mazzo rimescolato.');
    }
  });
}

function completeFascistPower(power, historyText) {
  addHistory(`<strong>${POWER_LABELS[power]}</strong>: ${historyText}`, 'fascist-power');
  state.pendingFascistPower = null;
  saveGame();
  render();
}

function showFascistPowerModal(power) {
  if (!power || state.pendingFascistPower !== power) return;
  if (power === 'kill' || power === 'kill+veto') {
    showExecutionModal(false, 'Presidente', () => {
      if (power === 'kill+veto') state.vetoUnlocked = true;
      completeFascistPower(power, power === 'kill+veto' ? 'esecuzione completata; potere di Veto attivo.' : 'esecuzione completata.');
    });
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  let privateView = false;

  const shell = (body, cancellable = true) => {
    modal.innerHTML = `
      <div class="modal" style="max-height:88vh; overflow-y:auto;">
        <h3>${POWER_LABELS[power]}</h3>${body}
        ${cancellable ? '<button class="btn ghost" data-fp="cancel">Chiudi e completa dopo</button>' : ''}
      </div>`;
  };

  const privateGate = () => shell(`
    <div class="info-card" style="background:var(--fascist-deep); color:var(--paper); border-color:var(--gold);">Passa il telefono al Presidente. La schermata seguente è privata.</div>
    <button class="btn fascist" data-fp="private-ready">Il Presidente è pronto</button>
  `);

  const renderInvestigation = () => {
    const alive = state.players.map((name, i) => ({ name, i })).filter(({ i }) => !state.executedPlayers.includes(i));
    shell(`
      <div class="player-list">${alive.map(({ name, i }) => `<button class="btn ghost small" data-fp="investigate" data-idx="${i}">${escapeHtml(name)}</button>`).join('')}</div>
    `, false);
  };

  const renderSpecialElection = () => {
    const alive = state.players.map((name, i) => ({ name, i })).filter(({ i }) => !state.executedPlayers.includes(i));
    shell(`<div class="player-list">${alive.map(({ name, i }) => `<button class="btn ghost small" data-fp="special-president" data-idx="${i}">${escapeHtml(name)}</button>`).join('')}</div>`);
  };

  const renderExamine = () => {
    ensurePolicyCards(3);
    const examined = state.policyDeck.slice(-3).reverse();
    shell(`
      <div class="policy-hand">${examined.map(type => renderPolicyCard(type)).join('')}</div>
      <button class="btn fascist" data-fp="finish-examine">Memorizzato</button>
    `, false);
  };

  if (power === 'special_election') renderSpecialElection();
  else privateGate();

  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const btn = e.target.closest('[data-fp]');
    if (!btn) { if (e.target === modal && !privateView) modal.remove(); return; }
    const action = btn.dataset.fp;
    if (action === 'cancel' && !privateView) { modal.remove(); return; }
    if (action === 'private-ready') { privateView = true; if (power === 'investigate') renderInvestigation(); else renderExamine(); return; }
    if (action === 'investigate') {
      const idx = parseInt(btn.dataset.idx);
      const mem = partyMembership(state.roles[idx].role);
      shell(`
        <p>Affiliazione di <strong>${escapeHtml(state.players[idx])}</strong>:</p>
        <div class="role-card" style="background:${mem.color}; color:var(--paper); margin:16px 0;">
          <div class="role-name">${mem.label}</div>
          <div class="role-desc">Informazione privata del Presidente</div>
        </div>
        <button class="btn fascist" data-fp="finish-investigate">Memorizzato</button>
      `, false);
      return;
    }
    if (action === 'finish-investigate') { modal.remove(); completeFascistPower(power, 'affiliazione esaminata in privato.'); return; }
    if (action === 'special-president') {
      const idx = parseInt(btn.dataset.idx);
      modal.remove(); completeFascistPower(power, `${escapeHtml(state.players[idx])} è stato scelto come prossimo Presidente.`); return;
    }
    if (action === 'finish-examine') { modal.remove(); completeFascistPower(power, 'le prossime 3 politiche sono state esaminate in privato.'); }
  });
}

function showPowerScriptModal(power) {
  const script = POWER_SCRIPTS[power];
  if (!script) return;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" style="max-height:85vh; overflow-y:auto;">
      <h3>${POWER_LABELS[power]} — Script Notte</h3>
      <div class="power-script">
        <p style="margin-bottom:8px;">Leggi ad alta voce, lentamente:</p>
        <ol>${script.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>
      <button class="btn fascist" data-modal-close>Chiudi</button>
    </div>`;
  _attachModal(modal);
}

function showExecutionModal(fromEmergency = false, role = 'Presidente', onExecuted = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  const alive = state.players.map((p, i) => ({ p, i })).filter(({ i }) => !state.executedPlayers.includes(i));
  modal.innerHTML = `
    <div class="modal" style="max-height:85vh; overflow-y:auto;">
      <h3>${fromEmergency ? `Execution (${role})` : 'Esecuzione'}</h3>
      <p style="text-align:left; font-size:13px;">Scegli il giocatore da eseguire. Se è Hitler, i Liberali (e Comunisti) vincono.</p>
      <div class="player-list" style="max-height:50vh; overflow-y:auto;">
        ${alive.map(({ p, i }) => `<button class="btn ghost small" data-exec-idx="${i}" style="display:block; width:100%; text-align:left; margin-bottom:4px;">${i + 1}. ${escapeHtml(p)}</button>`).join('')}
      </div>
      <button class="btn ghost" data-modal-close>Annulla</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const idx = e.target.dataset.execIdx;
    if (idx !== undefined) {
      executePlayer(parseInt(idx));
      if (onExecuted) onExecuted(parseInt(idx));
      modal.remove();
      render();
      return;
    }
    if (e.target === modal || e.target.hasAttribute('data-modal-close')) modal.remove();
  });
}

function showMarkedForExecutionModal(role) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  const alive = state.players.map((p, i) => ({ p, i })).filter(({ i }) => !state.executedPlayers.includes(i));
  modal.innerHTML = `
    <div class="modal" style="max-height:85vh; overflow-y:auto;">
      <h3>Marked for Execution (${role})</h3>
      <p style="text-align:left; font-size:13px;">Il target verrà ucciso dopo 3 ulteriori politiche fasciste promulgate.</p>
      <div class="player-list" style="max-height:50vh; overflow-y:auto;">
        ${alive.map(({ p, i }) => `<button class="btn ghost small" data-mark-idx="${i}" style="display:block; width:100%; text-align:left; margin-bottom:4px;">${i + 1}. ${escapeHtml(p)}</button>`).join('')}
      </div>
      <button class="btn ghost" data-modal-close>Annulla</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const idx = e.target.dataset.markIdx;
    if (idx !== undefined) {
      state.markedForExecution = parseInt(idx);
      addHistory(`<strong>Marked for Execution</strong> da ${role}: 🎯 ${escapeHtml(state.players[parseInt(idx)])}`, 'system');
      modal.remove(); saveGame(); render();
      return;
    }
    if (e.target === modal || e.target.hasAttribute('data-modal-close')) modal.remove();
  });
}

function showSocialDemModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <h3>Social-Democratica</h3>
      <p style="text-align:left;">Il Presidente sceglie da quale tracker rimuovere 1 politica:</p>
      <button class="btn fascist" data-sd="fascist">Rimuovi da Fascista (${state.fascistPolicies})</button>
      ${state.xl.communists ? `<button class="btn communist" data-sd="communist">Rimuovi da Comunista (${state.communistPolicies})</button>` : ''}
      <button class="btn ghost" data-modal-close>Annulla</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    const target = e.target.dataset.sd;
    if (target === 'fascist') {
      state.fascistPolicies = Math.max(0, state.fascistPolicies - 1);
      addHistory('Social-Dem: -1 politica Fascista', 'system');
      modal.remove(); saveGame(); render(); return;
    }
    if (target === 'communist') {
      state.communistPolicies = Math.max(0, state.communistPolicies - 1);
      addHistory('Social-Dem: -1 politica Comunista', 'system');
      modal.remove(); saveGame(); render(); return;
    }
    if (e.target === modal || e.target.hasAttribute('data-modal-close')) modal.remove();
  });
}

function showMenuModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  const xl = state.xl;
  modal.innerHTML = `
    <div class="modal" style="max-height:85vh; overflow-y:auto;">
      <h3>Menu Partita</h3>
      <button class="btn ghost" data-menu="rules">Regole Rapide</button>
      <button class="btn ghost" data-menu="show-exec">⚰ Gestisci esecuzioni</button>
      <div class="section-label">Termina Manualmente</div>
      <button class="btn liberal" data-menu="end-liberal">Vittoria Liberale</button>
      <button class="btn fascist" data-menu="end-fascist">Vittoria Fascista</button>
      ${xl.communists  ? '<button class="btn communist" data-menu="end-communist">Vittoria Comunista</button>'   : ''}
      ${xl.capitalist  ? '<button class="btn ghost" data-menu="end-capitalist">Vittoria Capitalista</button>'  : ''}
      ${xl.anarchist   ? '<button class="btn anarchist" data-menu="end-anarchist">Vittoria Anarchico</button>' : ''}
      ${xl.monarchist  ? '<button class="btn ghost" data-menu="end-monarchist">Vittoria Monarchico</button>'   : ''}
      <div class="section-label">Altro</div>
      <button class="btn fascist" data-menu="reset">Nuova Partita</button>
      <button class="btn ghost" data-modal-close>Annulla</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.hasAttribute('data-modal-close')) { modal.remove(); return; }
    const action = e.target.dataset.menu;
    if (action === 'rules')     { modal.remove(); showRulesModal(); return; }
    if (action === 'show-exec') { modal.remove(); showExecutionModal(); return; }
    const endActions = {
      'end-liberal': ['liberal', 'Vittoria Liberale manuale'],
      'end-fascist': ['fascist', 'Vittoria Fascista manuale'],
      'end-communist': ['communist', 'Vittoria Comunista manuale'],
      'end-capitalist': ['capitalist', 'Vittoria Capitalista manuale'],
      'end-anarchist': ['anarchist', 'Vittoria Anarchico manuale'],
      'end-monarchist': ['monarchist', 'Vittoria Monarchico manuale'],
    };
    if (endActions[action]) {
      const [w, r] = endActions[action];
      if (confirm(`Confermi vittoria ${w}?`)) { endGame(w, r); modal.remove(); render(); }
      return;
    }
    if (action === 'reset' && confirm('Iniziare una nuova partita? Tutti i dati verranno persi.')) {
      resetGame(); state.screen = 'setup'; modal.remove(); render();
    }
  });
}

// Shared modal helper
function _attachModal(modal) {
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.hasAttribute('data-modal-close')) modal.remove();
  });
}
