// "Save this trip" and "Share" on the planner.
// - Save keeps the trip (starting point, stops and days) in your account,
//   and "Open" on the account page brings it back here with the route planned.
// - Share sends a link. Whoever opens it (and signs in) joins the trip, and
//   then you can both change it. When you save, any changes your partner
//   saved in the meantime are kept too, and when they change it while you
//   have it open, a note offers to show their changes.
// Signed out? The trip, or the invite, is held on this device while you sign in.
// The account system only loads when it's needed, so the planner stays quick.
import { tripState } from './state-and-data.js';
import { showStatus, hideStatus } from './Map.js';

const SIGN_IN_KEY = 'lovinglylost-auth'; // same name as in account/supabase-client.js
const WAITING_KEY = 'lovinglylost-waiting-trip';
const JOIN_KEY = 'lovinglylost-join-code'; // same name as in account/account-trips.js
const WAITING_HOURS = 24; // how long a trip or invite is held while someone signs in
const CHECK_EVERY_MS = 60 * 1000; // how often to look for a partner's changes
const PHONE_QUERY = window.matchMedia('(max-width: 860px)');
const METERS_PER_MILE = 1609.34;
const SHARE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>';

let saveBtn = null;
let shareBtn = null;
let openTripInPlanner = null; // given by Main-Launch.js
// Once this trip is in an account: its id, name and share code, plus the
// trip as it was last saved (base) and when (updatedAt).
let saved = null;

function isSignedIn(){
	try { return Boolean(localStorage.getItem(SIGN_IN_KEY)); } catch (err){ return false; }
}

function savedTrips(){
	return import('../account/saved-trips.js');
}

// ---- The trip as it gets saved ----
function currentTrip(){
	const route = tripState.route;
	return {
		origin: { name: tripState.origin.name, lng: tripState.origin.lng, lat: tripState.origin.lat },
		stops: tripState.stops
			.filter(stop => stop.lng !== null)
			.map(stop => ({ name: stop.name, lng: stop.lng, lat: stop.lat })),
		days: tripState.days,
		multiDay: tripState.multiDay,
		findRomanticStops: tripState.findRomanticStops,
		miles: route ? Math.round(route.distanceMeters / METERS_PER_MILE) : null,
		hours: route ? Math.round(route.durationSeconds / 360) / 10 : null
	};
}

// The same place has the same id, however it got into the trip.
function placeId(place){
	return `${Number(place.lng).toFixed(5)},${Number(place.lat).toFixed(5)}`;
}

// A short fingerprint of a trip's places and days, to tell if it changed.
function keyOf(trip){
	if (!trip || !trip.origin) return '';
	return JSON.stringify([placeId(trip.origin), (trip.stops || []).map(placeId), Number(trip.days) || 1, Boolean(trip.multiDay)]);
}

function tripKey(){
	return tripState.origin ? keyOf(currentTrip()) : '';
}

// Puts two people's changes together.
// base: the trip as it was when you opened it (or last saved it)
// mine: the trip as it is on your screen now
// theirs: the trip as your partner has since saved it
// Stops you added are kept (after the stop they followed for you), stops
// you removed stay removed, and everything your partner did is kept too.
export function mergeTrips(base, mine, theirs){
	const baseIds = new Set(base.stops.map(placeId));
	const mineIds = new Set(mine.stops.map(placeId));
	const removedByMe = new Set([...baseIds].filter(id => !mineIds.has(id)));

	const stops = theirs.stops.filter(stop => !removedByMe.has(placeId(stop)));
	const ids = () => stops.map(placeId);
	mine.stops.forEach((stop, i) => {
		const id = placeId(stop);
		if (baseIds.has(id) || ids().includes(id)) return; // not new, or they added it too
		let at = 0;
		for (let j = i - 1; j >= 0; j--){
			const k = ids().indexOf(placeId(mine.stops[j]));
			if (k !== -1){
				at = k + 1;
				break;
			}
		}
		stops.splice(at, 0, stop);
	});

	const changedByMe = field => JSON.stringify(base[field]) !== JSON.stringify(mine[field]);
	return {
		origin: placeId(base.origin) !== placeId(mine.origin) ? mine.origin : theirs.origin,
		stops,
		days: changedByMe('days') ? mine.days : theirs.days,
		multiDay: changedByMe('multiDay') ? mine.multiDay : theirs.multiDay,
		findRomanticStops: mine.findRomanticStops,
		miles: null,
		hours: null
	};
}

