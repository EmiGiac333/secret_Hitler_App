// ============================================================
// render.js — All screen render functions
// ============================================================

function renderHome() {
  return `
    <div class="screen">
      <div class="title-stack">
        <h1 class="glitch">Secret Hitler</h1>
        <div class="subtitle">— Companion App —</div>
      </div>
      <div class="info-card">
        Un'app per gestire le partite di <strong>Secret Hitler</strong> passandosi un solo telefono.
        Tieni traccia di ruoli, votazioni, poteri presidenziali e cronologia dei turni.
      </div>
      <button class="btn fascist" data-action="new-game">Nuova Partita</button>
      <button class="btn liberal" data-action="online-menu">Partita su più dispositivi</button>
      ${hasSavedGame() ? '<button class="btn liberal" data-action="resume-game">Riprendi Partita</button>' : ''}
      <button class="btn ghost" data-action="rules">Regole Rapide</button>
      <div class="section-label">5 – 20 Giocatori · XL</div>
      <div style="text-align:center; font-family:var(--typewriter); font-size:11px; color:var(--gold); opacity:0.7; margin-top:24px; line-height:1.6;">
        Berlino · 1932<br>★ ★ ★
      </div>
    </div>`;
}

function renderOnlineMenu() {
  let rejoinSession = null;
  try { rejoinSession = JSON.parse(sessionStorage.getItem('sh_rejoin') || 'null'); } catch (_) {}

  return `
    <div class="screen">
      <div class="title-stack"><h1>Partita Online</h1><div class="subtitle">— Peer to Peer —</div></div>
      ${rejoinSession ? `
        <div class="info-card">Eri connesso alla stanza <strong>${escapeHtml(rejoinSession.code)}</strong> come <strong>${escapeHtml(rejoinSession.name)}</strong>.</div>
        <button class="btn fascist" data-action="rejoin-room">↻ Rientra nella stanza</button>
        <div class="section-label">Oppure</div>` : ''}
      <div class="role-pick">
        <label>IL TUO NOME</label>
        <input id="online-name" type="text" maxlength="20" placeholder="Nome giocatore" value="${escapeHtml(multiplayer.playerName)}">
      </div>
      <button class="btn fascist" data-action="create-online-room">Crea stanza</button>
      <div class="section-label">Oppure entra</div>
      <div class="role-pick">
        <label>CODICE STANZA</label>
        <input id="online-room-code" type="text" maxlength="6" placeholder="ABC123" style="text-transform:uppercase;">
      </div>
      <button class="btn liberal" data-action="join-online-room">Entra nella stanza</button>
      ${multiplayer.error ? `<div class="info-card" style="background:var(--fascist);color:var(--paper);">${escapeHtml(multiplayer.error)}</div>` : ''}
      <button class="btn ghost" data-action="home">Indietro</button>
    </div>`;
}

