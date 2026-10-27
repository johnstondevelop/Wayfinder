import {MAPBOX_TOKEN, ROMANTIC_POI_CATEGORIES, ROMANTIC_STOP_MAX_DISTANCE_MILES } from './maptoken-config.js';

const GEOCODE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';
const SEARCH_CATEGORY_URL = 'https://api.mapbox.com/search/searchbox/v1/category';

/* ============= GEOCODING =============== */
// Turns a typed place name into { name, lng, lat }
export async function geocodePlace(query){
	if (!query || query.trim().length < 2) return null;
	
	const url = `${GEOCODE_URL}/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&proximity=ip`;
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

	const url = `${GEOCODE_URL}/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&autocomplete=true&proximity=ip`;
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
// Turns Mapbox's reason for refusing a route into something readable, so
// "it didn't work" comes with a hint about why.
function directionsErrorMessage(status, data){
	const code = data && data.code;
	const detail = data && data.message;
	if (status === 401 || status === 403 || code === 'NotAuthorized' || code === 'Forbidden'){
		return `Mapbox turned this request down (${status}). The access token or its URL restrictions may need a look.`;
	}
	if (status === 429 || code === 'TooManyRequests'){
		return 'Too many route requests in a short time. Wait a minute and try again.';
	}
	if (code === 'NoSegment'){
		return "One of your places is too far from a road to drive to. Try a nearby town or address instead.";
	}
	if (code === 'NoRoute' || status === 200){
		return "Couldn't find a drivable route between those places. Check that each place is the one you meant.";
	}
	if (detail){
		return `Mapbox couldn't plan this route: ${detail}`;
	}
	return `Directions request failed (error ${status}).`;
}

// coordsArray: [[lng, lat], [lng, lat], ...] in visit order (origin first)
export async function getDirections(coordsArray){
	if (coordsArray.length < 2){
		throw new Error('Need at least an origin and one stop to plan a route');
	}
	
	const coordString = coordsArray.map(c => c.join(',')).join(';');
	const url = `${DIRECTIONS_URL}/${coordString}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
	
	const res = await fetch(url);
	let data = null;
	try{
		data = await res.json();
	} catch (err){
		// no readable body; handled below
	}
	if (!res.ok || !data || !data.routes || data.routes.length === 0){
		console.error('Directions request failed', res.status, data);
		throw new Error(directionsErrorMessage(res.status, data));
	}
	const route = data.routes[0];
	return {
		geometry: route.geometry,
		distanceMeters: route.distance,
		durationSeconds: route.duration,
		legs: (route.legs || []).map(leg => ({
			distanceMeters: leg.distance,
			durationSeconds: leg.duration,
			steps: (leg.steps || []).map(step=> ({
				instruction: step.maneuver.instruction,
				type: step.maneuver.type,
				modifier: step.maneuver.modifier || null,
				location: step.maneuver.location,
				distanceMeters: step.distance,
				durationSeconds: step.duration
			}))
		}))
	};
}

/* ================= Turn-BY-TURN STEP FLATTENING ============*/
// Lays every legs steps end-to-end into one list, each tagged with how far
// (in meters) it sits from the very start of the route - this is what lets
// the live GPS position be compared against a single running distance instead
// of juggling leg/step indices seperately
export function flattenRouteSteps(route){
	const steps = [];
	let cumulative = 0;
	(route.legs || []).forEach(leg => {
		(leg.steps || []).forEach(step => {
		steps.push({ ...step, cumulativeDistanceMeters: cumulative});
		cumulative += step.distanceMeters;
		});	
	});
return steps;
}

/* ================= ROMANTIC STOP SEARCH =================== */
// Picks evenly-spaced points along the route line to search near
function delay(ms){
	return new Promise(resolve => setTimeout(resolve, ms));
}
function haversineMiles(a, b){
	const R = 3958.8;
	const [lng1, lat1] = a;
	const [lng2, lat2] = b;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const s = Math.sin(dLat / 2) ** 2 + 
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));

}
function sampleRouteCoordinates(geometry, sampleCount = 6){
	const coords = geometry.coordinates;
	if (coords.length <= sampleCount) return coords;

	const cumulative = [0];
	for (let i = 1; i < coords.length; i++){
		cumulative.push(cumulative[i - 1] + haversineMiles(coords[i - 1], coords[i]));
	}
	const totalDistance = cumulative[cumulative.length - 1];

	const samples = [];
	for (let s = 0; s < sampleCount; s++){
		const targetDistance = (totalDistance * s) / (sampleCount - 1);
		let idx = cumulative.findIndex(d => d >= targetDistance);
		if (idx === -1) idx = coords.length - 1;
		samples.push(coords[idx]);
	}
	return samples;
}

/* async function  searchCategoryNear(category, lng, lat){
	const url = `${SEARCH_CATEGORY_URL}/${encodeURIComponent(category)}?proximity=${lng},${lat}&limit=3&access_token=${MAPBOX_TOKEN}`;
	const res = await fetch(url);
	if (!res.ok) return []; */

		export const searchStats = { total: 0, failed: 0, rateLimited: 0 };

	// Mapbox turns away scenic searches that arrive in a big burst (about ten
	// at the same instant), but happily answers a steady stream of them. So
	// rather than firing a whole batch at once, the searches are started one
	// at a time, SEARCH_GAP_MS apart, and any that still get turned away
	// (status 429) wait a moment and try again.
	const SEARCH_GAP_MS = 50;      // about 20 searches a second
	const SEARCH_RETRIES = 3;

	async function searchCategoryNear(category, lng, lat){
		const url = `${SEARCH_CATEGORY_URL}/${encodeURIComponent(category)}?proximity=${lng},${lat}&limit=3&access_token=${MAPBOX_TOKEN}`;
		searchStats.total++;

		let res = null;
		for (let attempt = 0; attempt <= SEARCH_RETRIES; attempt++){
			try {
				res = await fetch(url);
			} catch (err){
				res = null; // no connection; counted as failed below
				break;
			}
			if (res.status !== 429 || attempt === SEARCH_RETRIES) break;
			await delay(500 * (attempt + 1));
		}
		if (!res || !res.ok){
			searchStats.failed++;
			if (res && res.status === 429) searchStats.rateLimited++;
			return [];
		}
	
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
	const y = (lat * Math.PI / 180) * EARTH_RADIUS_MILES;
	return [x, y];
}
function projectPointOntoSegment(point, a, b){
	const refLatRad = point[1] * Math.PI / 180;
	const [px, py] = toLocalXY(point[0], point[1], refLatRad);
	const [ax, ay] = toLocalXY(a[0], a[1], refLatRad);
	const [bx, by] = toLocalXY(b[0], b[1], refLatRad);

	const dx = bx - ax;
	const dy = by - ay;
	const lengthSq = dx * dx + dy * dy;

	let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq;
	t = Math.max(0, Math.min(1, t));

	const closestX = ax + t * dx;
	const closestY = ay + t * dy;
	return { t, distanceMiles: Math.hypot(px - closestX, py - closestY) };
}
function pointToSegmentMiles(point, a, b){
	return projectPointOntoSegment(point, a, b).distanceMiles;
}

function distanceToRouteMiles(place, routeCoords){
	let min = Infinity;
	for (let i = 0; i < routeCoords.length - 1; i++){
		const d = pointToSegmentMiles([place.lng, place.lat], routeCoords[i], routeCoords[i + 1]);
		if (d < min) min = d;
	}
	return min;
}

/* ============================= POSITION ALONG ROUTE ==================== */
export function locateAlongRoute(point, routeCoords){
	let best = { distanceAlongRoute: 0, distanceFromRoute: Infinity };
	let cumulative = 0;
	for (let i = 0; i < routeCoords.length - 1; i++){
		const a = routeCoords[i];
		const b = routeCoords[i + 1];
		const segmentMiles = haversineMiles(a, b);
		const { t, distanceMiles } = projectPointOntoSegment(point, a, b);
		if (distanceMiles < best.distanceFromRoute){
			best = {
				distanceAlongRoute: cumulative + segmentMiles * t,
				distanceFromRoute: distanceMiles
			};
		}
		cumulative += segmentMiles;
	}
	return best;
}
export function findStopInsertionIndex(distanceAlongRouteMiles, legDistanceMiles){
	let cumulative = 0;
	for (let i = 0; i < legDistanceMiles.length; i++){
		cumulative += legDistanceMiles[i];
		if (distanceAlongRouteMiles < cumulative) return i;
	}
	return legDistanceMiles.length;
}

// Finds scenic/romantic stops near the route, deduped by name+location
// Finds scenic/romantic stops near the route, deduped by name+location.
// onProgress (optional) is called as results come in with
// { fraction, stops }: how far along the search is (0 to 1), and the
// stops found so far, so the map can fill in while the search runs.
export async function findRomanticStopsAlongRoute(routeGeometry, categories = ROMANTIC_POI_CATEGORIES, onProgress = null){
	searchStats.total = 0;
	searchStats.failed = 0;
	searchStats.rateLimited = 0;
	const samplePoints = sampleRouteCoordinates(routeGeometry, 10);

	// search each sample point seperately so results stay grouped by location along the route
	const perPointResults = samplePoints.map(() => []);
	const jobs = [];
	samplePoints.forEach(([lng, lat], pointIndex) => {
		categories.forEach(category => jobs.push({ category, lng, lat, pointIndex }));
	});

	let done = 0;
	const running = [];
	for (const job of jobs){
		running.push((async () => {
			const places = await searchCategoryNear(job.category, job.lng, job.lat);
			perPointResults[job.pointIndex].push(...places);
			done++;
			if (onProgress && (done % 10 === 0 || done === jobs.length)){
				onProgress({ fraction: done / jobs.length, stops: spreadAlongRoute(perPointResults, samplePoints) });
			}
		})());
		await delay(SEARCH_GAP_MS);
	}
	await Promise.all(running);

	return spreadAlongRoute(perPointResults, samplePoints);
}

// Dedupes the results and interleaves them point by point, so the stops
// shown are spread along the whole route instead of bunched at the start.
function spreadAlongRoute(perPointResults, samplePoints){
	// Dedupe globally, but keep results grouped by sample point
	const seen = new Set();
	const dedupedPerPoint = perPointResults.map((pointResults, i) => {
		const [sampleLng, sampleLat] = samplePoints[i];
		const out = [];
		for (const place of pointResults){
			const key = place.name + '|' + place.lng.toFixed(3) + '|' + place.lat.toFixed(3);
			if (seen.has(key)) continue;
			const distanceFromSearchPoint = haversineMiles([place.lng, place.lat], [sampleLng, sampleLat]);
			if (distanceFromSearchPoint > ROMANTIC_STOP_MAX_DISTANCE_MILES) continue;
				seen.add(key);
				out.push(place);
		}
	return out;//cap so map doesnt get overwhelming
});

const spread = [];
let tookOne = true;
while (tookOne && spread.length < 200){
	tookOne = false;
	for (const pointResults of dedupedPerPoint){
		if (pointResults.length){
			spread.push(pointResults.shift());
			tookOne = true;
			if (spread.length >= 200) break;
		}
	}
}
return spread;
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

