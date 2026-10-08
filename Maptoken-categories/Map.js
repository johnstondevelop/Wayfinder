import { MAPBOX_TOKEN, DEFAULT_CENTER, DEFAULT_ZOOM } from './maptoken-config.js';
import { ROMANTIC_POI_CATEGORY_ICONS } from './CategoryIcons.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

let map = null;
let originMarker = null;
let stopMarkers = [];
let romanticPopup = null;
let liveMarker = null;
let liveMarkerEl = null;
let addToTripHandler = null;
let onUserPanHandler = null;
let fitPaddingProvider = null;
const scenicPlacesByKey = new Map();

const ROMANTIC_SOURCE_ID = 'romantic-points';

function placeKey(place){
	return `${place.name}|${place.lng.toFixed(5)}|${place.lat.toFixed(5)}`;
}
export function setAddToTripHandler(fn){
	addToTripHandler = fn;
}

export function setOnUserPanHandler(fn){
	onUserPanHandler = fn;
}

export function setFitPaddingProvider(fn){
	fitPaddingProvider = fn;
}

export function initMap(){
	map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/mapbox/light-v11',
		center: DEFAULT_CENTER,
		zoom: DEFAULT_ZOOM
		});
		
	map.addControl(new mapboxgl.NavigationControl(), 'top-right');

	map.on('movestart', (e) => {
		if (e.originalEvent){
			if (liveMarkerEl) liveMarkerEl.style.transition = 'none';
			if (onUserPanHandler) onUserPanHandler();
		}
	});

	map.on('moveend', () => {
		if (liveMarkerEl) liveMarkerEl.style.transition = '';
	})
	
	// subtle warm tint over the base map so it matches the dusk pallette
	map.on('load', ()=> {
		const canvas = map.getCanvasContainer();
		canvas.style.filter = 'sepia(12%) saturate(115%) hue-rotate(-6deg)';

		map.addSource(ROMANTIC_SOURCE_ID, {
				type: 'geojson',
				data: {type: 'FeatureCollection', features: []},
				cluster: true,
				clusterMaxZoom: 8,
				clusterRadius: 50
		});

		map.addLayer({
				id: 'romantic-clusters',
				type: 'circle',
				source: ROMANTIC_SOURCE_ID,
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#D98E96',
					'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
					'circle-stroke-width': 3,
					'circle-stroke-color': '#FFFFFF'
				}
		});

		map.addLayer({
				id: 'romantic-cluster-count',
				type: 'symbol',
				source: ROMANTIC_SOURCE_ID,
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
					'text-size': 13
				},
				paint: { 'text-color': '#5C2135'}
			});
	
		map.addLayer({
			id: 'romantic-unclustered',
			type: 'circle',
			source: ROMANTIC_SOURCE_ID,
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-color': '#D98E96',
				'circle-radius': 8,
				'circle-stroke-width': 2.5,
				'circle-stroke-color': '#FFFFFF'
			}
		});

		map.on('click', 'romantic-clusters', (e) => {
			const features = map.queryRenderedFeatures(e.point, {layers: ['romantic-clusters'] });
			const clusterId = features[0].properties.cluster_id;
			map.getSource(ROMANTIC_SOURCE_ID).getClusterExpansionZoom(clusterId, (err, zoom) => {
				if (err) return;
				map.easeTo({center: features[0].geometry.coordinates, zoom });
			});
		});

		map.on('click', 'romantic-unclustered', (e) => {
			const feature = e.features[0];
			const coords = feature.geometry.coordinates.slice();
			const key = placeKey({ name: feature.properties.name, lng: coords[0], lat: coords[1] });
			if (romanticPopup) romanticPopup.remove();
			romanticPopup = new mapboxgl.Popup({offset: 12, maxWidth: '260px' })
			.setLngLat(coords)
			.setHTML(buildPopupHTML({ ...feature.properties, lng: coords[0], lat: coords[1], addToTripKey: addToTripHandler ? key : null }))
			.addTo(map);
		});

		['romantic-clusters', 'romantic-unclustered'].forEach(layerId => {
			map.on('mouseenter', layerId, () => {map.getCanvas().style.cursor = 'pointer'; });
			map.on('mouseleave', layerId, () => {map.getCanvas().style.cursor = ''; });
		});
	});
		
	requestAnimationFrame(() => map.resize());
	window.addEventListener('resize', () => map.resize());
	window.addEventListener('orientationchange', () => setTimeout(() => map.resize(), 250));
	
	map.getContainer().addEventListener('click', (e) => {
		const btn = e.target.closest('.popup-add-trip-btn');
		if (!btn) return;
		const place = scenicPlacesByKey.get(btn.dataset.addTripKey);
		if (place && addToTripHandler){
			addToTripHandler(place);
			btn.textContent = 'Added!';
			btn.disabled = true;
		}
	});

	return map;
}

