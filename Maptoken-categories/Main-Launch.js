import { MAPBOX_TOKEN } from './maptoken-config.js';
import {
	tripState, addStop, removeStop, setOrigin, setStopPlace, setDays, setMultiDay, setRomanticStops, setRoute, isReadyToPlan, insertStops
	} from './state-and-data.js';
import {
	initMap, setOriginMarker, clearStopMarkers, addStopMarker, renderRomanticStops, drawRoute, fitToCoordinates, showStatus, hideStatus,
	setAddToTripHandler, setLiveMarker, clearLiveMarker, followCamera, exitFollowCamera, setOnUserPanHandler
	} from './Map.js';

import {
	geocodePlace, getDirections, findRomanticStopsAlongRoute, balanceDays, suggestPlaces, searchStats,
	locateAlongRoute, findStopInsertionIndex, flattenRouteSteps
	} from './Routing-Location.js';
import {
	initCategoryFilter
} from './CategoryFilter.js'
import {
	initMapReveal, showMapView
} from './MapReveal.js';
	
	const originInput = document.getElementById('originInput');
	const stopsList = document.getElementById('stopsList');
	const addStopBtn = document.getElementById('addStopBtn');
	const daysInput = document.getElementById('daysInput');
	const scenicToggle = document.getElementById('scenicToggle');
	const multiDayToggle = document.getElementById('multiDayToggle');
	const daysFieldWrap = document.getElementById('daysFieldWrap');
	const planBtn = document.getElementById('planBtn');
	const summaryPanel = document.getElementById('summaryPanel');
	const originSuggestions = document.getElementById('originSuggestions');
	const startDriveBtn = document.getElementById('startDriveBtn');
	const stopDriveBtn = document.getElementById('stopDriveBtn');
	const navBanner = document.getElementById('navBanner');
	const navInstruction = document.getElementById('navInstruction');
	const navDistance = document.getElementById('navDistance');

	const METERS_PER_MILE = 1609.34;

	initMap();
	setAddToTripHandler(addScenicStopToTrip);
	setOnUserPanHandler(handleUserPan);
	initMapReveal();

	function debounce(fn, delay){
		let timer = null;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), delay);
		};
}

	function renderSuggestionsList(listEl, places, onSelect){
		listEl.innerHTML = '';
		places.forEach(place => {
			const item = document.createElement('li');
			item.className = 'suggestion-item';
			item.textContent = place.name;
			// mousedown (not click) so this fires before the input's blur event clears the list
			item.addEventListener('mousedown', (e) => {
				e.preventDefault();
				onSelect(place);
				listEl.innerHTML = '';
			});
			listEl.appendChild(item);
		});
	};
	
