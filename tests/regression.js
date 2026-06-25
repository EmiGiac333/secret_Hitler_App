const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const queriedSelectors = [];
let lastModal = null;

function element() {
  return {
    innerHTML: '',
    dataset: {},
    style: {},
    listeners: {},
    removed: false,
    addEventListener(type, handler) { this.listeners[type] = handler; },
    appendChild() {},
    focus() {},
    setPointerCapture() {},
    remove() { this.removed = true; },
  };
}

const app = element();
const storage = new Map();
const document = {
  body: { appendChild(node) { lastModal = node; } },
  querySelector(selector) {
    if (selector === '#app') return app;
    return null;
  },
  querySelectorAll(selector) { queriedSelectors.push(selector); return []; },
  createElement() { return element(); },
  addEventListener() {},
};

const context = {
  console,
  document,
  navigator: {},
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); },
  },
  alert() {},
  confirm() { return true; },
  setInterval,
  clearInterval,
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(`${script}\n;globalThis.__app = { state, renderVote, handleAction, applyPolicy, partyMembership, castNextSecretVote, showFascistPowerModal, showCommunistPowerModal, getCommunistTrack, assignRoles, buildPolicyDeck, initializePolicyDeck, beginLegislativeSession, drawPolicyCards, publicGameSnapshot, privateRoleInfo };`, context);