function createMarkerEl(kind){
	const el = document.createElement('div');
	el.className = 'map-marker map-marker-' + kind;
	return el;
}
function escapeHtml(str){
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}
function googleMapsUrl(name, address, lng, lat){
	const query = address ? `${name}, ${address}` : `${name} @${lat},${lng}`;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function appleMapsUrl(name, address, lng, lat){
	// Apple Maps web links: pin the coordinates and label them with the place name/address as the search query
	const query = address ? `${name}, ${address}` : name;
	return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(query)}`;
}
function buildPopupHTML({name, address, website, lng, lat, category, addToTripKey }){
	const links = [];
	if (website){
		links.push(`<a href="${website}" target="_blank" rel="noopener noreferrer" class="popup-link">Website ↗</a>`);
	}
	links.push(`<a href="${googleMapsUrl(name, address, lng, lat)}" target="_blank" rel="noopener noreferrer" class="popup-link">Google Maps ↗</a>`);
	links.push(`<a href="${appleMapsUrl(name, address, lng, lat)}" target="_blank" rel="noopener noreferrer" class="popup-link">Apple Maps ↗</a>`);
	if (addToTripKey){
		links.push(`<button type="button" class="popup-add-trip-btn" data-add-trip-key="${escapeHtml(addToTripKey)}">+ Add to trip </button`);
	}

	const icon = category ? ROMANTIC_POI_CATEGORY_ICONS[category] : null;

	return `
		<div class="popup-place">
			<div class="popup-header">
				${icon ? `<span class="popup-icon">${icon}</span>` : ''}
				<h4>${escapeHtml(name)}</h4>
			</div>
			${address ? `<p class="popup-address">${escapeHtml(address)}</p>` : ''}
			<div class="popup-links">${links.join('')}</div>
		</div>
	`;
}
export function setOriginMarker(lng, lat, name){
	if (originMarker) originMarker.remove();
	const el = createMarkerEl('origin');
	originMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
		.setLngLat([lng, lat])
		.setPopup(new mapboxgl.Popup({offset: 18}).setHTML(buildPopupHTML({name: name || 'Starting Point', address: '', website: null, lng, lat})))
		.addTo(map);
	return originMarker;
}
export function clearStopMarkers(){
	stopMarkers.forEach(m => m.remove());
	stopMarkers = [];
}

export function addStopMarker(lng, lat, label, name){
	const el = createMarkerEl('stop');
	el.textContent = label;
	const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
		.setLngLat([lng, lat])
		.setPopup(new mapboxgl.Popup({offset: 18 }).setHTML(buildPopupHTML({name: name || `Stop ${label}`, address: '', website: null, lng, lat})))
		.addTo(map);
	stopMarkers.push(marker);
	return marker;
}

export function renderRomanticStops(places){
	const source = map.getSource(ROMANTIC_SOURCE_ID);
	if (!source) return;
	scenicPlacesByKey.clear();
	places.forEach(place => scenicPlacesByKey.set(placeKey(place), place));
	source.setData({
		type: 'FeatureCollection',
		features: places.map(place => ({
			type: 'Feature',
			geometry: {type: 'Point', coordinates: [place.lng, place.lat] },
			properties: {
				name: place.name,
				address: place.address || '',
				website: place.website || null,
				category: place.category || null
			}
		}))
	});
}

export function drawRoute(geojson){
	if (map.getSource('route')){
		map.getSource('route').setData(geojson);
		return;
	}

	map.addSource('route', { type: 'geojson', data: geojson});
	map.addLayer({
		id: 'route-line',
		type: 'line',
		source: 'route',
		layout: { 'line-join': 'round', 'line-cap': 'round' },
		paint: {
			'line-color': '#C98A4B',
			'line-width': 4,
			'line-opacity': 0.9
		}
	});
}

export function fitToCoordinates(coords){
	if (!coords.length) return;
	const bounds = coords.reduce(
		(b, c) => b.extend(c),
		new mapboxgl.LngLatBounds(coords[0], coords[0])
	);
	const padding = fitPaddingProvider ? fitPaddingProvider() : 60;
	map.fitBounds(bounds, {padding, duration: 900});
}

const LIVE_MARKER_ICON = '<svg viewBox="0 0 24 24" width="22" height="22"><path transform="rotate(180 12 12)" d ="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.43 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="white" stroke-width="1.4" stroke-linejoin="round"/></svg>';

export function setLiveMarker(lng, lat, heading){
	if (!liveMarker){
		const el = createMarkerEl('live');
		el.innerHTML = LIVE_MARKER_ICON;
		liveMarkerEl = el;
		liveMarker = new mapboxgl.Marker({element: el, anchor: 'center', rotationAlignment: 'map' })
			.setLngLat([lng, lat])
			.addTo(map);
	} else {
		liveMarker.setLngLat([lng, lat])
	}
	if (typeof heading === 'number' && !Number.isNaN(heading)){
		liveMarker.setRotation(heading);
	}
}
export function clearLiveMarker(){
	if (liveMarker){
		liveMarker.remove();
		liveMarker = null;
		liveMarkerEl = null;
	}
}
export function followCamera(lng, lat, bearing){
	map.easeTo({
		center: [lng, lat],
		zoom: 17,
		bearing: typeof bearing === 'number' && !Number.isNaN(bearing) ? bearing : map.getBearing(),
		pitch: 60,
		duration: 800
	});
}

export function exitFollowCamera(){
	map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
}

export function showStatus(message){
	const el = document.getElementById('mapStatus');
	el.textContent = message;
	el.classList.add('visible');
}

export function hideStatus(){
	document.getElementById('mapStatus').classList.remove('visible');
}