/* ================== STOP LIST RENDERING ================ */
function renderStops(){
	stopsList.innerHTML = '';
	tripState.stops.forEach(stop => {
		const row = document.createElement('div');
		row.className = 'stop-row';

		const wrap = document.createElement('div');
		wrap.className = 'autocomplete-wrap';

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'field-input';
		input.placeholder = 'City, address, or landmark';
		input.autocomplete = 'off';
		input.value = stop.name || '';
		input.dataset.stopId = stop.id;
		input.addEventListener('blur', onStopInputBlur);

		const suggestionsList = document.createElement('ul');
		suggestionsList.className = 'suggestions-list';

		input.addEventListener('input', debounce(async () => {
			const query = input.value.trim();
			if (query.length < 2){
				suggestionsList.innerHTML = '';
				return;
			}
			const places = await suggestPlaces(query);
			renderSuggestionsList(suggestionsList, places, (place) => {
				setStopPlace(stop.id, place);
				input.value = place.name;
			});
		}, 300));

		input.addEventListener('blur', () => {
			setTimeout(() => { suggestionsList.innerHTML = ''; }, 150);
		});

		wrap.appendChild(input);
		wrap.appendChild(suggestionsList);

		const removeBtn = document.createElement('button');
		removeBtn.className = 'remove-stop-btn'
		removeBtn.textContent = 'x';
		removeBtn.addEventListener('click', () => {
			removeStop(stop.id);
			renderStops();
		});

		row.appendChild(wrap);
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
		setOriginMarker(place.lng, place.lat, place.name);
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


originInput.addEventListener('input', debounce(async () => {
	const query = originInput.value.trim();
	if (query.length < 2){
		originSuggestions.innerHTML = '';
		return;
	}
	const places = await suggestPlaces(query);
	renderSuggestionsList(originSuggestions, places, (place) => {
		setOrigin(place);
		originInput.value = place.name;
		setOriginMarker(place.lng, place.lat, place.name);
	});
}, 300));

originInput.addEventListener('blur', () => {
	setTimeout(() => { originSuggestions.innerHTML = ''; }, 150);
});

originInput.addEventListener('blur', onOriginalBlur);
stopsList.addEventListener('blur', onStopInputBlur);

daysInput.addEventListener('input', () => setDays(daysInput.value));
scenicToggle.addEventListener('change', () => setRomanticStops(scenicToggle.checked));
multiDayToggle.addEventListener('change', () => {
	setMultiDay(multiDayToggle.checked);
	daysFieldWrap.hidden = !multiDayToggle.checked;
});

/* ================ PLAN ROUTE ============== */
planBtn.addEventListener('click', planRoute);


async function fetchAndDrawRoute({ fitCamera = true} = {}){
	const coords = [
		[tripState.origin.lng, tripState.origin.lat], ...tripState.stops.map(s => [s.lng, s.lat])
	];
	
	const route = await getDirections(coords);
	setRoute(route);

	drawRoute({ type: 'Feature', geometry: route.geometry, properties: {} });
	if (fitCamera) fitToCoordinates(coords);

	clearStopMarkers();
	tripState.stops.forEach((s, i) => addStopMarker(s.lng, s.lat, String(i + 1), s.name));

	updateStartDriveAvailability();
	return route;
}

async function planRoute(){
	if (!isReadyToPlan()){
		showStatus('Add a starting point and atleast one stop first');
		setTimeout(hideStatus, 2500);
		return;
	}

showMapView();
planBtn.disabled = true;
planBtn.textContent = 'Finding your route...';
summaryPanel.innerHTML = '';

try {
	
		const route = await fetchAndDrawRoute();
		
		renderRouteSummaryCards(route);
		
		if (tripState.findRomanticStops){
			showStatus('Looking for scenic stops along the way...');
			const romanticStops = await findRomanticStopsAlongRoute(route.geometry, tripState.selectedCategories);
			
			renderRomanticStops(romanticStops);

			if (searchStats.rateLimited > 0){
				addSummaryCard(
					'Heads up',
					`${searchStats.rateLimited} of ${searchStats.total} scenic searches were rate-limited by Mapbox and came back empty \u2014 some stretches of the route may be missing because of this, not because nothing is there.`
				);
			} else if (searchStats.failed > 0){
				addSummaryCard(
					'Heads up',
					`${searchStats.failed} of ${searchStats.total} scenic searches failed to load \u2014 some stretches of the route may be missing stops because of this.`
				);
			}
			
			if (romanticStops.length > 0){
				addSummaryCard(
					'Scenic stops nearby',
					`Found ${romanticStops.length} spot${romanticStops.length > 1 ? 's' : ''} worth a detour \u2014 tap the map marker to see them.`
				);
			} else {
				addSummaryCard('Scenic stops nearby', 'no scenic spots turned up along this route \u2014 try a different path or a longer route.');
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

async function addScenicStopToTrip(place){
	if (!tripState.route) return;

	const routeCoords = tripState.route.geometry.coordinates;
	const { distanceAlongRoute } = locateAlongRoute([place.lng, place.lat], routeCoords);
	const legMiles = tripState.route.legs.map(leg => leg.distanceMeters / METERS_PER_MILE);
	const insertIndex = findStopInsertionIndex(distanceAlongRoute, legMiles);

	insertStops(insertIndex, place);
	renderStops();

	showStatus('Adding this stop to your route...');
	try {
		await fetchAndDrawRoute({ fitCamera: true});
		hideStatus();
	} catch(err){
		console.error(err);
		showStatus('Could not add that stop to the route');
		setTimeout(hideStatus, 2500);
	}
}

function renderRouteSummaryCards(route){
	const { totalHours, perDayHours } = balanceDays(route.durationSeconds, tripState.days);

	let routeText = `${totalHours} hours of driving total.`;
	if (tripState.multiDay){
		routeText = `${totalHours} hours of driving total - about ${perDayHours} hours per day over ${tripState.days} day${tripState.days > 1 ? 's' : ''}.`;
	}
	addSummaryCard('Your Route', routeText);

	if (route.legs.length > 1){
		const waypointNames = [tripState.origin.name, ...tripState.stops.map(s => s.name)];
		const legLines = route.legs.map((leg, i) => {
			const legHours = Math.round((leg.durationSeconds / 3600) * 10) / 10;
			return `${waypointNames[i]} to ${waypointNames[i + 1]}: ${legHours} hours`;
		}).join('<br>');
		addSummaryCard('Drive time for each leg', legLines);
	}
}

function addSummaryCard(title, text){
	const card = document.createElement('div');
	card.className = 'summary-card';
	card.innerHTML = `<h4>${title}</h4><p>${text}</p>`;
	summaryPanel.appendChild(card);
}

let watchId = null;
let navSteps = [];
let currentStepIndex = 0;
let lastFixPoint = null;
let lastBearing;
let isFollowing = true;

function updateStartDriveAvailability(){
	startDriveBtn.disabled = !tripState.route;
}

function formatDistanceImperial(miles){
	const safeMiles = Math.max(0, miles);
	if (safeMiles < 0.1){
		const feet = Math.max(50, Math.round(safeMiles * 5280 / 50) * 50);
		return `${feet} ft`;
	}
	return `${safeMiles.toFixed(safeMiles < 1 ? 1 : 0)} mi`;
}

function bearingBetween(a, b){
	const [lng1, lat1] = [a[0] * Math.PI / 180, a[1] * Math.PI / 180];
	const [lng2, lat2] = [b[0] * Math.PI / 180, b[1] * Math.PI / 180];
	const dLng = lng2 - lng1;
	const y = Math.sin(dLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
	return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function updateNavBanner(distanceAlongMeters){
	if (!navSteps.length){
		navInstruction.textContent = 'Drive safely - directions will appear here';
		navDistance.textContent = '';
		return;
	}
	const nextStep = navSteps[currentStepIndex + 1];
	if (nextStep){
		navInstruction.textContent = nextStep.instruction || 'Continue on route';
		if (typeof distanceAlongMeters === 'number'){
			const remainingMeters = Math.max(0, nextStep.cumulativeDistanceMeters - distanceAlongMeters);
			navDistance.textContent = `in ${formatDistanceImperial(remainingMeters / METERS_PER_MILE)}`; 
		} else {
			navDistance.textContent = '';
		}
	} else {
		navInstruction.textContent = navSteps[currentStepIndex].instruction || 'You have arrived';
		navDistance.textContent = '';
	}
}

function handleUserPan(){
	if (watchId === null) return;
	if (isFollowing){
		isFollowing = false;
		recenterBtn.hidden = false;
	}
}

function recenterOnLiveMarker(){
	isFollowing = true;
	recenterBtn.hidden = true;
	if (lastFixPoint){
		followCamera(lastFixPoint[0], lastFixPoint[1], lastBearing);
	}
}

function handlePositionUpdate(position){
	const { longitude, latitude, heading } = position.coords;
	const point = [longitude, latitude];

	let bearing = (typeof heading === 'number' && !Number.isNaN(heading)) ? heading : null;
	if (bearing === null && lastFixPoint){
		bearing = bearingBetween(lastFixPoint, point);
	}
	lastFixPoint = point;
	if (bearing !== null) lastBearing = bearing;

	setLiveMarker(longitude, latitude, bearing === null ? undefined : bearing);
	if (isFollowing){
	followCamera(longitude, latitude, bearing === null ? undefined : bearing);
	}
	if (!tripState.route) return;
	const {distanceAlongRoute } = locateAlongRoute(point, tripState.route.geometry.coordinates);
	const distanceAlongMeters = distanceAlongRoute * METERS_PER_MILE;

	while (
		currentStepIndex < navSteps.length - 1 &&
		distanceAlongMeters >= navSteps[currentStepIndex + 1].cumulativeDistanceMeters
	){
		currentStepIndex++;
	}
	updateNavBanner(distanceAlongMeters);
}

function startNavigation(){
	if (!tripState.route){
		showStatus('Plan a route before starting the drive!');
		setTimeout(hideStatus, 2500);
		return;
	}
	if (!('geolocation' in navigator)){
		showStatus('This browser does not support GPS location');
		setTimeout(hideStatus, 3000);
		return;
	}

	navSteps = flattenRouteSteps(tripState.route);
	currentStepIndex = 0;
	lastFixPoint = null;
	isFollowing = true;
	recenterBtn.hidden = true;

	navInstruction.textContent = 'Getting your location...';
	navDistance.textContent = '';
	navBanner.hidden = false;
	startDriveBtn.hidden = true;

	followCamera(tripState.origin.lng, tripState.origin.lat);

	watchId = navigator.geolocation.watchPosition(
		handlePositionUpdate,
		(err) => {
			console.error(err);
			showStatus('Could not get your location - check location permissions');
			setTimeout(hideStatus, 3000);
		},
		{ enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
	);
}

function stopNavigation(){
	if (watchId != null){
		navigator.geolocation.clearWatch(watchId);
		watchId = null;
	}
	navBanner.hidden = true;
	startDriveBtn.hidden = false;
	isFollowing = true;
	recenterBtn.hidden = true;
	clearLiveMarker();
	exitFollowCamera();

	const coords = [
		[tripState.origin.lng, tripState.origin.lat], ...tripState.stops.map(s => [s.lng, s.lat])
	];
	fitToCoordinates(coords);
}

startDriveBtn.addEventListener('click', startNavigation);
stopDriveBtn.addEventListener('click', stopNavigation);
recenterBtn.addEventListener('click', recenterOnLiveMarker);

/* ============== INITIAL STATE ================ */
addStop();
renderStops();
initCategoryFilter();
