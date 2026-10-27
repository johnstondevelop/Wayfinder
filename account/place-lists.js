// Favorite stops and places to avoid, saved to the signed-in person's
// account (the saved_places table in Supabase). The planner uses this for
// the ♡ Save and Avoid buttons in scenic-stop popups, and to hide avoided
// places. The account system only loads for people who are signed in, so
// the planner stays quick (and keeps working) for everyone else.

const SIGN_IN_KEY = 'lovinglylost-auth'; // same name as in supabase-client.js
const lists = { favorite: new Map(), avoid: new Map() };
let loading = null;

export function isSignedIn(){
	try { return Boolean(localStorage.getItem(SIGN_IN_KEY)); } catch (err){ return false; }
}

async function getClient(){
	const { supabase } = await import('./supabase-client.js');
	return supabase;
}

// Fetches both lists from the account once. Safe to call as often as you like.
export function loadPlaceLists(){
	if (!isSignedIn()) return Promise.resolve(lists);
	if (!loading){
		loading = (async () => {
			try {
				const supabase = await getClient();
				const { data, error } = await supabase
					.from('saved_places')
					.select('list, place_key, name, lng, lat, category, address');
				if (error) throw error;
				data.forEach(row => {
					if (lists[row.list]) lists[row.list].set(row.place_key, row);
				});
			} catch (err){
				console.warn("Couldn't load your saved places", err);
				loading = null; // try again next time
			}
			return lists;
		})();
	}
	return loading;
}

// The saved copy of a place on a list, or null. Matches the exact spot, or
// the same name within about 100 meters (Mapbox can nudge a spot's
// position a little between searches).
function findInList(list, key, place){
	for (const row of lists[list].values()){
		if (row.place_key === key) return row;
		if (row.name === place.name && Math.abs(row.lng - place.lng) < 0.001 && Math.abs(row.lat - place.lat) < 0.001) return row;
	}
	return null;
}

export function isAvoided(key, place){
	return Boolean(findInList('avoid', key, place));
}

export async function removePlace(list, placeKey){
	const supabase = await getClient();
	const { error } = await supabase.from('saved_places').delete().eq('list', list).eq('place_key', placeKey);
	if (error) throw error;
	lists[list].delete(placeKey);
}

// Puts a place on a list, or takes it off if it's already there. A place
// can't be a favorite and avoided at once, so adding it to one list takes
// it off the other. Returns true if the place is now on the list.
export async function togglePlace(list, key, place){
	const existing = findInList(list, key, place);
	if (existing){
		await removePlace(list, existing.place_key);
		return false;
	}
	const otherList = list === 'favorite' ? 'avoid' : 'favorite';
	const onOther = findInList(otherList, key, place);
	if (onOther) await removePlace(otherList, onOther.place_key);

	const row = {
		list,
		place_key: key,
		name: place.name,
		lng: place.lng,
		lat: place.lat,
		category: place.category || null,
		address: place.address || null
	};
	const supabase = await getClient();
	const { error } = await supabase.from('saved_places').insert(row);
	if (error && error.code !== '23505') throw error; // 23505 means it was already saved
	lists[list].set(key, row);
	return true;
}

function escapeHtml(text){
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// The buttons at the bottom of a scenic stop's popup.
export function placeListButtonsHTML(key, place){
	if (!isSignedIn()){
		return `<a class="popup-list-signin" href="login.html">♡ Sign in to save or avoid places</a>`;
	}
	const saved = Boolean(findInList('favorite', key, place));
	const safeKey = escapeHtml(key);
	return `<div class="popup-list-btns">
		<button type="button" class="popup-list-btn${saved ? ' is-on' : ''}" data-list="favorite" data-place-key="${safeKey}" aria-pressed="${saved}">${saved ? '♥ Saved' : '♡ Save'}</button>
		<button type="button" class="popup-list-btn popup-avoid-btn" data-list="avoid" data-place-key="${safeKey}">Avoid</button>
	</div>`;
}
