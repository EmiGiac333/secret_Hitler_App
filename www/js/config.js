// ============================================================
// SECRET HITLER — COMPANION PWA
// config.js — Constants, configuration, utilities
// ============================================================

const PLAYER_CONFIG = {
  5:  { fascists: 1, hitlerKnows: true,  powers: [null, null, 'examine', 'kill', 'kill+veto'] },
  6:  { fascists: 1, hitlerKnows: true,  powers: [null, null, 'examine', 'kill', 'kill+veto'] },
  7:  { fascists: 2, hitlerKnows: false, powers: [null, 'investigate', 'special_election', 'kill', 'kill+veto'] },
  8:  { fascists: 2, hitlerKnows: false, powers: [null, 'investigate', 'special_election', 'kill', 'kill+veto'] },
  9:  { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  10: { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  11: { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  12: { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  13: { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  14: { fascists: 3, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  15: { fascists: 4, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  16: { fascists: 4, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  17: { fascists: 4, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  18: { fascists: 5, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  19: { fascists: 5, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
  20: { fascists: 5, hitlerKnows: false, powers: ['investigate', 'investigate', 'special_election', 'kill', 'kill+veto'] },
};

const COMMUNIST_COUNT = {
  5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2, 13: 3,
  14: 3, 15: 3, 16: 4, 17: 4, 18: 4, 19: 4, 20: 5
};

function getCommunistTrack(n, shortMode) {
  if (n === 5) return { slots: 6, powers: ['bugging', 'radicalisation', 'five-year', 'congress', 'confession', null] };
  if (shortMode) return { slots: 3, powers: [null, 'confession', 'radicalisation'] };
  if (n <= 8)  return { slots: 5, powers: ['bugging', 'radicalisation', 'five-year', 'congress', null] };
  if (n <= 10) return { slots: 6, powers: ['bugging', 'radicalisation', 'five-year', 'congress', 'confession', null] };
  return { slots: 6, powers: [null, 'radicalisation', 'five-year', 'radicalisation', 'confession', null] };
}

const POWER_LABELS = {
  investigate: 'INDAGA',
  special_election: 'ELEZ. STR.',
  examine: 'ESAMINA 3',
  kill: 'ESECUZIONE',
  'kill+veto': 'ESEC. + VETO',
  bugging: 'BUGGING',
  radicalisation: 'RADICALIZZA',
  'five-year': 'PIANO 5 ANNI',
  congress: 'CONGRESSO',
  confession: 'CONFESSIONE',
};

const POWER_DESCRIPTIONS = {
  investigate: 'Il Presidente esamina la tessera Affiliazione di un altro giocatore',
  special_election: 'Il Presidente nomina il prossimo Presidente',
  examine: 'Il Presidente esamina in segreto le prossime 3 carte politica',
  kill: 'Il Presidente esegue (uccide) un altro giocatore',
  'kill+veto': 'Esecuzione + da ora i poteri di Veto sono attivi',
  bugging: 'I Comunisti guardano insieme la tessera Affiliazione di un giocatore',
  radicalisation: 'I Comunisti scambiano la tessera di un giocatore con una comunista (non Hitler / Capitalista)',
  'five-year': 'Aggiungi 2 politiche comuniste e 1 liberale al mazzo, poi rimescola',
  congress: 'I nuovi Comunisti scoprono chi sono i Comunisti originari',
  confession: 'Il Presidente in carica rivela a tutti la sua tessera Affiliazione',
};

const POWER_SCRIPTS = {
  bugging: [
    'Tutti prendono la tessera Affiliazione e la mettono coperta davanti a sé.',
    'Tutti chiudono gli occhi.',
    'Comunisti aprono gli occhi.',
    'Insieme guardano la tessera di UN giocatore.',
    '[Pausa lunga]',
    'Comunisti chiudono gli occhi.',
    'Tutti muovono leggermente la propria tessera.',
    'Tutti aprono gli occhi.',
  ],
  radicalisation: [
    'Tutti prendono la tessera Affiliazione e la mettono coperta davanti a sé.',
    'Tutti chiudono gli occhi.',
    'Comunisti aprono gli occhi.',
    'Scambiano la tessera di un giocatore con una tessera Comunista. La vecchia va al centro del tavolo.',
    '[Pausa lunga]',
    'Comunisti chiudono gli occhi.',
    'Hitler apre gli occhi. Se la sua tessera è stata scambiata, la riscambia. Hitler NON diventa mai Comunista.',
    'Hitler chiude gli occhi.',
    'Capitalista (se in gioco) apre gli occhi. Se la sua tessera è stata scambiata, la riscambia.',
    'Capitalista chiude gli occhi.',
    'Tutti muovono leggermente la propria tessera.',
    'Tutti aprono gli occhi e controllano: se la tessera è stata scambiata, ora sono Comunisti.',
  ],
  'five-year': [
    'Aggiungi 2 politiche Comuniste e 1 Liberale al mazzo da pescare.',
    'Rimescola il mazzo.',
  ],
  congress: [
    'Tutti chiudono gli occhi.',
    'Comunisti aprono gli occhi.',
    'I Comunisti si riconoscono fra loro (compresi quelli appena radicalizzati).',
    'Comunisti chiudono gli occhi.',
    'Tutti aprono gli occhi.',
  ],
  confession: [
    'Il Presidente in carica rivela a tutti la propria tessera Affiliazione (Liberale, Fascista o Comunista).',
  ],
};

const POLICY_META = {
  liberal:          { label: 'LIBERALE',          symbol: '🕊️' },
  fascist:          { label: 'FASCISTA',           symbol: '☠️' },
  communist:        { label: 'COMUNISTA',          symbol: '☭' },
  anarchist:        { label: 'ANARCHICA',          symbol: 'Ⓐ' },
  'anti-fascist':   { label: 'ANTI-FASCISTA',      symbol: '−F' },
  'anti-communist': { label: 'ANTI-COMUNISTA',     symbol: '−C' },
  'social-dem':     { label: 'SOCIAL-DEMOCRATICA', symbol: 'SD' },
};

// ===== DOM UTILITIES =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
