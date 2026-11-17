// The "Saved trips" card on the account page: your trips and ones shared
// with you, each with buttons to open it on the planner, share it, and
// delete it (or leave it, if someone else shared it with you).
import { listTrips, deleteTrip, leaveTrip, tripPeople, sendShareLink, shareLink } from './saved-trips.js';
import { getSignedInUser } from './supabase-client.js';

const WAITING_KEY = 'lovinglylost-waiting-trip'; // same name as in Map/save-trip.js
const JOIN_KEY = 'lovinglylost-join-code'; // same name as in Map/save-trip.js
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

// "Aspen", "Aspen and Sam", "Aspen, Sam and Jo"
function listNames(names){
	const known = names.map(name => name || 'someone');
	if (known.length <= 1) return known.join('');
	return known.slice(0, -1).join(', ') + ' and ' + known[known.length - 1];
}

function emptyNote(){
	const note = document.createElement('li');
	note.className = 'saved-place-empty';
	note.textContent = 'No saved trips yet. Plan a route, then tap ♡ Save this trip to keep it here.';
	return note;
}

// A button that needs a second tap, so a slip of the thumb doesn't lose a trip.
function twoTapButton(label, sureLabel, action){
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = label;
	let sure = false;
	let timer = null;
	button.addEventListener('click', async () => {
		if (!sure){
			sure = true;
			button.textContent = sureLabel;
			timer = setTimeout(() => {
				sure = false;
				button.textContent = label;
			}, 4000);
			return;
		}
		clearTimeout(timer);
		button.disabled = true;
		try {
			await action();
		} catch (err){
			sure = false;
			button.disabled = false;
			button.textContent = 'Try again';
		}
	});
	return button;
}

function tripRow(row, people, isMine, listEl){
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

	// Who it's shared with, or who shared it.
	const others = people.filter(person => person.trip_id === row.id);
	if (!isMine || others.length){
		const shared = document.createElement('span');
		shared.className = 'saved-trip-shared';
		if (isMine){
			shared.textContent = '♥ Planning with ' + listNames(others.map(person => person.first_name));
		} else {
			const owner = others.find(person => person.is_owner);
			shared.textContent = '♥ Shared by ' + ((owner && owner.first_name) || 'someone');
		}
		text.appendChild(shared);
	}

	const actions = document.createElement('div');
	actions.className = 'saved-place-actions';
	const openLink = document.createElement('a');
	openLink.className = 'saved-trip-open';
	openLink.href = 'index.html?trip=' + encodeURIComponent(row.id);
	openLink.textContent = 'Open';

	const shareBtn = document.createElement('button');
	shareBtn.type = 'button';
	shareBtn.textContent = 'Share';
	shareBtn.addEventListener('click', async () => {
		const result = await sendShareLink(row.share_code, row.name);
		if (result === 'copied') flash(shareBtn, 'Link copied!');
		else if (result === 'shared') flash(shareBtn, 'Sent!');
		else if (result === 'failed') window.prompt('Copy this link and send it to your partner:', shareLink(row.share_code));
	});

	const removeItem = () => {
		item.remove();
		if (!listEl.children.length) listEl.appendChild(emptyNote());
	};
	const removeBtn = isMine
		? twoTapButton('Delete', others.length ? 'Tap again: deletes it for everyone' : 'Tap again to delete', async () => {
			await deleteTrip(row.id);
			removeItem();
		})
		: twoTapButton('Leave', 'Tap again to leave', async () => {
			await leaveTrip(row.id);
			removeItem();
		});

	actions.append(openLink, shareBtn, removeBtn);
	item.append(icon, text, actions);
	return item;
}

// Shows a short message on a button for a moment.
function flash(button, message){
	const label = button.textContent;
	button.textContent = message;
	button.disabled = true;
	setTimeout(() => {
		button.textContent = label;
		button.disabled = false;
	}, 2500);
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

// Someone who opened a share link before signing in: now that they're
// signed in, take them back to the planner to join that trip.
function goJoinHeldInvite(){
	try {
		const held = JSON.parse(localStorage.getItem(JOIN_KEY));
		if (held && held.code){
			localStorage.removeItem(JOIN_KEY);
			location.replace('index.html?join=' + encodeURIComponent(held.code));
			return true;
		}
	} catch (err){}
	return false;
}

export async function showSavedTrips(){
	const listEl = document.getElementById('savedTrips');
	if (!listEl) return;
	if (goJoinHeldInvite()) return;
	showWaitingNote();
	try {
		const [rows, people, user] = await Promise.all([listTrips(), tripPeople().catch(() => []), getSignedInUser()]);
		listEl.innerHTML = '';
		if (!rows.length) listEl.appendChild(emptyNote());
		rows.forEach(row => listEl.appendChild(tripRow(row, people, user && row.user_id === user.id, listEl)));
	} catch (err){
		listEl.textContent = "Couldn't load your trips right now. Please refresh to try again.";
	}
}