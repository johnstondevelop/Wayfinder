// Road preferences: avoid tolls, highways and ferries. Saved on this
// device, and for signed-in people to their account too (the avoid_tolls,
// avoid_highways and avoid_ferries columns in profiles), so the planner and
// the account page always agree. Any element with a data-road-prefs
// attribute gets the three on/off buttons.
import { tripState } from './state-and-data.js';

const STORAGE_KEY = 'lovinglylost-road-prefs';
const SIGN_IN_KEY = 'lovinglylost-auth'; // same name as in account/supabase-client.js

// key: our name for it; exclude: Mapbox's word for it; column: where the
// account keeps it
const ROAD_OPTIONS = [
	{ key: 'tolls',    label: 'Tolls',    exclude: 'toll',     column: 'avoid_tolls' },
	{ key: 'highways', label: 'Highways', exclude: 'motorway', column: 'avoid_highways' },
	{ key: 'ferries',  label: 'Ferries',  exclude: 'ferry',    column: 'avoid_ferries' }
];

let prefs = readSaved();

function readSaved(){
	const none = { tolls: false, highways: false, ferries: false };
	try {
		return { ...none, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
	} catch (err){
		return none;
	}
}

function remember(){
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (err){}
}

function isSignedIn(){
	try { return Boolean(localStorage.getItem(SIGN_IN_KEY)); } catch (err){ return false; }
}

// The bit added to a Mapbox directions request, like "&exclude=toll,ferry".
export function excludeParam(){
	const words = ROAD_OPTIONS.filter(option => prefs[option.key]).map(option => option.exclude);
	return words.length ? `&exclude=${words.join(',')}` : '';
}

async function saveToAccount(option, value){
	if (!isSignedIn()) return;
	try {
		const { supabase, getSignedInUser } = await import('../account/supabase-client.js');
		const user = await getSignedInUser();
		if (user) await supabase.from('profiles').upsert({ id: user.id, [option.column]: value });
	} catch (err){
		console.warn("Couldn't save road preferences to your account", err);
	}
}

// Signed in? The account's choices win, so they follow you between devices.
async function loadFromAccount(){
	if (!isSignedIn()) return;
	try {
		const { supabase, getSignedInUser } = await import('../account/supabase-client.js');
		const user = await getSignedInUser();
		if (!user) return;
		const { data } = await supabase
			.from('profiles')
			.select('avoid_tolls, avoid_highways, avoid_ferries')
			.eq('id', user.id)
			.maybeSingle();
		if (!data) return;
		ROAD_OPTIONS.forEach(option => { prefs[option.key] = Boolean(data[option.column]); });
		remember();
		drawAll();
	} catch (err){
		console.warn("Couldn't load road preferences from your account", err);
	}
}

function draw(container){
	container.innerHTML = '';
	ROAD_OPTIONS.forEach(option => {
		const on = prefs[option.key];
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'category-chip' + (on ? ' active' : '');
		button.setAttribute('aria-pressed', String(on));
		button.textContent = (on ? '✓ ' : '') + option.label;
		button.addEventListener('click', () => {
			prefs[option.key] = !prefs[option.key];
			remember();
			drawAll();
			saveToAccount(option, prefs[option.key]);
			// On the planner, a route already on the map needs replanning to change.
			if (tripState.route) showNote(true);
		});
		container.appendChild(button);
	});
}

function drawAll(){
	document.querySelectorAll('[data-road-prefs]').forEach(draw);
}

// The planner's "Tap Find our route again" note.
function showNote(show){
	const note = document.getElementById('roadPrefsNote');
	if (note) note.style.display = show ? 'block' : 'none';
}

const planBtn = document.getElementById('planBtn');
if (planBtn) planBtn.addEventListener('click', () => showNote(false));

drawAll();
loadFromAccount();