function remember(row){
	saved = { id: row.id, name: row.name, shareCode: row.share_code, base: row.trip, updatedAt: row.updated_at };
}

// "Asheville to Boone", from "Asheville, North Carolina, United States".
function suggestedName(){
	const short = name => String(name || '').split(',')[0].trim();
	const stops = tripState.stops.filter(stop => stop.lng !== null);
	const last = stops[stops.length - 1];
	return `${short(tripState.origin.name)} to ${short(last && last.name)}`;
}

// ---- The buttons ----
// On a computer they sit under Start Drive; on a phone they join Start
// Drive and Edit Trip in the pull-up panel.
function placeButtons(){
	const startDriveBtn = document.getElementById('startDriveBtn');
	const editTripBtn = document.getElementById('editTripBtn');
	if (PHONE_QUERY.matches && editTripBtn){
		editTripBtn.before(saveBtn, shareBtn);
	} else if (startDriveBtn){
		startDriveBtn.after(saveBtn, shareBtn);
	}
	updateSaveTripButton();
}

// Called by Main-Launch.js whenever the route changes.
export function updateSaveTripButton(){
	if (!saveBtn) return;
	const phone = PHONE_QUERY.matches;
	saveBtn.disabled = !tripState.route;
	shareBtn.disabled = !tripState.route;

	const upToDate = Boolean(saved && tripState.route && keyOf(saved.base) === tripKey());
	saveBtn.classList.toggle('is-saved', upToDate);
	if (upToDate) saveBtn.textContent = phone ? '♥ Saved' : '♥ Trip saved';
	else if (saved) saveBtn.textContent = phone ? '♡ Save' : '♡ Save changes';
	else saveBtn.textContent = phone ? '♡ Save' : '♡ Save this trip';

	shareBtn.innerHTML = SHARE_ICON + (phone ? '' : '<span>Plan it together</span>');
	shareBtn.setAttribute('aria-label', 'Share this trip to plan it together');
}

function flashStatus(text, ms = 4000){
	showStatus(text);
	setTimeout(hideStatus, ms);
}

// ---- The cards that pop up ----
function make(tag, className, text){
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;
	return el;
}

function openCard(label, build){
	const backdrop = make('div', 'trip-card-backdrop');
	const card = make('div', 'trip-card');
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-modal', 'true');
	card.setAttribute('aria-label', label);
	backdrop.appendChild(card);

	function close(){
		document.removeEventListener('keydown', onKey);
		backdrop.classList.remove('is-open');
		setTimeout(() => backdrop.remove(), 250);
	}
	function onKey(e){
		if (e.key === 'Escape') close();
	}
	backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
	document.addEventListener('keydown', onKey);

	build(card, close);
	document.body.appendChild(backdrop);
	requestAnimationFrame(() => backdrop.classList.add('is-open'));
	const first = card.querySelector('input, a, button');
	if (first) first.focus({ preventScroll: true });
}

// Sign in / Create account / Not now. onLeave runs when they head off to sign in.
function signInActions(card, close, onLeave){
	const actions = make('div', 'trip-card-actions');
	const signIn = make('a', 'trip-card-btn', 'Sign in');
	signIn.href = 'login.html';
	const create = make('a', 'trip-card-btn is-secondary', 'Create account');
	create.href = 'login.html?mode=signup';
	const later = make('button', 'trip-card-link', 'Not now');
	later.type = 'button';
	later.addEventListener('click', close);
	[signIn, create].forEach(link => link.addEventListener('click', onLeave));
	actions.append(signIn, create, later);
	card.appendChild(actions);
}