function renderOnlineLobby() {
  const players = multiplayer.players;
  const missing = Math.max(0, 5 - players.length);
  return `
    <div class="screen">
      <div class="title-stack"><h1>Sala d'Attesa</h1><div class="subtitle">— Partita Online —</div></div>
      <div class="room-code">${escapeHtml(multiplayer.roomCode || '------')}</div>
      <div class="online-status">
        <span class="online-dot" style="${multiplayer.connected ? '' : 'background:#e55;'}"></span>
        ${multiplayer.connected ? 'Connesso' : 'Connessione in corso…'}
      </div>
      <div class="section-label">${players.length} Giocator${players.length !== 1 ? 'i' : 'e'} Connessi</div>
      <div class="lobby-player-grid">
        ${players.length ? players.map(p => `
          <div class="lobby-player-card ${p.host ? 'host-card' : ''}">
            <div class="lobby-player-initial">${escapeHtml((p.name[0] || '?').toUpperCase())}</div>
            <div class="lobby-player-card-name">${escapeHtml(p.name)}</div>
            <div class="lobby-player-card-tag">${p.host ? '★ HOST' : '✓ PRONTO'}</div>
          </div>`).join('') : `
          <div class="lobby-waiting">
            <div class="lobby-spinner"></div>
            <div style="font-family:var(--typewriter); font-size:13px; color:var(--gold);">In attesa dei giocatori…</div>
            <div style="font-family:var(--typewriter); font-size:11px; color:var(--paper-dark); margin-top:8px;">Condividi il codice stanza</div>
          </div>`}
      </div>
      ${missing > 0 ? `<div class="info-card">Mancano ancora <strong>${missing} giocator${missing !== 1 ? 'i' : 'e'}</strong> per iniziare (minimo 5).</div>` : ''}
      ${multiplayer.isHost
        ? `<button class="btn fascist" data-action="online-configure" ${players.length >= 5 ? '' : 'disabled'}>Configura e Avvia →</button>`
        : `<div class="info-card" style="text-align:center;">L'host avvierà la partita quando tutti saranno pronti.</div>`}
      <button class="btn ghost" data-action="leave-online-room">Lascia la Stanza</button>
    </div>`;
}

function renderOnlineRole() {
  const role = multiplayer.privateRole || 'liberal';
  const data = {
    liberal: ['liberal', 'LIBERALE'], fascist: ['fascist', 'FASCISTA'], hitler: ['hitler', 'HITLER'],
    communist: ['communist', 'COMUNISTA'], capitalist: ['capitalist', 'CAPITALISTA'],
    anarchist: ['anarchist', 'ANARCHICO'], monarchist: ['monarchist', 'MONARCHICO'],
  }[role] || ['liberal', String(role).toUpperCase()];
  return `
    <div class="screen">
      <div class="role-card ${data[0]}">
        <div class="role-label">Il tuo ruolo</div>
        <div class="role-name">${data[1]}</div>
        ${multiplayer.knownPlayers.length ? `<div class="fellow-fascists"><strong>Conosci</strong>${multiplayer.knownPlayers.map(escapeHtml).join('<br>')}</div>` : ''}
      </div>
      <button class="btn ghost" data-action="online-role-ready">Ho memorizzato</button>
    </div>`;
}

function renderSetup() {
  const count = state.players.length;
  const valid  = count >= 5 && count <= 20;
  const config = PLAYER_CONFIG[count];
  const xl     = state.xl;
  const canCommunists   = count >= 5;
  const canCommunistShort = xl.communists && count > 5;

  let breakdown = '';
  if (config) {
    const fas = config.fascists;
    const com = xl.communists && canCommunists ? COMMUNIST_COUNT[count] || 0 : 0;
    const libs = count - 1 - fas - com;
    breakdown = `
      <strong>${count} GIOCATORI</strong><br>
      1 Hitler · ${fas} Fascist${fas > 1 ? 'i' : 'a'}${com > 0 ? ` · ${com} Comunist${com > 1 ? 'i' : 'a'}` : ''} · ${libs} Liberal${libs > 1 ? 'i' : 'e'}<br>
      ${config.hitlerKnows ? 'Hitler conosce i Fascisti' : 'Hitler NON conosce i Fascisti'}
      ${xl.communists && count >= 11 ? '<br>I Comunisti si riconoscono a inizio partita' : ''}
    `;
  }

  const xlToggle = (key, label, desc, enabled) => {
    const active = state.xl[key] && enabled;
    return `
      <div class="xl-toggle ${active ? 'active' : ''} ${enabled ? '' : 'disabled'}" data-action="xl-toggle" data-key="${key}">
        <span class="check">${active ? '✓' : ''}</span>
        <span class="label"><strong>${label}</strong><span class="desc">${desc}</span></span>
      </div>`;
  };

  return `
    <div class="screen">
      <div class="title-stack"><h1>Inscrivi Giocatori</h1><div class="subtitle">— 5 a 20 · XL —</div></div>
      <div class="input-row">
        <input type="text" id="player-name" placeholder="Nome giocatore" maxlength="20" autocomplete="off">
        <button class="btn fascist" data-action="add-player">+</button>
      </div>
      <div class="player-list">
        ${count === 0
          ? '<div class="player-empty">Nessun giocatore. Aggiungine almeno 5.</div>'
          : state.players.map((p, i) => `
              <div class="player-item">
                <div class="num">${i + 1}</div>
                <div class="name">${escapeHtml(p)}</div>
                <button class="del" data-action="remove-player" data-idx="${i}">✕</button>
              </div>`).join('')}
      </div>
      ${config
        ? `<div class="info-card">${breakdown}</div>`
        : '<div class="info-card">Servono da 5 a 20 giocatori per giocare.</div>'}

      <div class="section-label">Espansione XL</div>
      <div class="info-card" style="font-size:11px; text-align:left;">
        Attiva/disattiva regole opzionali. Capitalista e Anarchico (versione comunista) richiedono i Comunisti.
      </div>
      <div class="xl-toggle-group">
        ${xlToggle('communists', '☭ Comunisti', 'Terzo partito. Vince con 5/6 politiche comuniste o uccidendo Hitler (con i Liberali).', canCommunists)}
        ${xlToggle('communistShort', 'Comunisti Corto', 'Tracker comunista a 3 slot + tracker liberale a 3.', canCommunistShort)}
        ${xlToggle('capitalist', '💰 Capitalista', 'Ruolo segreto. Vince se né Comunisti né Anarchico vincono. Se ucciso, +1 politica comunista nel mazzo.', xl.communists)}
        ${xlToggle('anarchist', 'Ⓐ Anarchico', xl.communists ? 'Squadra comunista. Vince se i Comunisti vincono con 2 politiche anarchiche sul tracker, o se Hitler viene ucciso.' : 'Vince se una politica anarchica viene promulgata via election tracker.', true)}
        ${xlToggle('monarchist', '♛ Monarchico', 'Sostituisce un Fascista. Vince se i Fascisti vincono SENZA che Hitler diventi Cancelliere dopo la 3ª fascista.', true)}
        ${xlToggle('antiPolicies', '⚖ Anti-Policies', 'Politiche speciali Anti-Fasciste / Anti-Comuniste / Social-Dem.', true)}
        ${xlToggle('emergencyPowers', '⚡ Emergency Powers', 'Article 48 (Presidente) + Enabling Act (Cancelliere). 1 carta per ogni giocatore oltre 10.', true)}
        ${xlToggle('liberalTrackerLong', '★ Tracker Liberale a 6', 'Dà un (lieve) svantaggio ai Liberali e allunga la partita.', true)}
      </div>

      <div class="section-label">Mazzo Politiche</div>
      <div class="xl-toggle ${state.useDigitalPolicyDeck ? 'active' : ''}" data-action="deck-mode-toggle">
        <span class="check">${state.useDigitalPolicyDeck ? '✓' : ''}</span>
        <span class="label">
          <strong>${state.useDigitalPolicyDeck ? 'Mazzo interno all\'app' : 'Mazzo fisico'}</strong>
          <span class="desc">${state.useDigitalPolicyDeck ? 'Pescata, scarti e rimescolo gestiti automaticamente.' : 'Dopo il voto scegli se usare la pescata digitale o proseguire senza selezionare carte.'}</span>
        </span>
      </div>
      <button class="btn fascist" data-action="start-roles" ${valid ? '' : 'disabled'}>Assegna Ruoli</button>
      <button class="btn ghost" data-action="home">← Indietro</button>
    </div>`;
}

function renderPassReveal() {
  const idx    = state.reveal.idx;
  const player = state.players[idx];
  return `
    <div class="screen">
      <div class="title-stack">
        <h1>Riservato</h1>
        <div class="subtitle">— ${state.roleRefreshInProgress ? 'Aggiornamento Ruoli' : 'Distribuzione Ruoli'} —</div>
      </div>
      <div class="pass-screen">
        <h2>Passa il telefono a</h2>
        <div class="player-name">${escapeHtml(player)}</div>
        <div class="instruction">Tieni il telefono nascosto agli altri,<br>poi tocca per scoprire il tuo ruolo.</div>
      </div>
      <button class="btn fascist" data-action="show-role">Sono ${escapeHtml(player)}</button>
      <div style="text-align:center; font-family:var(--typewriter); font-size:11px; color:var(--gold); margin-top:12px;">
        ${idx + 1} di ${state.players.length}
      </div>
    </div>`;
}

function renderRoleReveal() {
  const idx    = state.reveal.idx;
  const player = state.players[idx];
  const role   = state.roles[idx].role;
  const config = PLAYER_CONFIG[state.players.length];
  const n      = state.players.length;

  let fellowInfo = '';
  if (role === 'fascist' || role === 'monarchist') {
    const mates = Object.entries(state.roles)
      .filter(([i, r]) => parseInt(i) !== idx && ['fascist', 'hitler', 'monarchist'].includes(r.role))
      .map(([i, r]) => {
        const tag = r.role === 'hitler' ? '(HITLER)' : r.role === 'monarchist' ? '(Monarchico)' : '(Fascista)';
        return `${state.players[i]} ${tag}`;
      });
    fellowInfo = `<div class="fellow-fascists"><strong>I tuoi alleati</strong>${mates.length ? mates.join('<br>') : 'Sei solo'}</div>`;
  } else if (role === 'hitler' && config.hitlerKnows) {
    const fascists = Object.entries(state.roles).filter(([i, r]) => parseInt(i) !== idx && ['fascist', 'monarchist'].includes(r.role)).map(([i]) => state.players[i]);
    fellowInfo = `<div class="fellow-fascists"><strong>Il tuo Fascista</strong>${fascists.join('<br>')}</div>`;
  } else if (role === 'hitler' && !config.hitlerKnows) {
    fellowInfo = `<div class="fellow-fascists"><strong>Sei solo</strong>I Fascisti ti conoscono.<br>Tu non sai chi sono loro.</div>`;
  } else if (role === 'communist' && n >= 11) {
    const comrades = Object.entries(state.roles).filter(([i, r]) => parseInt(i) !== idx && ['communist', 'anarchist'].includes(r.role)).map(([i, r]) => `${state.players[i]} ${r.role === 'anarchist' ? '(Anarchico)' : '(Comunista)'}`);
    fellowInfo = `<div class="fellow-fascists"><strong>I tuoi Compagni</strong>${comrades.length ? comrades.join('<br>') : 'Sei solo'}</div>`;
  } else if (role === 'communist' && n < 11) {
    fellowInfo = `<div class="fellow-fascists"><strong>Riconoscimento</strong>Non conosci ancora gli altri Comunisti. Vi riconoscerete col potere "Congresso".</div>`;
  } else if (role === 'anarchist' && state.xl.communists && n >= 11) {
    const comrades = Object.entries(state.roles).filter(([i, r]) => parseInt(i) !== idx && ['communist', 'anarchist'].includes(r.role)).map(([i, r]) => `${state.players[i]} ${r.role === 'anarchist' ? '(Anarchico)' : '(Comunista)'}`);
    fellowInfo = `<div class="fellow-fascists"><strong>I tuoi Compagni</strong>${comrades.length ? comrades.join('<br>') : 'Sei solo'}</div>`;
  }

  const roleData = {
    liberal:   { class: 'liberal',   label: 'Sei un', name: 'Liberale',   party: 'Partito Liberale',              desc: `Difendi la democrazia. Approva ${state.liberalSlotsTotal} politiche liberali o elimina Hitler.` },
    fascist:   { class: 'fascist',   label: 'Sei un', name: 'Fascista',   party: 'Partito Fascista',              desc: 'Sabota la repubblica. Approva 6 politiche fasciste o eleggi Hitler Cancelliere dopo la 3ª politica fascista.' },
    hitler:    { class: 'hitler',    label: 'Tu sei', name: 'Hitler',     party: 'Partito Fascista',              desc: 'Nasconditi tra i Liberali. Se vieni eletto Cancelliere dopo la 3ª politica fascista, vincete.' },
    communist: { class: 'communist', label: 'Sei un', name: 'Comunista',  party: '☭ Partito Comunista',           desc: 'Riempi il tracker comunista, o assassina Hitler (vinci insieme ai Liberali).' },
    capitalist:{ class: 'capitalist',label: 'Sei il', name: 'Capitalista',party: '💰 Ruolo Segreto',              desc: 'Vinci se NÉ Comunisti NÉ Anarchico vincono. Se ti uccidono, una politica comunista in più entra nel mazzo.' },
    anarchist: { class: 'anarchist', label: 'Sei un', name: 'Anarchico',  party: 'Ⓐ Ruolo Segreto',              desc: state.xl.communists ? 'Squadra Comunisti. Vinci se i Comunisti vincono con 2 politiche anarchiche sul tracker, o se Hitler viene assassinato.' : 'Vinci se una politica anarchica viene promulgata via election tracker.' },
    monarchist:{ class: 'monarchist',label: 'Sei il', name: 'Monarchico', party: '♛ Partito Fascista (defilato)', desc: 'Vinci se i Fascisti vincono SENZA che Hitler diventi Cancelliere dopo la 3ª fascista. Perdi se Hitler viene ucciso.' },
  };
  const r = roleData[role];

  return `
    <div class="screen">
      <div class="role-card ${r.class}">
        <div class="role-label">${r.label}</div>
        <div class="role-name">${r.name}</div>
        <div class="role-party">${r.party}</div>
        <div class="role-desc">${r.desc}</div>
        ${fellowInfo}
      </div>
      <div class="info-card" style="background:var(--ink); color:var(--gold); border-color:var(--gold);">
        ⚠ Memorizza il tuo ruolo, poi tocca per nasconderlo
      </div>
      <button class="btn ghost" data-action="hide-role">Ho memorizzato — Avanti</button>
    </div>`;
}

function renderGame() {
  return `
    <div class="screen">
      <div class="title-stack">
        <h1>Turno ${state.turn + 1}</h1>
        <div class="subtitle">— ${state.players.length} Giocatori —</div>
      </div>
      <div class="tab-bar">
        <button class="tab ${state.tab === 'board'   ? 'active' : ''}" data-action="tab" data-tab="board">Board</button>
        <button class="tab ${state.tab === 'vote'    ? 'active' : ''}" data-action="tab" data-tab="vote">Voto</button>
        <button class="tab ${state.tab === 'history' ? 'active' : ''}" data-action="tab" data-tab="history">Storia</button>
      </div>
      ${state.tab === 'board'   ? renderBoard()   : ''}
      ${state.tab === 'vote'    ? renderVote()    : ''}
      ${state.tab === 'history' ? renderHistory() : ''}
      <button class="btn ghost small" data-action="menu" style="margin-top:24px;">Menu Partita</button>
    </div>`;
}

function renderBoard() {
  const n      = state.players.length;
  const config = PLAYER_CONFIG[n];
  const powers = config.powers;
  const xl     = state.xl;
  const libSlots = state.liberalSlotsTotal;

  let liberalSlots = '';
  for (let i = 0; i < libSlots; i++) {
    const filled = i < state.liberalPolicies;
    const isWin  = i === libSlots - 1;
    liberalSlots += `<div class="policy-slot ${filled ? 'filled' : ''}">${isWin && !filled ? '<div class="power-label">VITTORIA</div>' : ''}</div>`;
  }

  let fascistSlots = '';
  for (let i = 0; i < 6; i++) {
    const filled = i < state.fascistPolicies;
    const power  = i < 5 ? powers[i] : null;
    let label = '';
    if (i === 2)   label = 'CAOS';
    if (i === 5)   label = 'VITTORIA';
    else if (power) label = POWER_LABELS[power];
    fascistSlots += `<div class="policy-slot ${filled ? 'filled' : ''}">${!filled && label ? `<div class="power-label">${label}</div>` : ''}</div>`;
  }

  let communistBoard = '';
  if (xl.communists) {
    const track = getCommunistTrack(n, xl.communistShort);
    let slots = '';
    for (let i = 0; i < track.slots; i++) {
      const filled = i < state.communistPolicies;
      const isWin  = i === track.slots - 1;
      const power  = track.powers[i];
      let label = '';
      if (isWin) label = 'VITTORIA';
      else if (power) label = POWER_LABELS[power];
      slots += `<div class="policy-slot communist-filled ${filled ? 'filled' : ''}">${!filled && label ? `<div class="power-label">${label}</div>` : ''}</div>`;
    }
    communistBoard = `
      <div class="board communist-board" style="--communist-slots:${track.slots};">
        <div class="board-title">☭ Politiche Comuniste ☭</div>
        <div class="policy-track">${slots}</div>
      </div>`;
  }

  let pips = '';
  for (let i = 0; i < 3; i++) pips += `<div class="pip ${i < state.electionTracker ? 'active' : ''}"></div>`;

  const fascistHint   = state.pendingFascistPower ? `
    <div class="info-card" style="margin-top:8px;">
      <strong>Potere Fascista da eseguire: ${POWER_LABELS[state.pendingFascistPower]}</strong><br>
      ${POWER_DESCRIPTIONS[state.pendingFascistPower]}
      <br><button class="btn fascist small" data-action="activate-fascist-power" data-power="${state.pendingFascistPower}" style="margin-top:10px;">Attiva dal telefono</button>
    </div>` : '';

  const communistHint = xl.communists && state.pendingCommunistPower ? `
    <div class="info-card" style="background:var(--communist-dark); color:var(--paper); border-color:var(--communist-deep);">
      <strong>Potere Comunista da eseguire: ${POWER_LABELS[state.pendingCommunistPower]}</strong><br>
      ${POWER_DESCRIPTIONS[state.pendingCommunistPower]}
      <br><button class="btn communist small" data-action="activate-communist-power" data-power="${state.pendingCommunistPower}" style="margin-top:10px;">Attiva dal telefono</button>
      <button class="btn ghost small" data-action="show-power-script" data-power="${state.pendingCommunistPower}" style="margin-top:8px;">Mostra regole complete</button>
    </div>` : '';

  const communistDeckHint = xl.communists && (state.communistDeckAdditions.communist || state.communistDeckAdditions.liberal) ? `
    <div class="info-card" style="font-size:11px;">
      Piano quinquennale nel mazzo: +${state.communistDeckAdditions.communist} Comuniste, +${state.communistDeckAdditions.liberal} Liberali.
    </div>` : '';

  const hitlerWinHint = state.fascistPolicies >= 3 ? `
    <div class="info-card" style="background:var(--fascist-deep); color:var(--paper); border-color:var(--gold);">
      ⚠ Se Hitler viene eletto Cancelliere ora, <strong>i Fascisti vincono</strong>
    </div>` : '';

  const markedHint = state.markedForExecution !== null ? `
    <div class="info-card" style="background:var(--fascist-deep); color:var(--paper); border-color:var(--gold);">
      🎯 ${escapeHtml(state.players[state.markedForExecution])} è <strong>marcato per esecuzione</strong>.
    </div>` : '';

  const policyButtons = xl.communists ? `
    <div class="policy-controls-xl">
      <button class="btn liberal small" data-action="add-policy" data-type="liberal">+ Liberale</button>
      <button class="btn fascist small" data-action="add-policy" data-type="fascist">+ Fascista</button>
      <button class="btn communist small" data-action="add-policy" data-type="communist">+ Comunista</button>
    </div>` : `
    <div class="policy-controls">
      <button class="btn liberal small" data-action="add-policy" data-type="liberal">+ Liberale</button>
      <button class="btn fascist small" data-action="add-policy" data-type="fascist">+ Fascista</button>
    </div>`;

  const antiButtons = xl.antiPolicies ? `
    <div class="section-label" style="margin-top:14px;">⚖ Anti-Policies</div>
    <div class="policy-controls-anti">
      ${xl.communists ? `<button class="btn fascist small" data-action="add-policy" data-type="anti-communist">Anti-Com →F</button>` : ''}
      ${xl.communists ? `<button class="btn communist small" data-action="add-policy" data-type="anti-fascist">Anti-Fas →C</button>` : ''}
      <button class="btn liberal small" data-action="add-policy" data-type="social-dem">Social-Dem →L</button>
    </div>` : '';

  const anarchistButton = (xl.anarchist && !xl.communists) ? `
    <div class="section-label" style="margin-top:14px;">Ⓐ Anarchica</div>
    <button class="btn anarchist small" data-action="add-policy" data-type="anarchist">+ Politica Anarchica (via tracker)</button>` : '';

  const emergencyPanel = xl.emergencyPowers ? renderEmergencyPanel() : '';

  return `
    <div class="board liberal-board">
      <div class="board-title">★ Politiche Liberali ★</div>
      <div class="policy-track" style="grid-template-columns: repeat(${libSlots}, 1fr);">${liberalSlots}</div>
    </div>
    <div class="board fascist-board">
      <div class="board-title">☠ Politiche Fasciste ☠</div>
      <div class="policy-track">${fascistSlots}</div>
    </div>
    ${communistBoard}
    ${fascistHint}${communistHint}${communistDeckHint}${hitlerWinHint}${markedHint}
    <div class="deck-counter">Mazzo ${state.policyDeck.length} · Scarti ${state.discardPile.length}</div>
    ${policyButtons}${antiButtons}${anarchistButton}
    <div class="counter-row">
      <div class="label">Election Tracker</div>
      <div class="controls">
        <div class="tracker-pips">${pips}</div>
        <button data-action="tracker" data-dir="-1">−</button>
        <button data-action="tracker" data-dir="1">+</button>
      </div>
    </div>
    <div class="info-card" style="text-align:left; font-size:12px;">
      Tracker a 3 = la prossima politica in cima al mazzo viene rivelata e applicata. Il tracker si azzera quando passa una legge.
    </div>
    ${emergencyPanel}
    <button class="btn ghost small" data-action="undo-policy">↶ Annulla ultima politica</button>
    ${xl.communists || state.fascistPolicies >= 1
      ? '<button class="btn ghost small" data-action="show-execution" style="margin-top:6px;">⚰ Gestisci esecuzioni / morti</button>'
      : ''}`;
}

function renderEmergencyPanel() {
  const a48 = state.emergencyArticle48;
  const ena = state.emergencyEnabling;
  if (a48 === 0 && ena === 0) return '';
  return `
    <div class="emergency-panel">
      <h4>⚡ EMERGENCY POWERS</h4>
      <div style="font-size:11px; opacity:0.7;">Restano: ${a48} Article 48 · ${ena} Enabling Act</div>
      <div class="emergency-grid">
        ${a48 > 0 ? `
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="propaganda">A48 · Propaganda</div>
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="policy-peek">A48 · Policy Peek</div>
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="impeachment">A48 · Impeachment</div>
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="marked">A48 · Marked for Exec</div>
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="execution">A48 · Execution</div>
          <div class="emergency-pill" data-action="emergency" data-type="article48" data-power="pardon">A48 · Pardon</div>` : ''}
        ${ena > 0 ? `
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="propaganda">EA · Propaganda</div>
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="policy-peek">EA · Policy Peek</div>
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="impeachment">EA · Impeachment</div>
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="marked">EA · Marked for Exec</div>
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="execution">EA · Execution</div>
          <div class="emergency-pill" data-action="emergency" data-type="enabling" data-power="no-confidence">EA · No Confidence</div>` : ''}
      </div>
    </div>`;
}

function renderGovernmentNomination() {
  const online = multiplayer.connected && multiplayer.gameStarted;
  if (online) {
    const presIdx  = state.president;
    const presName = presIdx !== null && presIdx !== undefined ? escapeHtml(state.players[presIdx]) : '—';
    if (multiplayer.playerIndex !== presIdx) {
      return `
        <div class="pass-screen" style="padding:36px 16px;">
          <h2>In attesa<span class="waiting-dots">…</span></h2>
          <div class="instruction" style="margin-top:16px;">Il Presidente <strong>${presName}</strong> sta nominando il Cancelliere.</div>
        </div>`;
    }
    const n        = state.players.length;
    const prevGovt = n <= 6
      ? [state.prevChancellor].filter(x => x !== null)
      : [state.prevPresident, state.prevChancellor].filter(x => x !== null);
    const candidates = state.players.map((p, i) => ({ p, i }))
      .filter(({ i }) => i !== presIdx && !state.executedPlayers.includes(i) && !prevGovt.includes(i));
    return `
      <div class="vote-setup">
        <h3>Sei il Presidente</h3>
        <div class="info-card" style="font-size:12px;">Nomina il tuo Cancelliere per aprire la votazione.</div>
        <div class="player-list">
          ${candidates.map(({ p, i }) => `<button class="btn ghost small" data-action="nominate-chancellor" data-idx="${i}" style="display:block; width:100%; margin-bottom:6px;">📜 ${escapeHtml(p)}</button>`).join('') || '<div class="info-card">Nessun candidato eleggibile.</div>'}
        </div>
      </div>`;
  }
  const alive = state.players.map((p, i) => ({ p, i })).filter(({ i }) => !state.executedPlayers.includes(i));
  const n         = state.players.length;
  const prevGovt  = n <= 6
    ? [state.prevChancellor].filter(x => x !== null)
    : [state.prevPresident, state.prevChancellor].filter(x => x !== null);
  const canConfirm = state.president !== null && state.chancellor !== null && state.president !== state.chancellor;
  const presName   = state.president  !== null ? escapeHtml(state.players[state.president])  : null;
  const cancName   = state.chancellor !== null ? escapeHtml(state.players[state.chancellor]) : null;
  const options    = (role) => alive.map(({ p, i }) => `
    <option value="${i}" ${i === state[role] ? 'selected' : ''}>
      ${escapeHtml(p)}${prevGovt.includes(i) ? ' ⚑' : ''}
    </option>`).join('');

  return `
    <div class="vote-setup">
      <h3>Nomina del Governo</h3>
      <div class="info-card" style="font-size:11px; text-align:left; margin-bottom:12px;">
        ⚑ = Non eleggibile (mandato precedente). Con ${n <= 6 ? '5–6' : '7+'} giocatori
        ${n <= 6 ? 'solo il Cancelliere precedente è ineleggibile' : 'sia Presidente che Cancelliere precedenti sono ineleggibili'}.
      </div>
      <div class="role-pick">
        <label>👑 PRESIDENTE</label>
        <select data-action="set-role" data-role="president">
          <option value="">— Seleziona —</option>${options('president')}
        </select>
      </div>
      <div class="role-pick" style="margin-top:10px;">
        <label>📜 CANCELLIERE</label>
        <select data-action="set-role" data-role="chancellor">
          <option value="">— Seleziona —</option>${options('chancellor')}
        </select>
      </div>
      ${canConfirm ? `
        <div class="govt-nomination-banner">
          <div class="govt-role-badge president-badge"><span class="badge-title">PRESIDENTE</span>${presName}</div>
          <div class="govt-role-badge chancellor-badge"><span class="badge-title">CANCELLIERE</span>${cancName}</div>
        </div>
        <button class="btn fascist" data-action="confirm-government" style="margin-top:4px;">
          ✦ Proclama Governo — Apri Votazione ✦
        </button>` : `
        <button class="btn" style="margin-top:14px;" disabled>Seleziona Presidente e Cancelliere</button>`}
    </div>`;
}

function renderVote() {
  const online = multiplayer.connected && multiplayer.gameStarted;

  const govHeader = (state.president !== null && state.chancellor !== null) ? `
    <div class="govt-vote-header">
      <div class="govt-vote-role">
        <span class="govt-vote-role-title">PRESIDENTE</span>
        <span class="govt-vote-role-name">${escapeHtml(state.players[state.president])}</span>
      </div>
      <div class="govt-vote-role">
        <span class="govt-vote-role-title">CANCELLIERE</span>
        <span class="govt-vote-role-name">${escapeHtml(state.players[state.chancellor])}</span>
      </div>
    </div>` : '';

  if (online) {
    if (!state.governmentConfirmed) return renderGovernmentNomination();

    // Result: host computes from full votes; guests use broadcast tally.
    let result = null;
    if (multiplayer.isHost) {
      const ja    = Object.values(state.votes).filter(v => v === 'ja').length;
      const nein  = Object.values(state.votes).filter(v => v === 'nein').length;
      const alive = state.players.length - state.executedPlayers.length;
      if (alive > 0 && ja + nein === alive) result = { ja, nein, passed: ja > nein };
    } else {
      result = multiplayer.voteResult;
    }

    if (result) {
      const amPresident = multiplayer.playerIndex === state.president;
      return `${govHeader}
        <div class="vote-tally">
          <div class="tally-box ja"><div class="num">${result.ja}</div><div class="lbl">JA!</div></div>
          <div class="tally-box nein"><div class="num">${result.nein}</div><div class="lbl">NEIN!</div></div>
        </div>
        <div class="vote-result ${result.passed ? 'pass' : 'fail'}">${result.passed ? '✓ ELEZIONE APPROVATA' : '✗ ELEZIONE RESPINTA'}</div>
        ${amPresident
          ? (result.passed
              ? '<button class="btn liberal" data-action="confirm-election">Conferma e Continua</button>'
              : '<button class="btn fascist" data-action="reject-election">Avanza Election Tracker</button>')
          : `<div class="info-card" style="font-size:12px;">Il Presidente <strong>${escapeHtml(state.players[state.president])}</strong> prosegue il turno.</div>`}`;
    }

    if (state.executedPlayers.includes(multiplayer.playerIndex)) {
      return `${govHeader}<div class="ballot-poster"><div class="ballot-seal">☠</div><div class="ballot-headline">ELIMINATO</div><p style="font-family:var(--typewriter);font-size:13px;margin-top:12px;">Non puoi votare.</p></div>`;
    }
    if (multiplayer.voteSubmitted) {
      return `${govHeader}<div class="ballot-poster"><div class="ballot-seal">✓</div><div class="ballot-headline">VOTO REGISTRATO</div><p style="font-family:var(--typewriter);font-size:13px;margin-top:12px;">Nascondi lo schermo e attendi gli altri.</p></div>`;
    }
    return `${govHeader}
      <div class="solo-vote-screen">
        <div class="ballot-poster">
          <div class="ballot-seal">✦</div>
          <div class="ballot-headline">VOLKSSTIMME</div>
          <div class="ballot-actions">
            <button class="btn liberal" data-action="cast-secret-vote" data-v="ja">JA!</button>
            <button class="btn fascist" data-action="cast-secret-vote" data-v="nein">NEIN!</button>
          </div>
        </div>
      </div>`;
  }

  if (!state.governmentConfirmed) return renderGovernmentNomination();

  const jaCount    = Object.values(state.votes).filter(v => v === 'ja').length;
  const neinCount  = Object.values(state.votes).filter(v => v === 'nein').length;
  const aliveCount = state.players.length - state.executedPlayers.length;
  const allVoted   = jaCount + neinCount === aliveCount;

  if (allVoted) {
    const passed = jaCount > neinCount;
    return `
      ${govHeader}
      <div class="vote-tally">
        <div class="tally-box ja"><div class="num">${jaCount}</div><div class="lbl">JA!</div></div>
        <div class="tally-box nein"><div class="num">${neinCount}</div><div class="lbl">NEIN!</div></div>
      </div>
      <div class="vote-result ${passed ? 'pass' : 'fail'}">
        ${passed ? '✓ ELEZIONE APPROVATA' : '✗ ELEZIONE RESPINTA'}
      </div>
      ${passed
        ? '<button class="btn liberal" data-action="confirm-election">Conferma e Continua</button>'
        : '<button class="btn fascist" data-action="reject-election">Avanza Election Tracker</button>'}`;
  }

  const leftToVote = aliveCount - jaCount - neinCount;
  const nextIdx = state.players.findIndex((_, i) => !state.executedPlayers.includes(i) && state.votes[i] === undefined);
  const progressCard = `
    <div class="info-card" style="font-size:12px;">
      Passa il telefono a ogni giocatore — ognuno vota in segreto.<br>
      <strong>${jaCount + neinCount}/${aliveCount}</strong> voti registrati · <strong>${leftToVote}</strong> mancanti
    </div>`;

  if (nextIdx < 0) return `${govHeader}${progressCard}`;

  if (state.currentVoterIdx !== nextIdx) {
    return `
      ${govHeader}
      ${progressCard}
      <div class="pass-screen">
        <h2>Passa il telefono a</h2>
        <div class="player-name">${escapeHtml(state.players[nextIdx])}</div>
      </div>
      <button class="btn liberal" data-action="confirm-voter" data-voter-idx="${nextIdx}">Sono ${escapeHtml(state.players[nextIdx])}</button>`;
  }

  return `
    ${govHeader}
    ${progressCard}
    <div class="solo-vote-screen">
      <div class="ballot-poster">
        <div class="ballot-seal">✦</div>
        <div class="ballot-headline">VOLKSSTIMME</div>
        <div class="ballot-actions">
          <button class="btn liberal" data-action="cast-secret-vote" data-v="ja">JA!</button>
          <button class="btn fascist" data-action="cast-secret-vote" data-v="nein">NEIN!</button>
        </div>
      </div>
    </div>`;
}

function renderPolicyCard(type, action = '', idx = 0, extraClass = '') {
  const meta = POLICY_META[type] || { label: String(type).toUpperCase(), symbol: '?' };
  return `<button class="digital-policy ${type} ${extraClass}" ${action ? `data-action="${action}" data-idx="${idx}"` : ''}>
    <span class="policy-symbol">${meta.symbol}</span><span>${meta.label}</span>
  </button>`;
}

function renderLegislativePass(role) {
  const isPresident = role === 'president';
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Riservato</h1><div class="subtitle">— Sessione Legislativa —</div></div>
      <div class="pass-screen">
        <h2>Passa il telefono al</h2>
        <div class="player-name">${isPresident ? 'PRESIDENTE' : 'CANCELLIERE'}</div>
      </div>
      <button class="btn ${isPresident ? 'fascist' : 'liberal'}" data-action="legislative-ready" data-role="${role}">Sono il ${isPresident ? 'Presidente' : 'Cancelliere'}</button>
    </div>`;
}

