// Every kind of stop is searched by Mapbox's exact category ID, like
// "waterfall" or "wine_bar". Before a scenic search, this asks Mapbox which
// IDs it has (once a week; the answer is saved on the device), so a stop
// type whose ID is spelled a little differently on Mapbox's side still gets
// found, and one Mapbox doesn't have is skipped instead of failing quietly.
import { MAPBOX_TOKEN, ROMANTIC_POI_CATEGORY_LABELS } from './maptoken-config.js';

const LIST_URL = 'https://api.mapbox.com/search/searchbox/v1/list/category';
const STORAGE_KEY = 'lovinglylost-mapbox-categories';
const KEEP_FOR_MS = 7 * 24 * 60 * 60 * 1000; // one week

let cached = null;

// "Farmers' Market", "farmers_market" and "FarmersMarket" all become "farmersmarket".
function simplify(text){
	return String(text || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function categoryLabel(category){
	return ROMANTIC_POI_CATEGORY_LABELS[category] || category;
}

// Mapbox's list of categories as [{ id, name }], or null if it couldn't be checked.
async function mapboxCategories(){
	if (cached) return cached;
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
		if (saved && Date.now() - saved.savedAt < KEEP_FOR_MS){
			cached = saved.items;
			return cached;
		}
	} catch (err){}

	try {
		const res = await fetch(`${LIST_URL}?access_token=${MAPBOX_TOKEN}`);
		if (!res.ok) return null;
		const data = await res.json();
		const items = (data.listItems || []).map(item => ({ id: item.canonical_id, name: item.name }));
		if (!items.length) return null;
		cached = items;
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), items })); } catch (err){}
		return items;
	} catch (err){
		return null;
	}
}

// For each of our stop types, the ID to search Mapbox with, or null if
// Mapbox doesn't have it. If Mapbox's list can't be reached, our own IDs
// are used as they are.
export async function mapboxIdsFor(categories){
	const items = await mapboxCategories();
	const ids = {};
	categories.forEach(category => {
		if (!items){
			ids[category] = category;
			return;
		}
		if (items.some(item => item.id === category)){
			ids[category] = category;
			return;
		}
		const wanted = [simplify(category), simplify(categoryLabel(category))];
		const match = items.find(item => wanted.includes(simplify(item.id)) || wanted.includes(simplify(item.name)));
		ids[category] = match ? match.id : null;
	});
	return ids;
}
