import { suggestPlaces, geocodePlace } from './Routing-Location.js';

// How long to wait after the last keystroke before asking for suggestions.
const SUGGEST_DELAY_MS = 250;
// How long to wait after a box loses focus before looking up what was typed.
// This gives a tap on a suggestion time to land first, so the lookup of the
// half-typed text can never replace the place you actually picked.
const BLUR_GRACE_MS = 200;

// Lookups still in progress (a box was just left and its text is being
// turned into a place). planRoute waits for these, so tapping "Find our
// route" straight after typing doesn't run ahead of them.
const pendingLookups = new Set();

export function waitForPendingLookups(){
	return Promise.allSettled([...pendingLookups]);
}

// Wires one text box up to place suggestions.
// - input: the text box
// - listEl: the <ul> the suggestions show up in
// - onPlaceChosen(place): called with { name, lng, lat } once a place is settled
export function attachPlaceAutocomplete(input, listEl, onPlaceChosen){
	// Keep phone keyboards from autocorrecting place names or popping up
	// their own autofill over our suggestions.
	input.setAttribute('autocomplete', 'off');
	input.setAttribute('autocorrect', 'off');
	input.setAttribute('autocapitalize', 'words');
	input.setAttribute('spellcheck', 'false');
	input.setAttribute('enterkeyhint', 'done');

	let chosenName = input.value.trim() || null; // name of the place last picked for this box
	let requestId = 0;                            // bumps on every new request, so old answers can be ignored
	let timer = null;
	let currentPlaces = [];

	function clearList(){
		listEl.innerHTML = '';
		currentPlaces = [];
	}

	function choose(place){
		requestId++;
		clearTimeout(timer);
		chosenName = place.name;
		input.value = place.name;
		clearList();
		onPlaceChosen(place);
	}

	// On a phone the keyboard can cover the list. If it's out of sight,
	// scroll the box to the top of the form so the suggestions show.
	function revealList(){
		const vv = window.visualViewport;
		const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
		if (listEl.getBoundingClientRect().bottom > visibleBottom){
			input.closest('.autocomplete-wrap').scrollIntoView({ block: 'start', behavior: 'smooth' });
		}
	}

	function render(places){
		clearList();
		currentPlaces = places;
		places.forEach(place => {
			const item = document.createElement('li');
			item.className = 'suggestion-item';
			item.textContent = place.name;
			// Pressing an item shouldn't take focus away from the box...
			item.addEventListener('mousedown', (e) => e.preventDefault());
			// ...and the pick itself happens on click, which both taps and mouse clicks send.
			item.addEventListener('click', () => choose(place));
			listEl.appendChild(item);
		});
		if (places.length) revealList();
	}

	input.addEventListener('input', () => {
		chosenName = null; // the text no longer matches the place picked before
		clearTimeout(timer);
		const query = input.value.trim();
		if (query.length < 2){
			requestId++;
			clearList();
			return;
		}
		timer = setTimeout(async () => {
			const myId = ++requestId;
			const places = await suggestPlaces(query);
			// Only show these if nothing newer was typed and the box is still in use.
			if (myId !== requestId || document.activeElement !== input) return;
			render(places);
		}, SUGGEST_DELAY_MS);
	});

	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter'){
			e.preventDefault();
			if (currentPlaces.length) choose(currentPlaces[0]);
			else input.blur();
		} else if (e.key === 'Escape'){
			clearList();
		}
	});

	// If you leave the box without picking a suggestion, look up what you typed.
	input.addEventListener('blur', () => {
		clearTimeout(timer);
		const lookup = (async () => {
			await new Promise(resolve => setTimeout(resolve, BLUR_GRACE_MS));
			if (document.activeElement === input) return; // you came straight back to the box
			clearList();
			const query = input.value.trim();
			if (!query || query === chosenName) return;
			let place = null;
			try {
				place = await geocodePlace(query);
			} catch (err){
				console.error(err);
			}
			// Skip it if you picked a suggestion or typed something else meanwhile.
			if (!place || chosenName || input.value.trim() !== query) return;
			choose(place);
		})();
		pendingLookups.add(lookup);
		lookup.finally(() => pendingLookups.delete(lookup));
	});
}