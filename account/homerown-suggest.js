// Suggests towns and cities as you type in the account page's "Home town"
// box, using the same Mapbox account as the planner. Picking one fills in
// a tidy name like "Asheville, North Carolina". You can still type
// anything you like without picking.
import { MAPBOX_TOKEN } from '../Maptoken-categories/maptoken-config.js';

const SUGGEST_DELAY_MS = 250;

// "Asheville, North Carolina" for US towns; other countries keep the
// country name on the end, like "Paris, Île-de-France, France".
function townName(feature){
	const parts = [feature.text];
	const context = feature.context || [];
	const region = context.find(c => c.id.startsWith('region'));
	const country = context.find(c => c.id.startsWith('country'));
	if (region) parts.push(region.text);
	if (country && country.short_code !== 'us') parts.push(country.text);
	return parts.join(', ');
}

async function suggestTowns(query){
	const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
		+ `?types=place,locality&autocomplete=true&limit=5&access_token=${MAPBOX_TOKEN}`;
	try {
		const res = await fetch(url);
		if (!res.ok) return [];
		const data = await res.json();
		const names = (data.features || []).map(townName);
		return [...new Set(names)]; // drop exact repeats
	} catch (err){
		return [];
	}
}

export function attachHometownSuggestions(input, listEl){
	input.setAttribute('autocomplete', 'off');
	let timer = null;
	let requestId = 0;
	let current = [];

	function clearList(){
		listEl.innerHTML = '';
		current = [];
	}

	function choose(name){
		requestId++;
		input.value = name;
		clearList();
	}

	function render(names){
		clearList();
		current = names;
		names.forEach(name => {
			const item = document.createElement('li');
			item.className = 'suggestion-item';
			item.textContent = name;
			// Keep the box focused while the item is pressed, then pick it on click.
			item.addEventListener('mousedown', (e) => e.preventDefault());
			item.addEventListener('click', () => choose(name));
			listEl.appendChild(item);
		});
	}

	input.addEventListener('input', () => {
		clearTimeout(timer);
		const query = input.value.trim();
		if (query.length < 2){
			requestId++;
			clearList();
			return;
		}
		timer = setTimeout(async () => {
			const myId = ++requestId;
			const names = await suggestTowns(query);
			// Ignore answers that arrive after newer typing, or after leaving the box.
			if (myId !== requestId || document.activeElement !== input) return;
			render(names);
		}, SUGGEST_DELAY_MS);
	});

	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && current.length){
			e.preventDefault(); // pick the top town instead of saving the form
			choose(current[0]);
		} else if (e.key === 'Escape'){
			clearList();
		}
	});

	input.addEventListener('blur', () => {
		requestId++;
		clearTimeout(timer);
		clearList();
	});
}
