import {MAPBOX_TOKEN, ROMANTIC_POI_CATEGORIES } from './maptoken-config.js';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';
const SEARCH_CATEGORY_URL = 'https://api.mapbox.com/search/searchbox/v1/category';

/* ============= GEOCODING =============== */
// Turns a typed place name into { name, lng, lat }
export async function geocodePlace(query){
	if (!query || query.trim().length < 2) return null;
	
	const url = `${GEOCODE_URL}/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('Geocoding request failed');
	
	const data = await res.json();
	if (!data.features || data.features.length === 0) return null;
	
	const feature = data.features[0];
	return {
		name: feature.place_name,
		lng: feature.center[0],
		lat: feature.center[1]
	};
}

/* ================ DIRECTIONS ================ */
// coordsArray: [[lng, lat], [lng, lat], ...] in visit order (origin first)
export async function getDirections(coordsArray){
	if (coordsArray.length < 2){
		throw new Error('Need at least an origin and one stop to plan a route');
	}
	
	const coordString = coordsArray.map(c => c.join(',')).join(';');
	const url = `${DIRECTIONS_URL}/${coordString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
	
	const res = await fetch(url);
	if (!res.ok) throw new Error('Directions request failed');
	const data = await res.json();
	if (!data.routes || data.routes.length === 0){
		throw new Error('No route found between those points');
	}
	
	const route = data.routes[0];
	return {
		geometry: route.geometry,
		distanceMeters: route.distance,
		durationSeconds: route.duration
	};
}

/* ================= ROMANTIC STOP SEARCH =================== */
// Picks evenly-spaced points along the route line to search near
function sampleRouteCoordinates(geometry, sampleCount = 5){
	const coords = geometry.coordinates;
	if (coords.length <= sampleCount) return coords;
	
	const step = Math.floor(coords.length / sampleCount);
	const samples = [];
	for (let i = 0; i < coords.length; i+= step){
		samples.push(coords[i]);
	}
	return samples;
}

async function searchCategoryNear(category, lng, lat){
	const url = `${SEARCH_CATEGORY_URL}/${encodeURIComponent(category)}?proximity=${lng},${lat}&limit=3&access_token=${MAPBOX_TOKEN}`;
	const res = await fetch(url);
	if (!res.ok) return [];
	
	const data = await res.json();
	if (!data.features) return [];
	
	return data.features.map(f => ({
		name: f.properties.name,
		lng: f.geometry.coordinates[0],
		lat: f.geometry.coordinates[1],
		category
	}));
}

// Finds scenic/romantic stops near the route, deduped by name+location
export async function findRomanticStopsAlongRoute(routeGeometry){
	const samplePoints = sampleRouteCoordinates(routeGeometry, 5);
	
	const searches =[];
	for (const [lng, lat] of samplePoints){
		for (const category of ROMANTIC_POI_CATEGORIES){
			searches.push(searchCategoryNear(category, lng, lat));
		}
	}
	
	const results = await Promise.all(searches);
	const flat = results.flat();
	
	const seen = new Set();
	const deduped = [];
	for (const place of flat){
		const key = place.name + '|' + place.lng.toFixed(3) + '|' + place.lat.toFixed(3);
		if (!seen.has(key)){
			seen.add(key);
			deduped.push(place);
		}
	}
	
	return deduped.slice(0, 12) //cap so map doesnt get overwhelming
}

/* ================== DAY BALANCING ================ */
// Splits total drive time evenly across the requested number of days
export function balanceDays(durationSeconds, days){
	const totalHours = durationSeconds / 3600;
	const perDayHours = totalHours / days;
	return {
		totalHours: Math.round(totalHours * 10) / 10,
		perDayHours: Math.round(perDayHours * 10)/ 10
	};
}