function renderLegislativePresident() {
  const isRoutedGuest = multiplayer.connected && multiplayer.gameStarted && !multiplayer.isHost && multiplayer.legislativeRole === 'president';
  const cards = isRoutedGuest ? (multiplayer.legislativeCards || []) : (state.legislative?.cards || []);
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Presidente</h1><div class="subtitle">— Scarta una politica —</div></div>
      <div class="policy-hand">${cards.map((type, i) => renderPolicyCard(type, 'president-discard', i)).join('')}</div>
      ${!isRoutedGuest ? `<div class="deck-counter">Mazzo ${state.policyDeck.length} · Scarti ${state.discardPile.length}</div>` : ''}
    </div>`;
}

function renderLegislativeChancellor() {
  const isRoutedGuest = multiplayer.connected && multiplayer.gameStarted && !multiplayer.isHost && multiplayer.legislativeRole === 'chancellor';
  const cards = isRoutedGuest ? (multiplayer.legislativeCards || []) : (state.legislative?.cards || []);
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Cancelliere</h1><div class="subtitle">— Promulga una politica —</div></div>
      <div class="policy-hand two">${cards.map((type, i) => renderPolicyCard(type, 'chancellor-enact', i)).join('')}</div>
      ${state.vetoUnlocked ? '<button class="btn ghost" data-action="request-veto">Richiedi Veto</button>' : ''}
      ${!isRoutedGuest ? `<div class="deck-counter">Mazzo ${state.policyDeck.length} · Scarti ${state.discardPile.length}</div>` : ''}
    </div>`;
}

