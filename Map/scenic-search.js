// Finds scenic stops along a route, spread evenly from start to finish.
//
// How it works:
// 1. The route is cut into equal stretches (more of them on longer drives),
//    and each kind of stop is searched once per stretch, inside a box drawn
//    around that part of the road. Each search asks Mapbox for up to 25
//    places, its maximum, so fewer searches find more places.
// 2. Every place found is measured against the road itself, and anything
//    more than ROMANTIC_STOP_MAX_DISTANCE_MILES off the route is dropped.
// 3. The route is split into short pieces, and stops are picked from each
//    piece in turn, mixing kinds of stops, so they're spread along the whole
//    drive instead of piling up around towns.
// 4. Pieces still empty after that get a second, closer look.
import { MAPBOX_TOKEN, ROMANTIC_POI_CATEGORIES, ROMANTIC_STOP_MAX_DISTANCE_MILES } from './maptoken-config.js';
import { mapboxIdsFor, categoryLabel } from './category-check.js';
import { locateAlongRoute } from './Routing-Location.js';

const CATEGORY_URL = 'https://api.mapbox.com/search/searchbox/v1/category';

const MAX_STOPS = 400;           // most stops shown on the map
const RESULTS_PER_SEARCH = 25;   // the most Mapbox gives per search
const SEARCH_BUDGET = 120;       // most searches in the main pass (fewer = faster)
const MILES_PER_STRETCH = 25;    // aim for one search stretch per this many miles
const MILES_PER_PIECE = 10;      // stops are shared out between pieces this long
const THIN_PIECE_STOPS = 2;      // a piece with fewer stops than this gets a second look
const GAP_FILL_PIECES = 8;       // most empty pieces that get a second look
const GAP_FILL_KINDS = 3;        // kinds of stop tried in each of those
const FASTEST_GAP_MS = 50;       // shortest time between starting searches (20 a second)
const SLOWEST_GAP_MS = 120;      // longest, if Mapbox keeps saying we're going too fast
const SEARCH_RETRIES = 3;

// Mapbox gives the places nearest a point first. Kinds of stop take turns
// aiming at the middle, the start and the end of each stretch (these are
// how far along the stretch, from 0 to 1), so a busy town in the middle
// doesn't use up every search and leave the ends of the stretch bare.
const AIM_POINTS = [0.5, 0.15, 0.85];


// Broad kinds of stop that are most likely to fill an empty piece of road.
const GAP_FILL_FAVORITES = ['viewpoint', 'park', 'historic_site', 'trailhead', 'cafe', 'museum'];

export const scenicSearchStats = { total: 0, failed: 0, rateLimited: 0, skipped: [], fromCache: 0 };

// Answers already fetched, by search address, so asking again is instant.
const answerCache = new Map();
let searchGapMs = FASTEST_GAP_MS;

