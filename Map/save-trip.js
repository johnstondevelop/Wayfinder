// "Save this trip" on the planner. Once a route is on the map, the button
// keeps the trip (starting point, stops and days) in your account, and
// "Open" on the account page brings it back here with the route planned.
// Signed out? The trip is held on this device while you sign in.
// The account system only loads when it's needed, so the planner stays quick.
import { tripState } from './state-and-data.js';
import { showStatus, hideStatus } from './Map.js';

const SIGN_IN_KEY = 'lovinglylost-auth'; // same name as in account/supabase-client.js
const WAITING_KEY = 'lovinglylost-waiting-trip';
const WAITING_HOURS = 24; // how long a trip is held while someone signs in
const PHONE_QUERY = window.matchMedia('(max-width: 860px)');
const METERS_PER_MILE = 1609.34;

let saveBtn = null;
let openTripInPlanner = null; // given by Main-Launch.js
let saved = null;             // { id, name, key } once this trip is in the account

function isSignedIn(){
	try { return Boolean(localStorage.getItem(SIGN_IN_KEY)); } catch (err){ return false; }
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

// A short fingerprint of the places and days, to tell if the trip has
// changed since it was saved.
function tripKey(){
	if (!tripState.origin) return '';
	const trip = currentTrip();
	return JSON.stringify([trip.origin, trip.stops, trip.days, trip.multiDay]);
}

// "Asheville to Boone", from "Asheville, North Carolina, United States".
function suggestedName(){
	const short = name => String(name || '').split(',')[0].trim();
	const stops = tripState.stops.filter(stop => stop.lng !== null);
	const last = stops[stops.length - 1];
	return `${short(tripState.origin.name)} to ${short(last && last.name)}`;
}

// ---- The button ----
// On a computer it sits under Start Drive; on a phone it joins Start Drive
// and Edit Trip in the pull-up panel.
function placeButton(){
	const startDriveBtn = document.getElementById('startDriveBtn');
	const editTripBtn = document.getElementById('editTripBtn');
	if (PHONE_QUERY.matches && editTripBtn) editTripBtn.before(saveBtn);
	else if (startDriveBtn) startDriveBtn.after(saveBtn);
	updateSaveTripButton();
}

// Called by Main-Launch.js whenever the route changes.
export function updateSaveTripButton(){
	if (!saveBtn) return;
	saveBtn.disabled = !tripState.route;
	const upToDate = Boolean(saved && tripState.route && saved.key === tripKey());
	saveBtn.classList.toggle('is-saved', upToDate);
	const phone = PHONE_QUERY.matches;
	if (upToDate) saveBtn.textContent = phone ? '♥ Saved' : '♥ Trip saved';
	else if (saved) saveBtn.textContent = phone ? '♡ Save' : '♡ Save changes';
	else saveBtn.textContent = phone ? '♡ Save' : '♡ Save this trip';
}

function flashStatus(text){
	showStatus(text);
	setTimeout(hideStatus, 3500);
}

// ---- The card that pops up ----
function make(tag, className, text){
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;
	return el;
}

function openCard(build){
	const backdrop = make('div', 'trip-card-backdrop');
	const card = make('div', 'trip-card');
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-modal', 'true');
	card.setAttribute('aria-label', 'Save this trip');
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

// Signed out: offer to sign in, and hold on to the trip meanwhile.
function showSignInCard(){
	openCard((card, close) => {
		card.append(
			make('h2', 'trip-card-title', 'Save this trip'),
			make('p', 'trip-card-text', "Sign in or create a free account to keep this trip and open it on any phone or computer. We'll hold on to it here while you do.")
		);
		const actions = make('div', 'trip-card-actions');
		const signIn = make('a', 'trip-card-btn', 'Sign in');
		signIn.href = 'login.html';
		const create = make('a', 'trip-card-btn is-secondary', 'Create account');
		create.href = 'login.html?mode=signup';
		const later = make('button', 'trip-card-link', 'Not now');
		later.type = 'button';
		later.addEventListener('click', close);
		[signIn, create].forEach(link => link.addEventListener('click', holdTrip));
		actions.append(signIn, create, later);
		card.appendChild(actions);
	});
}

// Signed in: ask for a name, then save.
function showSaveCard(){
	openCard((card, close) => {
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
		const saveButton = make('button', 'trip-card-btn', saved ? 'Save changes' : 'Save trip');
		saveButton.type = 'submit';
		actions.appendChild(saveButton);
		let asNewButton = null;
		if (saved){
			asNewButton = make('button', 'trip-card-btn is-secondary', 'Save as a new trip');
			asNewButton.type = 'button';
			actions.appendChild(asNewButton);
		}
		const cancel = make('button', 'trip-card-link', 'Cancel');
		cancel.type = 'button';
		cancel.addEventListener('click', close);
		actions.appendChild(cancel);

		form.append(label, message, actions);
		card.append(make('h2', 'trip-card-title', 'Save this trip'), form);

		async function save(asNew){
			const name = input.value.trim();
			if (!name){
				input.focus();
				return;
			}
			saveButton.disabled = true;
			if (asNewButton) asNewButton.disabled = true;
			message.textContent = 'Saving...';
			try {
				const { saveTrip } = await import('../account/saved-trips.js');
				const details = { name, trip: currentTrip() };
				let row;
				try {
					row = await saveTrip({ ...details, id: saved && !asNew ? saved.id : undefined });
				} catch (err){
					// The saved copy was deleted somewhere else: save it as new.
					if (!saved || asNew || err.code !== 'PGRST116') throw err;
					row = await saveTrip(details);
				}
				saved = { id: row.id, name: row.name, key: tripKey() };
				updateSaveTripButton();
				close();
				flashStatus('Trip saved. Find it under My account.');
			} catch (err){
				console.warn("Couldn't save the trip", err);
				message.textContent = "Couldn't save your trip. Check your connection and try again.";
				saveButton.disabled = false;
				if (asNewButton) asNewButton.disabled = false;
			}
		}
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			save(false);
		});
		if (asNewButton) asNewButton.addEventListener('click', () => save(true));
	});
}