function renderLegislativeVetoPresident() {
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Presidente</h1><div class="subtitle">— Richiesta di Veto —</div></div>
      <button class="btn fascist" data-action="approve-veto">Approva Veto</button>
      <button class="btn liberal" data-action="refuse-veto">Rifiuta Veto</button>
    </div>`;
}

function renderPolicyReveal() {
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Politica Scelta</h1></div>
      ${renderPolicyCard(state.revealedPolicy, '', 0, 'policy-reveal-card')}
      <button class="btn ghost" data-action="apply-revealed-policy">Applica al tracciato</button>
    </div>`;
}

function renderPostElectionChoice() {
  return `
    <div class="screen legislative-screen">
      <div class="title-stack"><h1>Governo Eletto</h1><div class="subtitle">— Mazzo Fisico —</div></div>
      <button class="btn fascist" data-action="physical-use-digital-draw">Pesca 3 dall'app</button>
      <button class="btn ghost" data-action="continue-physical-game">Continua senza scegliere</button>
    </div>`;
}

function renderHistory() {
  if (state.history.length === 0) {
    return '<div class="info-card">Nessun evento ancora registrato.<br>Le elezioni e le politiche compariranno qui.</div>';
  }
  return state.history.slice().reverse().map(h => {
    const cls = h.type === 'liberal' ? 'liberal-event'
      : (h.type === 'fascist' || h.type === 'fascist-power') ? 'fascist-event'
      : (h.type === 'communist' || h.type === 'communist-power') ? 'communist-event' : '';
    return `
      <div class="history-entry ${cls}">
        <div class="turn-num">TURNO ${h.turn}</div>
        <div class="turn-time">${h.time}</div>
        <div class="turn-body">${h.body}</div>
      </div>`;
  }).join('');
}

