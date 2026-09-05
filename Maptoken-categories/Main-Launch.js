import { MAPBOX_TOKEN } from './maptoken-config.js';
import {
	tripState, addStop, removeStop, setOrigin, setStopPlace, setDays, setRomanticStops, setRoute, isReadyToPlan 
	} from './state-and-data.js';
import {
	initMap, setOriginMarker, clearStopMarkers, addStopMarker, clearRomanticMarkers, addRomanticMarker, drawRoute, fitToCoordinates, showStatus, hideStatus
	} from './Map.js';
import {
	geocodePlace, getDirections, findRomanticStopsAlongRoute, balanceDays
	} from './Routing-Location.js';
	
	const originInput = document.getElementById('originInput');
	const stopsList = document.getElementById('stopsList');
	const addStopBtn = document.getElementById('addStopBtn');
	const daysInput = document.getElementById('daysInput');
	const scenicToggle = document.getElementById('scenicToggle');
	const planBtn = document.getElementById('planBtn');
	const summaryPanel = document.getElementById('summaryPanel');
	
	initMap();
	
/* ================== STOP LIST RENDERING ================ */
function renderStops(){
	stopsList.innerHTML = '';
	tripState.stops.forEach(stop => {
		const row = document.createElement('div');
		row.className = 'stop-row';
			
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'field-input';
		input.placeholder = 'City, address, or landmark';
		input.value = stop.name || '';
		input.dataset.stopId = stop.id;
		input.addEventListener('blur', onStopInputBlur);
			
		const removeBtn = document.createElement('button');
		removeBtn.className = 'remove-stop-btn'
		removeBtn.textContent = 'x';
		removeBtn.addEventListener('click', () => {
			removeStop(stop.id);
			renderStops();
		});
			
		row.appendChild(input);
		row.appendChild(removeBtn);
		stopsList.appendChild(row);
	});
}
	
addStopBtn.addEventListener('click', () => {
	addStop();
	renderStops();
});

/* ==================== GEOCODING ON BLUR ==================== */
async function onOriginalBlur(){
	const query = originInput.value.trim();
	if (!query) return;
	const place = await geocodePlace(query);
	if (place){
		setOrigin(place);
		originInput.value = place.name;
		setOriginMarker(place.lng, place.lat);
	}
}
async function onStopInputBlur(e){
	const input = e.target;
	const stopId = input.dataset.stopId;
	const query = input.value.trim();
	if (!query) return;
	const place = await geocodePlace(query);
	if (place){
		setStopPlace(stopId, place);
		input.value = place.name;
	}
}

originInput.addEventListener('blur', onOriginalBlur);
stopsList.addEventListener('blur', onStopInputBlur);

daysInput.addEventListener('input', () => setDays(daysInput.value));
scenicToggle.addEventListener('change', () => setRomanticStops(scenicToggle.checked));

/* ================ PLAN ROUTE ============== */
planBtn.addEventListener('click', planRoute);

async function planRoute(){
	if (!isReadyToPlan()){
		showStatus('Add a starting point and atleast one stop first');
		setTimeout(hideStatus, 2500);
		return;
	}

planBtn.disabled = true;
planBtn.textContent = 'Finding your route...';
summaryPanel.innerHTML = '';

try {
	const coords = [
		[tripState.origin.lng, tripState.origin.lat],...tripState.stops.map(s => [s.lng, s.lat])
		];
		
		const route = await getDirections(coords);
		setRoute(route);
		
		drawRoute({ type: 'Feature', geometry: route.geometry, properties: {} });
		fitToCoordinates(coords);
		
		clearStopMarkers();
		tripState.stops.forEach((s, i) => addStopMarker(s.lng, s.lat, String(i + 1)));
		
		const { totalHours, perDayHours } = balanceDays(route.durationSeconds, tripState.days);
		addSummaryCard(
			'Your Route',
			`${totalHours} hours of driving total \u2014 about ${perDayHours} hours per day over ${tripState.days} day${tripState.days > 1 ? 's' : ''}.`
		);
		
		if (tripState.findRomanticStops){
			showStatus('Looking for scenic stops along the way...');
			clearRomanticMarkers();
			const romanticStops = await findRomanticStopsAlongRoute(route.geometry);
			
			romanticStops.forEach(stop => addRomanticMarker(stop.lng, stop.lat, stop.name));
			
			if (romanticStops.length > 0){
				addSummaryCard(
					'Scenic stop nearby',
					`Found ${romanticStops.length} spot${romanticStops.length > 1 ? 's' : ''} worth a detour \u2014 tap the map marker to see them.`
				);
			} else {
				addSummaryCard('Scenic stops nearby', 'no scenic spots turned up along this route \u2014 try a different path ora. longer route.');
			}
			hideStatus();
		}
		
	} catch (err){
		console.error(err);
		showStatus(err.message || 'Something went wrong planning this route');
		setTimeout(hideStatus, 3000);
	} finally {
		planBtn.disabled = false;
		planBtn.textContent = 'Find our route';
	}
}

function addSummaryCard(title, text){
	const card = document.createElement('div');
	card.className = 'summary-card';
	card.innerHTML = `<h4>${title}</h4><p>${text}</p>`;
	summaryPanel.appendChild(card);
}

/* ============== INITIAL STATE ================ */
addStop();
renderStops();