// Signed out: offer to sign in, and hold on to the trip meanwhile.
function showSignInCard(){
	openCard('Save this trip', (card, close) => {
		card.append(
			make('h2', 'trip-card-title', 'Save and share your trip'),
			make('p', 'trip-card-text', "Sign in or create a free account to keep this trip, plan it together with your partner, and open it on any phone or computer. We'll hold on to it here while you do.")
		);
		signInActions(card, close, holdTrip);
	});
}

// Signed in: ask for a name, then save. thenShare: share once it's saved.
function showSaveCard({ thenShare = false } = {}){
	openCard('Save this trip', (card, close) => {
		const form = make('form', 'trip-card-form');
		const label = make('label', 'trip-card-field');
		const input = make('input');
		input.type = 'text';
		input.maxLength = 80;
		input.required = true;
		input.value = saved ? saved.name : suggestedName();
		label.append(make('span', null, 'Trip name'), input);

		const message = make('p', 'trip-card-message');
		message.setAttribute('role', 'status');

		const actions = make('div', 'trip-card-actions');
		const saveButton = make('button', 'trip-card-btn', thenShare ? 'Save and share' : (saved ? 'Save changes' : 'Save trip'));
		saveButton.type = 'submit';
		actions.appendChild(saveButton);
		let asNewButton = null;
		if (saved && !thenShare){
			asNewButton = make('button', 'trip-card-btn is-secondary', 'Save as a new trip');
			asNewButton.type = 'button';
			actions.appendChild(asNewButton);
		}
		const cancel = make('button', 'trip-card-link', 'Cancel');
		cancel.type = 'button';
		cancel.addEventListener('click', close);
		actions.appendChild(cancel);

		form.append(label, message, actions);
		const title = thenShare ? 'Save it to share it' : 'Save this trip';
		card.appendChild(make('h2', 'trip-card-title', title));
		if (thenShare) card.appendChild(make('p', 'trip-card-text', 'Trips are shared from your account, so this saves it first.'));
		card.appendChild(form);

		async function onSave(asNew){
			const name = input.value.trim();
			if (!name){
				input.focus();
				return;
			}
			saveButton.disabled = true;
			if (asNewButton) asNewButton.disabled = true;
			message.textContent = 'Saving...';
			try {
				await saveCurrentTrip(name, asNew);
				close();
				if (thenShare) shareSavedTrip();
			} catch (err){
				console.warn("Couldn't save the trip", err);
				message.textContent = "Couldn't save your trip. Check your connection and try again.";
				saveButton.disabled = false;
				if (asNewButton) asNewButton.disabled = false;
			}
		}
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			onSave(false);
		});
		if (asNewButton) asNewButton.addEventListener('click', () => onSave(true));
	});
}

// Saves the trip on screen. If someone else saved this trip since you
// opened it, both sets of changes are put together first.
async function saveCurrentTrip(name, asNew){
	const { saveTrip, getTrip } = await savedTrips();
	let trip = currentTrip();
	let id = saved && !asNew ? saved.id : undefined;
	let mergedIn = false;

	if (id){
		const latest = await getTrip(id);
		if (!latest){
			id = undefined; // deleted somewhere else: save it as a new trip
		} else if (latest.updated_at !== saved.updatedAt){
			const merged = mergeTrips(saved.base, trip, latest.trip);
			mergedIn = keyOf(merged) !== keyOf(trip);
			trip = merged;
		}
	}

	let row = await saveTrip({ id, name, trip });
	remember(row);

	if (mergedIn){
		// Show the trip with both people's changes, then save its new totals.
		await openTripInPlanner(row.trip);
		row = await saveTrip({ id: row.id, name: row.name, trip: currentTrip() });
		remember(row);
		flashStatus("Trip saved, with your partner's changes too.");
	} else {
		flashStatus('Trip saved. Find it under My account.');
	}
	updateSaveTripButton();
}

