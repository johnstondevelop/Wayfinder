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

export function setOriginMarker(lng, lat){
	if (originMarker) originMarker.remove();
	const el = createMarkerEl('origin');
	originMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
		.setLngLat([lng, lat])
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
		.addTo(map);
	stopMarkers.push(marker);
	return marker;
}

export function clearRomanticMarkers(){
	romanticMarkers.forEach(m => m.remove());
	romanticMarkers = [];
}

export function addRomanticMarker(lng, lat, name){
	const el = createMarkerEl('romantic');
	const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom'})
		.setLngLat([lng, lat])
		.setPopup(new mapboxgl.Popup({ offset: 18 }).setText(name))
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