const api = context.__app;
const state = api.state;
state.players = ['Anna', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio'];
state.roles = {
  0: { role: 'liberal' },
  1: { role: 'fascist' },
  2: { role: 'hitler' },
  3: { role: 'communist' },
  4: { role: 'capitalist' },
  5: { role: 'liberal' },
};
state.executedPlayers = [];

function clickModal(dataset) {
  const button = { dataset, closest() { return this; } };
  lastModal.listeners.click({ target: button });
}

assert(queriedSelectors.includes('[data-action]:not(select)'), 'i menu select non devono ricevere il click generico');
assert.match(html, /\.player-list \.btn\.ghost\s*\{[\s\S]*?background: var\(--ink\);[\s\S]*?color: var\(--paper\);/, 'i nomi nei selettori devono avere contrasto visibile');
assert.match(api.renderVote(), /data-action="cast-secret-vote" data-v="ja"/);
assert.match(api.renderVote(), /data-action="cast-secret-vote" data-v="nein"/);
assert.match(api.renderVote(), /ballot-poster/);
assert.doesNotMatch(api.renderVote(), /swipe|scroll|scorri/i);
assert.doesNotMatch(api.renderVote(), /Anna|Voto Segreto|Pulisci Voti|Tocca|passa il telefono/i);
assert.doesNotMatch(api.renderVote(), /PRESIDENTE|CANCELLIERE/);
assert.doesNotMatch(api.renderVote(), /tally-box/);

for (let i = 0; i < state.players.length; i++) {
  api.handleAction({ currentTarget: { dataset: { action: 'cast-secret-vote', v: i < 4 ? 'ja' : 'nein' } } });
  if (i < state.players.length - 1) assert.doesNotMatch(api.renderVote(), /tally-box/);
}
assert.match(api.renderVote(), /ELEZIONE APPROVATA/);
assert.equal(Object.keys(state.votes).length, 6);

state.useDigitalPolicyDeck = false;
state.policyDeck = ['liberal', 'fascist', 'communist'];
const turnBeforePhysicalSkip = state.turn;
api.handleAction({ currentTarget: { dataset: { action: 'confirm-election' } } });
assert.equal(state.screen, 'post-election-choice');
assert.equal(state.policyDeck.length, 3);
api.handleAction({ currentTarget: { dataset: { action: 'continue-physical-game' } } });
assert.equal(state.screen, 'game');
assert.equal(state.turn, turnBeforePhysicalSkip + 1);
assert.equal(state.policyDeck.length, 3, 'il mazzo interno non cambia usando quello fisico');

state.xl.communists = true;
state.policyDeck = ['liberal', 'fascist', 'communist'];
state.discardPile = [];
assert.equal(api.beginLegislativeSession(), true);
assert.equal(state.screen, 'legislative-pass-president');
assert.deepEqual([...state.legislative.cards], ['communist', 'fascist', 'liberal']);
api.handleAction({ currentTarget: { dataset: { action: 'legislative-ready', role: 'president' } } });
api.handleAction({ currentTarget: { dataset: { action: 'president-discard', idx: '1' } } });
assert.equal(state.screen, 'legislative-pass-chancellor');
assert.deepEqual([...state.discardPile], ['fascist']);
api.handleAction({ currentTarget: { dataset: { action: 'legislative-ready', role: 'chancellor' } } });
api.handleAction({ currentTarget: { dataset: { action: 'chancellor-enact', idx: '0' } } });
assert.equal(state.revealedPolicy, 'communist');
assert.match(app.innerHTML, /COMUNISTA/);
assert.doesNotMatch(app.innerHTML, /LIBERALE|FASCISTA/);
assert.deepEqual([...state.discardPile], ['fascist', 'liberal']);
api.handleAction({ currentTarget: { dataset: { action: 'apply-revealed-policy' } } });
assert.equal(state.communistPolicies, 1);

state.policyDeck = ['fascist'];
state.discardPile = ['liberal', 'communist', 'fascist'];
assert.equal(api.drawPolicyCards(3).length, 3);
assert.equal(state.policyDeck.length, 1);
assert.equal(state.discardPile.length, 0);

state.vetoUnlocked = true;
state.legislative = { cards: ['liberal', 'fascist'] };
state.electionTracker = 0;
api.handleAction({ currentTarget: { dataset: { action: 'request-veto' } } });
assert.equal(state.screen, 'legislative-veto-president');
api.handleAction({ currentTarget: { dataset: { action: 'approve-veto' } } });
assert.equal(state.legislative, null);
assert.equal(state.electionTracker, 1);
assert.equal(state.tab, 'vote');

state.fascistPolicies = 2;
state.pendingFascistPower = null;
state.revealedPolicy = 'fascist';
state.revealedPolicySource = 'chaos';
api.handleAction({ currentTarget: { dataset: { action: 'apply-revealed-policy' } } });
assert.equal(state.fascistPolicies, 3);
assert.equal(state.pendingFascistPower, null, 'il chaos non deve attivare poteri presidenziali');

state.communistPolicies = 0;
state.president = 0;
api.applyPolicy('communist');
assert.equal(state.pendingCommunistPower, 'bugging');
assert.equal(state.pendingCommunistPresident, 0);
assert.equal(api.partyMembership('hitler').label, 'FASCISTA');
assert.equal(api.partyMembership('capitalist').label, 'LIBERALE');

api.showCommunistPowerModal('bugging');
assert.match(lastModal.innerHTML, /Modalita privata/);
clickModal({ cp: 'private-ready' });
assert.match(lastModal.innerHTML, /Scegliete insieme/);
clickModal({ cp: 'bug-target', idx: '2' });
assert.match(lastModal.innerHTML, /FASCISTA/);
clickModal({ cp: 'finish-bugging' });
assert.equal(state.pendingCommunistPower, null);
assert.equal(state.history.at(-1).type, 'communist-power');

state.pendingCommunistPower = 'radicalisation';
api.showCommunistPowerModal('radicalisation');
clickModal({ cp: 'private-ready' });
assert.match(lastModal.innerHTML, /Carla/, 'Hitler deve comparire nella lista radicalizzazione senza rivelare il ruolo');
clickModal({ cp: 'rad-target', idx: '2' });
assert.equal(state.roles[2].role, 'hitler', 'scegliere Hitler non deve convertirlo ne rivelarlo');
assert.equal(state.screen, 'pass-reveal');
assert.equal(state.roleRefreshInProgress, true);
state.roleRefreshInProgress = false;
state.screen = 'game';
state.pendingCommunistPower = 'radicalisation';
api.showCommunistPowerModal('radicalisation');
clickModal({ cp: 'private-ready' });
clickModal({ cp: 'rad-target', idx: '5' });
assert.doesNotMatch(lastModal.innerHTML, /ORA SEI COMUNISTA|Messaggio privato|Telefono consegnato/);
const turnBeforeRoleRefresh = state.turn;
assert.equal(state.roles[5].role, 'communist');
assert.equal(state.screen, 'pass-reveal');
assert.equal(state.roleRefreshInProgress, true);
for (let i = 0; i < state.players.length; i++) {
  assert.equal(state.reveal.idx, i);
  api.handleAction({ currentTarget: { dataset: { action: 'show-role' } } });
  assert.equal(state.screen, 'role-reveal');
  api.handleAction({ currentTarget: { dataset: { action: 'hide-role' } } });
}
assert.equal(state.screen, 'game');
assert.equal(state.roleRefreshInProgress, false);
assert.equal(state.turn, turnBeforeRoleRefresh, 'la nuova rivelazione non deve azzerare il turno');

state.pendingCommunistPower = 'congress';
api.showCommunistPowerModal('congress');
clickModal({ cp: 'private-ready' });
assert.match(lastModal.innerHTML, /Diego/);
assert.match(lastModal.innerHTML, /Fabio/);
clickModal({ cp: 'finish-congress' });

state.pendingCommunistPower = 'confession';
state.pendingCommunistPresident = 2;
api.showCommunistPowerModal('confession');
assert.match(lastModal.innerHTML, /FASCISTA/);
clickModal({ cp: 'finish-confession' });

state.pendingCommunistPower = 'five-year';
api.showCommunistPowerModal('five-year');
clickModal({ cp: 'finish-five-year' });
assert.deepEqual({ ...state.communistDeckAdditions }, { communist: 2, liberal: 1 });

state.executedPlayers = [];
state.pendingFascistPower = 'investigate';
api.showFascistPowerModal('investigate');
clickModal({ fp: 'private-ready' });
assert.match(lastModal.innerHTML, /Carla/);
clickModal({ fp: 'investigate', idx: '2' });
assert.match(lastModal.innerHTML, /FASCISTA/);
clickModal({ fp: 'finish-investigate' });
assert.equal(state.pendingFascistPower, null);

state.pendingFascistPower = 'special_election';
api.showFascistPowerModal('special_election');
clickModal({ fp: 'special-president', idx: '1' });
assert.match(state.history.at(-1).body, /Bruno/);

state.pendingFascistPower = 'examine';
state.policyDeck = ['liberal', 'fascist', 'communist'];
api.showFascistPowerModal('examine');
clickModal({ fp: 'private-ready' });
assert.match(lastModal.innerHTML, /LIBERALE/);
assert.match(lastModal.innerHTML, /FASCISTA/);
assert.match(lastModal.innerHTML, /COMUNISTA/);
clickModal({ fp: 'finish-examine' });

state.pendingFascistPower = 'kill';
api.showFascistPowerModal('kill');
clickModal({ execIdx: '0' });
assert(state.executedPlayers.includes(0));
assert.equal(state.pendingFascistPower, null);

state.pendingFascistPower = 'kill+veto';
api.showFascistPowerModal('kill+veto');
clickModal({ execIdx: '1' });
assert(state.executedPlayers.includes(1));
assert.equal(state.vetoUnlocked, true);
assert.equal(state.pendingFascistPower, null);

state.players = ['A', 'B', 'C', 'D', 'E', 'F'];
state.xl = { communists: false, capitalist: false, anarchist: false, monarchist: false, antiPolicies: false, socialDem: false, emergencyPowers: false, liberalTrackerLong: false, communistShort: false };
let composedDeck = api.buildPolicyDeck();
assert.equal(composedDeck.filter(type => type === 'fascist').length, 11);
assert.equal(composedDeck.filter(type => type === 'liberal').length, 6);

state.players = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
state.xl.communists = true;
composedDeck = api.buildPolicyDeck();
assert.equal(composedDeck.filter(type => type === 'fascist').length, 9);
assert.equal(composedDeck.filter(type => type === 'communist').length, 8);
assert.equal(composedDeck.filter(type => type === 'liberal').length, 6);

state.players.push('I');
state.xl.communistShort = true;
composedDeck = api.buildPolicyDeck();
assert.equal(composedDeck.filter(type => type === 'fascist').length, 10);
assert.equal(composedDeck.filter(type => type === 'communist').length, 6);
assert.equal(composedDeck.filter(type => type === 'liberal').length, 4);

state.players = ['A', 'B', 'C', 'D', 'E'];
state.xl = { communists: true, capitalist: false, anarchist: false, monarchist: false, antiPolicies: false, socialDem: false, emergencyPowers: false, liberalTrackerLong: false, communistShort: false };
api.assignRoles();
const roleCounts = Object.values(state.roles).reduce((counts, entry) => {
  counts[entry.role] = (counts[entry.role] || 0) + 1;
  return counts;
}, {});
assert.deepEqual({ ...roleCounts }, { hitler: 1, communist: 1, fascist: 1, liberal: 2 });
assert.deepEqual([...api.getCommunistTrack(5, false).powers], ['bugging', 'radicalisation', 'five-year', 'congress', 'confession', null]);
const fivePlayerDeck = api.buildPolicyDeck();
assert.equal(fivePlayerDeck.filter(type => type === 'fascist').length, 7);
assert.equal(fivePlayerDeck.filter(type => type === 'communist').length, 6);
assert.equal(fivePlayerDeck.filter(type => type === 'liberal').length, 6);
assert.equal(fivePlayerDeck.length, 19);

state.policyDeck = ['fascist', 'liberal', 'communist'];
state.votes = { 0: 'ja' };
const publicSnapshot = api.publicGameSnapshot();
assert.equal(publicSnapshot.roles, undefined, 'i ruoli non devono essere trasmessi pubblicamente');
assert.equal(publicSnapshot.votes, undefined, 'i voti individuali non devono essere trasmessi pubblicamente');
assert.equal(publicSnapshot.policyDeck, undefined, 'le carte del mazzo non devono essere trasmesse pubblicamente');
assert.equal(publicSnapshot.policyDeckCount, 3);
assert.equal(api.privateRoleInfo(0).role, state.roles[0].role);

console.log('Regressioni voto, mazzo e poteri: OK');
