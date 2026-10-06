import { ROMANTIC_POI_CATEGORIES } from './maptoken-config.js';

export const tripState = {
	origin: null,     // { name: string, lng: number, lat: number }
	stops: [],        // array of { id: string, name: string, lng: number, lat: number }
	days: 1,
	multiDay: false,
	findRomanticStops: true,
	selectedCategories: [...ROMANTIC_POI_CATEGORIES],
	route: null,      // filled in once routing.js gets a result
	};
	
let nextStopId = 1;

export function addStop(){
	const id = 'stop-' + nextStopId++;
	tripState.stops.push({id, name: '', lng: null, lat: null});
	return id;
}

export function removeStop(id){
	tripState.stops = tripState.stops.filter(s => s.id !== id);
}
// Splices an already-geocoded place (a scenic stope where the driver the driver
// is adding to the trip) into the stops list at 'index', rather than appending at at the
// end the way addStop() does - this is what turns it into a real waypoint
// that stis in the correct driving order.
export function insertStops(index, place){
	const id = 'stop-' + nextStopId++;
	const stop = {id, name: place.name, lng: place.lng, lat: place.lat};
	const safeIndex = Math.max(0, Math.min(index, tripState.stops.length));
	tripState.stops.splice(safeIndex, 0, stop);
	return id;
}

export function setOrigin(place){
	tripState.origin = place;
}

export function setStopPlace(id, place){
	const stop = tripState.stops.find(s => s.id === id);
	if (stop){
		stop.name = place.name;
		stop.lng = place.lng;
		stop.lat = place.lat;
	}
}

export function setDays(days){
	tripState.days = Math.max(1, Math.min(30, Number(days) || 1));
}

export function setMultiDay(value){
	tripState.multiDay = value;
}

export function setRomanticStops(value){
	tripState.findRomanticStops = value;
}
export function toggleRomanticCategory(category){
	const idx = tripState.selectedCategories.indexOf(category);
	if (idx === -1){
		tripState.selectedCategories.push(category);
	} else {
		tripState.selectedCategories.splice(idx, 1);
	}
}

export function selectAllRomanticCategories(){
	tripState.selectedCategories = [...ROMANTIC_POI_CATEGORIES];
}

export function clearAllRomanticCategories(){
	tripState.selectedCategories = [];
}

export function setRoute(route){
	tripState.route = route;
}

export function isReadyToPlan(){
	const hasOrigin = tripState.origin && tripState.origin.lng !== null;
	const hasStops = tripState.stops.length > 0 && tripState.stops.every(s => s.lng !== null);
	return hasOrigin && hasStops;
}	
