import { MAPBOX_TOKEN, DEFAULT_CENTER, DEFAULT_ZOOM } from './maptoken-config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

let map = null;
let originMarker = null;
let stopMarkers = [];
let romanticMarkers = [];

export function initMap(){
	map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/mapbox/light-v11',
		center: DEFAULT_CENTER,
		zoom: DEFAULT_ZOOM
		});
		
	map.addControl(new mapboxgl.NavigationControl(), 'top-right');
	
	// subtle warm tint over the base map so it matches the dusk pallette
	map.on('load', ()=> {
		const canvas = map.getCanvasContainer();
		canvas.style.filter = 'sepia(12%) saturate(115%) hue-rotate(-6deg)';
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
function buildPopupHTML({name, address, website, lng, lat }){
	const linkUrl = website || googleMapsUrl(name, address, lng, lat);
	const linkLabel = website ? 'Visit Website ↗' : 'View on Google Maps ↗';
	return `
		<div class="popup-place">
			<h4>${escapeHtml(name)}</h4>
			${address ? `<p class="popup-address">${escapeHtml(address)}</p>` : ''}
			<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="popup-link">${linkLabel}</a>
		</div>
	`;
}
export function setOriginMarker(lng, lat){
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

export function addStopMarker(lng, lat, label){
	const el = createMarkerEl('stop');
	el.textContent = label;
	const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
		.setLngLat([lng, lat])
		.setPopup(new mapboxgl.Popup({offset: 18 }).setHTML(buildPopupHTML({name: name || `Stop ${label}`, address: '', website: null, lng, lat})))
		.addTo(map);
	stopMarkers.push(marker);
	return marker;
}

export function clearRomanticMarkers(){
	romanticMarkers.forEach(m => m.remove());
	romanticMarkers = [];
}

export function addRomanticMarker(place){
	const el = createMarkerEl('romantic');
	const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom'})
		.setLngLat([place.lng, palce.lat])
		.setPopup(new mapboxgl.Popup({ offset: 18, maxWidth: '260px' }).setHTML(buildPopupHTML(place)))
		.addTo(map);
	romanticMarkers.push(marker);
	return marker;
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
	map.fitBounds(bounds, {padding: 60, duration: 900});
}

export function showStatus(message){
	const el = document.getElementById('mapStatus');
	el.textContent = message;
	el.classList.add('visible');
}

export function hideStatus(){
	document.getElementById('mapStatus').classList.remove('visible');
}