function delay(ms){
	return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(value, low, high){
	return Math.max(low, Math.min(high, value));
}

function milesBetween([lng1, lat1], [lng2, lat2]){
	const toRad = Math.PI / 180;
	const dLat = (lat2 - lat1) * toRad;
	const dLng = (lng2 - lng1) * toRad;
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
	return 2 * 3958.8 * Math.asin(Math.sqrt(s));
}

// A lighter copy of the route line, so measuring hundreds of places
// against it stays quick.
function thinRoute(coords, maxPoints = 400){
	if (coords.length <= maxPoints) return coords;
	const step = (coords.length - 1) / (maxPoints - 1);
	const thin = [];
	for (let i = 0; i < maxPoints; i++) thin.push(coords[Math.round(i * step)]);
	return thin;
}

// How far along the route (in miles) each of its points is.
function runningMiles(coords){
	const miles = [0];
	for (let i = 1; i < coords.length; i++) miles.push(miles[i - 1] + milesBetween(coords[i - 1], coords[i]));
	return miles;
}

// The route's points between two distances along it (always at least two).
function routeBetween(coords, miles, fromMile, toMile){
	const points = coords.filter((point, i) => miles[i] >= fromMile && miles[i] <= toMile);
	return points.length >= 2 ? points : [pointAtMile(coords, miles, fromMile), pointAtMile(coords, miles, toMile)];
}

// The spot on the route a given number of miles from the start.
function pointAtMile(coords, miles, mile){
	const i = miles.findIndex(m => m >= mile);
	if (i <= 0) return coords[i === 0 ? 0 : coords.length - 1];
	const t = (mile - miles[i - 1]) / ((miles[i] - miles[i - 1]) || 1);
	return [
		coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
		coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t
	];
}

// A box around some points, padded by padMiles on every side, written the
// way Mapbox wants it: "west,south,east,north".
function boxAround(points, padMiles){
	const lngs = points.map(p => p[0]);
	const lats = points.map(p => p[1]);
	const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
	const padLat = padMiles / 69;
	const padLng = padMiles / (69 * Math.max(0.2, Math.cos(midLat * Math.PI / 180)));
	return [
		clamp(Math.min(...lngs) - padLng, -180, 180),
		clamp(Math.min(...lats) - padLat, -90, 90),
		clamp(Math.max(...lngs) + padLng, -180, 180),
		clamp(Math.max(...lats) + padLat, -90, 90)
	].map(n => n.toFixed(5)).join(',');
}

function searchAddress(mapboxId, box, center){
	return `${CATEGORY_URL}/${encodeURIComponent(mapboxId)}?bbox=${box}&proximity=${center[0].toFixed(5)},${center[1].toFixed(5)}`
		+ `&limit=${RESULTS_PER_SEARCH}&access_token=${MAPBOX_TOKEN}`;
}

// One Mapbox search. If Mapbox turns it away for going too fast (429), it
// waits and tries again, and the searches after it slow down a little; each
// one that goes through speeds them back up, so the search runs as fast as
// Mapbox allows at that moment.
async function searchMapbox(address){
	if (answerCache.has(address)){
		scenicSearchStats.fromCache++;
		return answerCache.get(address);
	}
	scenicSearchStats.total++;

	let res = null;
	for (let attempt = 0; attempt <= SEARCH_RETRIES; attempt++){
		try {
			res = await fetch(address);
		} catch (err){
			res = null; // no connection; counted as failed below
			break;
		}
		if (res.status !== 429 || attempt === SEARCH_RETRIES) break;
		searchGapMs = Math.min(SLOWEST_GAP_MS, searchGapMs * 1.3);
		await delay(400 * (attempt + 1));
	}
	if (res && res.ok) searchGapMs = Math.max(FASTEST_GAP_MS, searchGapMs - 2);
	if (!res || !res.ok){
		scenicSearchStats.failed++;
		if (res && res.status === 429) scenicSearchStats.rateLimited++;
		return [];
	}

	const data = await res.json();
	const places = (data.features || []).map(f => ({
		name: f.properties.name,
		lng: f.geometry.coordinates[0],
		lat: f.geometry.coordinates[1],
		address: f.properties.full_address || f.properties.place_formatted || '',
		website: (f.properties.metadata && f.properties.metadata.website) || null
	}));
	answerCache.set(address, places);
	return places;
}

// Starts each search a short gap after the last (saved answers skip the
// wait), then waits for all of them to finish.
async function runSearches(jobs, onEachDone){
	const running = [];
	for (const job of jobs){
		const saved = answerCache.has(job.address);
		running.push(searchMapbox(job.address).then(places => onEachDone(job, places)));
		if (!saved) await delay(searchGapMs);
	}
	await Promise.all(running);
}

// Orders one piece's stops: closest to the road first, but taking turns
// between kinds, so one piece isn't all cafes.
function mixKinds(places){
	const byKind = new Map();
	places
		.sort((a, b) => a.milesOffRoute - b.milesOffRoute)
		.forEach(place => {
			if (!byKind.has(place.category)) byKind.set(place.category, []);
			byKind.get(place.category).push(place);
		});
	const lists = [...byKind.values()];
	const mixed = [];
	while (lists.some(list => list.length)){
		lists.forEach(list => { if (list.length) mixed.push(list.shift()); });
	}
	return mixed;
}

// Finds stops for the route. onProgress (optional) is called as answers
// come in with { fraction, stops }: how far along the search is (0 to 1),
// and the stops picked so far, so the map can fill in while it runs.
export async function findScenicStops(routeGeometry, categories = ROMANTIC_POI_CATEGORIES, onProgress = null){
	Object.assign(scenicSearchStats, { total: 0, failed: 0, rateLimited: 0, fromCache: 0 });
	searchGapMs = FASTEST_GAP_MS;

	// Use Mapbox's exact ID for each kind of stop, and skip any it doesn't have.
	const mapboxIds = await mapboxIdsFor(categories);
	scenicSearchStats.skipped = categories.filter(category => !mapboxIds[category]).map(categoryLabel);
	const kinds = categories.filter(category => mapboxIds[category]);

	const route = thinRoute(routeGeometry.coordinates);
	const miles = runningMiles(route);
	const totalMiles = miles[miles.length - 1] || 0;
	if (!kinds.length || route.length < 2) return [];

	// Every place found, by name and spot, with where it sits along the road.
	const found = new Map();
	function keep(places, kind){
		places.forEach(place => {
			const key = place.name + '|' + place.lng.toFixed(3) + '|' + place.lat.toFixed(3);
			if (found.has(key)) return;
			const spot = locateAlongRoute([place.lng, place.lat], route);
			if (spot.distanceFromRoute > ROMANTIC_STOP_MAX_DISTANCE_MILES) return;
			found.set(key, { ...place, category: kind, mileOnRoute: spot.distanceAlongRoute, milesOffRoute: spot.distanceFromRoute });
		});
	}

	// Shares the stops out evenly: one from each piece of road in turn, up to MAX_STOPS.
	const pieceCount = clamp(Math.round(totalMiles / MILES_PER_PIECE), 1, 40);
	const pieceMiles = totalMiles / pieceCount || 1;
	function stopsByPiece(){
		const pieces = Array.from({ length: pieceCount }, () => []);
		found.forEach(place => {
			pieces[clamp(Math.floor(place.mileOnRoute / pieceMiles), 0, pieceCount - 1)].push(place);
		});
		return pieces;
	}
	function pickEvenly(){
		const queues = stopsByPiece().map(mixKinds);
		const picked = [];
		let tookOne = true;
		while (tookOne && picked.length < MAX_STOPS){
			tookOne = false;
			for (const queue of queues){
				if (queue.length && picked.length < MAX_STOPS){
					picked.push(queue.shift());
					tookOne = true;
				}
			}
		}
		return picked;
	}

	// ---- Main pass: every kind of stop, once per stretch ----
	const stretchCount = clamp(Math.round(totalMiles / MILES_PER_STRETCH), 1, Math.max(1, Math.floor(SEARCH_BUDGET / kinds.length)));
	const stretchMiles = totalMiles / stretchCount;
	const stretches = [];
	for (let s = 0; s < stretchCount; s++){
		const points = routeBetween(route, miles, s * stretchMiles, (s + 1) * stretchMiles);
				stretches.push({
			box: boxAround(points, ROMANTIC_STOP_MAX_DISTANCE_MILES),
			aims: AIM_POINTS.map(howFar => pointAtMile(route, miles, (s + howFar) * stretchMiles))
		});

	}
	// Kinds on the outside and stretches on the inside, so the whole route
	// starts filling in right away instead of from the start of the trip.
	const jobs = [];
		kinds.forEach((kind, k) => stretches.forEach((stretch, s) => {
		const aim = stretch.aims[(k + s) % AIM_POINTS.length];
		jobs.push({ kind, address: searchAddress(mapboxIds[kind], stretch.box, aim) });
	}));


	const fillJobsEstimate = GAP_FILL_PIECES * GAP_FILL_KINDS;
	const expected = jobs.length + fillJobsEstimate;
	let done = 0;
	function report(){
		done++;
		if (onProgress && (done % 8 === 0 || done === jobs.length)){
			onProgress({ fraction: Math.min(done / expected, 0.99), stops: pickEvenly() });
		}
	}
	await runSearches(jobs, (job, places) => { keep(places, job.kind); report(); });

	// ---- Second look: pieces of road that are still empty ----
		// ---- Second look: pieces of road that are still empty, or nearly ----
	const thin = [];
	stopsByPiece().forEach((piece, i) => { if (piece.length < THIN_PIECE_STOPS) thin.push(i); });
	if (thin.length){
		// Spread the second looks out if there are more thin pieces than we'll check.
		const step = Math.max(1, thin.length / GAP_FILL_PIECES);
		const chosen = [];
		for (let i = 0; i < thin.length && chosen.length < GAP_FILL_PIECES; i += step) chosen.push(thin[Math.floor(i)]);
		const fillKinds = [...GAP_FILL_FAVORITES.filter(k => kinds.includes(k)), ...kinds.filter(k => !GAP_FILL_FAVORITES.includes(k))].slice(0, GAP_FILL_KINDS);

		const fillJobs = [];
		chosen.forEach(i => {
			const points = routeBetween(route, miles, i * pieceMiles, (i + 1) * pieceMiles);
			const box = boxAround(points, ROMANTIC_STOP_MAX_DISTANCE_MILES);
			const center = pointAtMile(route, miles, (i + 0.5) * pieceMiles);
			fillKinds.forEach(kind => fillJobs.push({ kind, address: searchAddress(mapboxIds[kind], box, center) }));
		});
		await runSearches(fillJobs, (job, places) => { keep(places, job.kind); report(); });
	}

	const stops = pickEvenly();
	if (onProgress) onProgress({ fraction: 1, stops });
	return stops;
}
