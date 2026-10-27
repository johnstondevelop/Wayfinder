// The "Favorite stops" and "Places to avoid" cards on the account page.
import { supabase } from './supabase-client.js';
import { ROMANTIC_POI_CATEGORY_LABELS } from '../Maptoken-categories/maptoken-config.js';
import { ROMANTIC_POI_CATEGORY_ICONS } from '../Maptoken-categories/CategoryIcons.js';

const EMPTY_NOTES = {
	favorite: 'No favorites yet. Tap ♡ Save on any scenic stop on the map to keep it here.',
	avoid: "Nothing avoided. Tap Avoid on a scenic stop and it won't show up on your routes again."
};

function googleMapsUrl(row){
	const query = row.address ? `${row.name}, ${row.address}` : `${row.name} @${row.lat},${row.lng}`;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function emptyNote(list){
	const note = document.createElement('li');
	note.className = 'saved-place-empty';
	note.textContent = EMPTY_NOTES[list];
	return note;
}

// One row: the category icon, the name, its category and address, a map
// link, and a button to take it off the list.
function placeRow(row, list, listEl){
	const item = document.createElement('li');
	item.className = 'saved-place';

	const icon = document.createElement('span');
	icon.className = 'saved-place-icon';
	icon.innerHTML = ROMANTIC_POI_CATEGORY_ICONS[row.category] || '♥';

	const text = document.createElement('div');
	text.className = 'saved-place-text';
	const name = document.createElement('strong');
	name.textContent = row.name;
	const details = document.createElement('span');
	details.textContent = [ROMANTIC_POI_CATEGORY_LABELS[row.category], row.address].filter(Boolean).join(' · ');
	text.append(name, details);

	const actions = document.createElement('div');
	actions.className = 'saved-place-actions';
	const mapLink = document.createElement('a');
	mapLink.href = googleMapsUrl(row);
	mapLink.target = '_blank';
	mapLink.rel = 'noopener noreferrer';
	mapLink.textContent = 'Map ↗';
	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.textContent = list === 'favorite' ? 'Remove' : 'Stop avoiding';
	removeBtn.addEventListener('click', async () => {
		removeBtn.disabled = true;
		const { error } = await supabase.from('saved_places').delete().eq('list', list).eq('place_key', row.place_key);
		if (error){
			removeBtn.disabled = false;
			removeBtn.textContent = 'Try again';
			return;
		}
		item.remove();
		if (!listEl.children.length) listEl.appendChild(emptyNote(list));
	});
	actions.append(mapLink, removeBtn);

	item.append(icon, text, actions);
	return item;
}

function showList(listEl, rows, list){
	listEl.innerHTML = '';
	if (!rows.length){
		listEl.appendChild(emptyNote(list));
		return;
	}
	rows.forEach(row => listEl.appendChild(placeRow(row, list, listEl)));
}

export async function showSavedPlaces(){
	const favoriteList = document.getElementById('favoritePlaces');
	const avoidList = document.getElementById('avoidPlaces');
	if (!favoriteList || !avoidList) return;

	const { data, error } = await supabase
		.from('saved_places')
		.select('list, place_key, name, lng, lat, category, address')
		.order('created_at', { ascending: false });

	if (error){
		favoriteList.textContent = "Couldn't load your places right now. Please refresh to try again.";
		return;
	}
	showList(favoriteList, data.filter(row => row.list === 'favorite'), 'favorite');
	showList(avoidList, data.filter(row => row.list === 'avoid'), 'avoid');
}