// ---- Sharing ----
function onShareClick(){
	if (!tripState.route) return;
	if (!isSignedIn()){
		showSignInCard();
		return;
	}
	const upToDate = Boolean(saved && keyOf(saved.base) === tripKey());
	if (upToDate) shareSavedTrip();
	else showSaveCard({ thenShare: true });
}

async function shareSavedTrip(){
	const { sendShareLink, shareLink } = await savedTrips();
	const result = await sendShareLink(saved.shareCode, saved.name);
	if (result === 'copied'){
		flashStatus('Link copied! Send it to your partner. Once they open it, you can both change this trip.', 6000);
	} else if (result === 'shared'){
		flashStatus('Sent! Once they open it, you can both change this trip.', 5000);
	} else if (result === 'failed'){
		showLinkCard(shareLink(saved.shareCode));
	}
}

// If the link couldn't be copied for you: show it to copy by hand.
function showLinkCard(url){
	openCard('Share link', (card, close) => {
		const input = make('input', 'trip-card-link-box');
		input.type = 'text';
		input.readOnly = true;
		input.value = url;
		input.addEventListener('focus', () => input.select());
		const actions = make('div', 'trip-card-actions');
		const done = make('button', 'trip-card-btn', 'Done');
		done.type = 'button';
		done.addEventListener('click', close);
		actions.appendChild(done);
		card.append(
			make('h2', 'trip-card-title', 'Plan it together'),
			make('p', 'trip-card-text', 'Copy this link and send it to your partner. Once they open it, you can both change this trip.'),
			input,
			actions
		);
	});
}

// ---- Joining from a share link (index.html?join=...) ----
async function joinWithCode(code){
	showStatus('Opening the trip...');
	try {
		const { joinTrip } = await savedTrips();
		const joined = await joinTrip(code);
		if (!joined){
			flashStatus("That link didn't work. The trip may have been deleted.");
			return;
		}
		await openSavedTrip(joined.trip_id, `You're planning "${joined.trip_name}" together now. Changes either of you save show up for both.`);
	} catch (err){
		console.warn("Couldn't join the trip", err);
		flashStatus("Couldn't open that trip. Check your connection and try again.");
	}
}

// Signed out: show who invited them, and hold the invite while they sign in.
async function showInviteCard(code){
	let invite = null;
	try {
		const { tripInvite } = await savedTrips();
		invite = await tripInvite(code);
	} catch (err){
		console.warn("Couldn't load the invite", err);
	}
	if (!invite){
		flashStatus("That link didn't work. The trip may have been deleted.");
		return;
	}
	const from = invite.from_name || 'Someone';
	openCard('Plan this trip together', (card, close) => {
		card.append(
			make('h2', 'trip-card-title', 'Plan this trip together'),
			make('p', 'trip-card-text', `${from} invited you to plan "${invite.trip_name}" together on LovinglyLost. Sign in or create a free account to join, and you'll both be able to change the route.`)
		);
		signInActions(card, close, () => holdJoinCode(code));
	});
}

// ---- Holding a trip or an invite while someone signs in ----
function holdTrip(){
	try {
		localStorage.setItem(WAITING_KEY, JSON.stringify({ at: Date.now(), trip: currentTrip() }));
	} catch (err){}
}

function holdJoinCode(code){
	try {
		localStorage.setItem(JOIN_KEY, JSON.stringify({ at: Date.now(), code }));
	} catch (err){}
}

function takeHeld(key){
	try {
		const held = JSON.parse(localStorage.getItem(key));
		localStorage.removeItem(key);
		if (held && Date.now() - held.at < WAITING_HOURS * 3600 * 1000) return held;
	} catch (err){}
	return null;
}

// ---- Opening a saved trip (index.html?trip=...) ----
async function openSavedTrip(id, note){
	if (!isSignedIn()){
		flashStatus('Sign in to open your saved trips.');
		return;
	}
	showStatus('Opening your trip...');
	try {
		const { getTrip } = await savedTrips();
		const row = await getTrip(id);
		if (!row){
			flashStatus("Couldn't find that trip. It may have been deleted.");
			return;
		}
		await openTripInPlanner(row.trip);
		remember(row);
		updateSaveTripButton();
		if (note) flashStatus(note, 6000);
	} catch (err){
		console.warn("Couldn't open the trip", err);
		flashStatus("Couldn't open your trip. Check your connection and try again.");
	}
}

