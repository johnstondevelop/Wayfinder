// The "Saved trips" card on the account page: each trip saved from the
// planner, with a button to open it there again and one to delete it.
import { listTrips, deleteTrip } from './saved-trips.js';

const WAITING_KEY = 'lovinglylost-waiting-trip'; // same name as in Map/save-trip.js
const ROUTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21c3-2.6 3-5.8 0-8.4S3 6.8 6 4.2" stroke-dasharray="2.2 3"/><path d="M16 12s-4-2.7-4-5.8a2.4 2.4 0 014-1.7 2.4 2.4 0 014 1.7c0 3.1-4 5.8-4 5.8z" fill="currentColor" stroke="none"/></svg>';

const short = name => String(name || '').split(',')[0].trim();

// "Asheville → Boone · 3 stops · 68 mi · 1.5 hrs"
function describe(trip){
	const stops = trip.stops || [];
	const last = stops[stops.length - 1];
	const parts = [`${short(trip.origin && trip.origin.name)} → ${short(last && last.name)}`];
	parts.push(`${stops.length} stop${stops.length === 1 ? '' : 's'}`);
	if (trip.miles) parts.push(`${trip.miles} mi`);
	if (trip.hours) parts.push(`${trip.hours} hrs`);
	if (trip.multiDay && trip.days > 1) parts.push(`${trip.days} days`);
	return parts.join(' · ');
}

function emptyNote(){
	const note = document.createElement('li');
	note.className = 'saved-place-empty';
	note.textContent = 'No saved trips yet. Plan a route, then tap ♡ Save this trip to keep it here.';
	return note;
}

function tripRow(row, listEl){
	const item = document.createElement('li');
	item.className = 'saved-place';

	const icon = document.createElement('span');
	icon.className = 'saved-place-icon';
	icon.innerHTML = ROUTE_ICON;

	const text = document.createElement('div');
	text.className = 'saved-place-text';
	const name = document.createElement('strong');
	name.textContent = row.name;
	const details = document.createElement('span');
	details.textContent = describe(row.trip || {});
	text.append(name, details);

	const actions = document.createElement('div');
	actions.className = 'saved-place-actions';
	const openLink = document.createElement('a');
	openLink.className = 'saved-trip-open';
	openLink.href = 'index.html?trip=' + encodeURIComponent(row.id);
	openLink.textContent = 'Open';

	// Deleting takes two taps, so a slip of the thumb doesn't lose a trip.
	const deleteBtn = document.createElement('button');
	deleteBtn.type = 'button';
	deleteBtn.textContent = 'Delete';
	let sure = false;
	let timer = null;
	deleteBtn.addEventListener('click', async () => {
		if (!sure){
			sure = true;
			deleteBtn.textContent = 'Tap again to delete';
			timer = setTimeout(() => {
				sure = false;
				deleteBtn.textContent = 'Delete';
			}, 4000);
			return;
		}
		clearTimeout(timer);
		deleteBtn.disabled = true;
		try {
			await deleteTrip(row.id);
			item.remove();
			if (!listEl.children.length) listEl.appendChild(emptyNote());
		} catch (err){
			sure = false;
			deleteBtn.disabled = false;
			deleteBtn.textContent = 'Try again';
		}
	});
	actions.append(openLink, deleteBtn);

	item.append(icon, text, actions);
	return item;
}

// Someone who tapped "Save this trip" before signing in has a trip waiting
// on the planner. Point them back to it.
function showWaitingNote(){
	const note = document.getElementById('waitingTripNote');
	if (!note) return;
	let waiting = false;
	try { waiting = Boolean(localStorage.getItem(WAITING_KEY)); } catch (err){}
	note.hidden = !waiting;
}

export async function showSavedTrips(){
	const listEl = document.getElementById('savedTrips');
	if (!listEl) return;
	showWaitingNote();
	try {
		const rows = await listTrips();
		listEl.innerHTML = '';
		if (!rows.length) listEl.appendChild(emptyNote());
		rows.forEach(row => listEl.appendChild(tripRow(row, listEl)));
	} catch (err){
		listEl.textContent = "Couldn't load your trips right now. Please refresh to try again.";
	}
}