function renderEnd() {
  const result  = state.endResult;
  const winData = {
    liberal:    { title: 'Liberali Vincono',   icon: '★', flavor: 'La Repubblica di Weimar è salva.',         cls: 'liberal'    },
    fascist:    { title: 'Fascisti Vincono',   icon: '☠', flavor: 'Il Terzo Reich avanza nell\'ombra.',         cls: 'fascist'    },
    communist:  { title: 'Comunisti Vincono',  icon: '☭', flavor: 'La rivoluzione è arrivata.',                cls: 'communist'  },
    capitalist: { title: 'Capitalista Vince',  icon: '💰', flavor: 'Il capitale ha resistito alla tempesta.',  cls: 'capitalist' },
    anarchist:  { title: 'Anarchico Vince',    icon: 'Ⓐ', flavor: 'Il caos ha trionfato sulla struttura.',     cls: 'anarchist'  },
    monarchist: { title: 'Monarchico Vince',   icon: '♛', flavor: 'L\'antico ordine è ristabilito.',           cls: 'monarchist' },
  };
  const w = winData[result] || winData.liberal;
  const roleLabel = { liberal: 'LIBERALE', fascist: 'FASCISTA', hitler: 'HITLER', communist: 'COMUNISTA', capitalist: 'CAPITALISTA', anarchist: 'ANARCHICO', monarchist: 'MONARCHICO' };
  const roleColor = { liberal: 'var(--liberal-dark)', fascist: 'var(--fascist-dark)', hitler: '#1a0a08', communist: 'var(--communist-dark)', capitalist: '#1a3a25', anarchist: '#000', monarchist: '#2a1538' };

  return `
    <div class="screen end-reveal">
      <div class="title-stack">
        <h1>${w.title}</h1>
        <div class="subtitle">— ${state.endReason || 'Fine della partita'} —</div>
      </div>
      <div class="role-card ${w.cls}">
        <div class="role-name">${w.icon} ${w.title.toUpperCase()} ${w.icon}</div>
        <div class="role-desc">${w.flavor}</div>
      </div>
      <div class="section-label">Ruoli Rivelati</div>
      <div class="player-list">
        ${state.players.map((p, i) => {
          const r    = state.roles[i].role;
          const dead = state.executedPlayers.includes(i);
          return `
            <div class="player-item" ${dead ? 'style="opacity:0.55;"' : ''}>
              <div class="num" style="background:${roleColor[r]}">${i + 1}</div>
              <div class="name">${escapeHtml(p)}${dead ? ' ⚰' : ''}</div>
              <div style="font-family:var(--display); font-size:12px; color:${roleColor[r]};">${roleLabel[r]}</div>
            </div>`;
        }).join('')}
      </div>
      <button class="btn fascist" data-action="new-game">Nuova Partita</button>
      <button class="btn ghost" data-action="home">Home</button>
    </div>`;
}