// ---- Noticing a partner's changes ----
let checking = false;

async function checkForChanges(){
	if (!saved || checking || document.hidden || !isSignedIn()) return;
	checking = true;
	try {
		const { getTrip, tripPeople } = await savedTrips();
		const latest = await getTrip(saved.id);
		if (!latest || latest.updated_at === saved.updatedAt) return;
		if (keyOf(latest.trip) === keyOf(saved.base)){
			// Saved again with the same places: nothing to show.
			saved.updatedAt = latest.updated_at;
			return;
		}
		const people = await tripPeople();
		const who = people.find(person => person.user_id === latest.updated_by);
		showChangeNote(who && who.first_name ? who.first_name : 'Your partner', latest);
	} catch (err){
		// Offline or signed out: try again next time.
	} finally {
		checking = false;
	}
}

function showChangeNote(name, latest){
	const panel = document.getElementById('summaryPanel');
	if (!panel) return;
	const old = document.getElementById('tripChangeNote');
	if (old) old.remove();

	const note = make('div', 'trip-change-note');
	note.id = 'tripChangeNote';
	note.setAttribute('role', 'status');
	const text = make('p', null, `${name} changed this trip.`);
	const button = make('button', 'trip-change-btn', 'Show their changes');
	button.type = 'button';
	button.addEventListener('click', async () => {
		button.disabled = true;
		const mine = currentTrip();
		const hadChanges = keyOf(mine) !== keyOf(saved.base);
		const merged = mergeTrips(saved.base, mine, latest.trip);
		saved.base = latest.trip;
		saved.updatedAt = latest.updated_at;
		saved.name = latest.name;
		await openTripInPlanner(merged);
		updateSaveTripButton();
		flashStatus(hadChanges ? 'Their changes are in. Tap Save changes to keep yours too.' : 'Their changes are in.');
	});
	note.append(text, button);
	panel.prepend(note);
}

// ---- Start ----
// openTrip is Main-Launch.js's function that fills the planner with a trip
// and plans its route.
export function initSaveTrip(openTrip){
	openTripInPlanner = openTrip;

	saveBtn = make('button', 'drive-btn save-trip-btn');
	saveBtn.type = 'button';
	saveBtn.id = 'saveTripBtn';
	saveBtn.addEventListener('click', () => {
		if (!tripState.route) return;
		if (isSignedIn()) showSaveCard();
		else showSignInCard();
	});

	shareBtn = make('button', 'drive-btn share-trip-btn');
	shareBtn.type = 'button';
	shareBtn.id = 'shareTripBtn';
	shareBtn.addEventListener('click', onShareClick);

	placeButtons();
	PHONE_QUERY.addEventListener('change', placeButtons);

	// Look for a partner's changes when you come back to the app, and now and then.
	document.addEventListener('visibilitychange', checkForChanges);
	window.addEventListener('focus', checkForChanges);
	setInterval(checkForChanges, CHECK_EVERY_MS);

	const params = new URLSearchParams(location.search);
	const tripId = params.get('trip');
	const joinCode = params.get('join');
	if (tripId || joinCode){
		// Tidy the address, so refreshing the page starts fresh.
		history.replaceState(null, '', location.pathname);
	}
	const waiting = takeHeld(WAITING_KEY);
	const heldInvite = isSignedIn() ? takeHeld(JOIN_KEY) : null;

	if (joinCode){
		if (isSignedIn()) joinWithCode(joinCode);
		else showInviteCard(joinCode);
	} else if (tripId){
		openSavedTrip(tripId);
	} else if (heldInvite){
		joinWithCode(heldInvite.code);
	} else if (waiting){
		openTripInPlanner(waiting.trip).then(() => {
			if (isSignedIn() && tripState.route) flashStatus('Your trip is back. Tap Save this trip to keep it.');
		});
	}
}