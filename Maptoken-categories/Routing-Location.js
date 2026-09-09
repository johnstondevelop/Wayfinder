import {MAPBOX_TOKEN, ROMANTIC_POI_CATEGORIES, ROMANTIC_STOP_MAX_DISTANCE_MILES } from './maptoken-config.js';

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

/* ============= AUTOCOMPLETE SUGGESTIONS =============== */
// Returns up to 5 candidate places for a partially-typed query
export async function suggestPlaces(query){
	if (!query || query.trim().length < 2) return [];

	const url = `${GEOCODE_URL}/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&autocomplete=true`;
	const res = await fetch(url);
	if (!res.ok) return [];

	const data = await res.json();
	if (!data.features) return [];

	return data.features.map(f => ({
		name: f.place_name,
		lng: f.center[0],
		lat: f.center[1]
	}));
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
		category,
		address: f.properties.full_address || f.properties.place_formatted || '',
		website: (f.properties.metadata && f.properties.metadata.website) || null
	}));
}

/* =================== DISTANCE_TO_ROUTE CHECK ======================= */
const EARTH_RADIUS_MILES = 3958.8

function toLocalXY(lng, lat, refLatRad){
	const x = (lng * Math.PI / 180) * Math.cos(refLatRad) * EARTH_RADIUS_MILES;
	const y = (lat * Math.PI / 180) * EARTH_RADISU_MILES;
	return [x, y];
}
function pointToSegmentMiles(point, a, b){
	const refLatRad = point[1] * Math.PI / 180;
	const [px, py] = toLocalXY(point[0], point[1], refLatRad);
	const [ax, ay] = toLocalXY(a[0], a[1], refLatRad);
	const [bx, by] = toLocalXY(b[0], b[1], refLatRad);

	const dx = bx - ax;
	const dy = by-ay;
	const lengthSq = dx * dx + dy * dy;

	let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq;
	t = Math.max(0, Math.min(1, t));

	const closestX = ax + t * dy;
	const closestY = ay + t * dy;
	return Math.hypot(px - closestX, py - closestY);
}

function distanceToROuteMiles(place, routeCoords){
	let min = Infinity;
	for (let i = 0; i < routeCoords.length - 1; i++){
		const d = pointToSegmentMiles([place.lng, place.lat], routeCoords[i], routeCoords[i + 1]);
		if (d < min) min = d;
	}
	return min;
}

// Finds scenic/romantic stops near the route, deduped by name+location
export async function findRomanticStopsAlongRoute(routeGeometry){
	const samplePoints = sampleRouteCoordinates(routeGeometry, 6);

	// search each sample point seperately so results stay grouped by locationm along the route
	const perPointResults = await Promise.all(
		samplePoints.map(async ([lng, lat]) => {
			const searches = ROMANTIC_POI_CATEGORIES.map(category => searchCategoryNear(category, lng, lat));
			const results = await Promise.all(searches);
			return results.flat();
		})
	);
	
	// Dedupe globally, but keep results grouped by sample point
	const seen = new Set();
	const dedupedPerPoint = perPointResults.map(pointResults => {
		const out = [];
	
	for (const place of pointResults){
		const key = place.name + '|' + place.lng.toFixed(3) + '|' + place.lat.toFixed(3);
		if (!seen.has(key)){
			seen.add(key);
			deduped.push(place);
		}

	}
	
	return out;//cap so map doesnt get overwhelming
});

const spread = [];
let tookOne = true;
while (tookOne && spread.length < 12){
	tookOne = false;
	for (const pointResults of dedupedPerPoint){
		if (pointResults.length){
			spread.push(pointResults.shift());
			tookOne = true;
			if (spread.length >= 12) break;
		}
	}
}
return spread;
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
}
