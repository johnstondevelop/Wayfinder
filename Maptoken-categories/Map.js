import { MAPBOX_TOKEN, DEFAULT_CENTER, DEFAULT_ZOOM } from './maptoken-config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

let map = null;
let originMarker = null;
let stopMarkers = [];
let romanticPopup = null;

const ROMANTIC_SOURCE_ID = 'romantic-points';

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
			if (romanticPopup) romanticPopup.remove();
			romanticPopup = new mapboxgl.Popup({offset: 12, maxWidth: '260px' })
			.setLngLat(coords)
			.setHTML(buildPopupHTML({ ...feature.properties, lng: coords[0], lat: coords[1] }))
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
	source.setData({
		type: 'FeatureCollection',
		features: places.map(place => ({
			type: 'Feature',
			geometry: {type: 'Point', coordinates: [place.lng, place.lat] },
			properties: {
				name: place.name,
				address: place.address || '',
				website: place.website || null
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