// ---- Holding a trip while someone signs in ----
function holdTrip(){
	try {
		localStorage.setItem(WAITING_KEY, JSON.stringify({ at: Date.now(), trip: currentTrip() }));
	} catch (err){}
}

function takeWaitingTrip(){
	try {
		const waiting = JSON.parse(localStorage.getItem(WAITING_KEY));
		localStorage.removeItem(WAITING_KEY);
		if (waiting && Date.now() - waiting.at < WAITING_HOURS * 3600 * 1000) return waiting.trip;
	} catch (err){}
	return null;
}

// ---- Opening a saved trip (index.html?trip=...) ----
async function openFromAddress(id){
	// Tidy the address, so refreshing the page starts fresh.
	history.replaceState(null, '', location.pathname);
	if (!isSignedIn()){
		flashStatus('Sign in to open your saved trips.');
		return;
	}
	showStatus('Opening your trip...');
	try {
		const { getTrip } = await import('../account/saved-trips.js');
		const row = await getTrip(id);
		if (!row){
			flashStatus("Couldn't find that trip. It may have been deleted.");
			return;
		}
		await openTripInPlanner(row.trip);
		saved = { id: row.id, name: row.name, key: tripKey() };
		updateSaveTripButton();
	} catch (err){
		console.warn("Couldn't open the trip", err);
		flashStatus("Couldn't open your trip. Check your connection and try again.");
	}
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
	placeButton();
	PHONE_QUERY.addEventListener('change', placeButton);

	const tripId = new URLSearchParams(location.search).get('trip');
	const waiting = takeWaitingTrip();
	if (tripId){
		openFromAddress(tripId);
	} else if (waiting){
		openTripInPlanner(waiting).then(() => {
			if (isSignedIn() && tripState.route) flashStatus('Your trip is back. Tap Save this trip to keep it.');
		});
	}
}