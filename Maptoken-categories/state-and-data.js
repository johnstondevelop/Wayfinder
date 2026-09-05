export const tripState = {
	origin: null,     // { name: string, lng: number, lat: number }
	stops: [],        // array of { id: string, name: string, lng: number, lat: number }
	days: 1,
	findRomanticStops: true,
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

export function setRomanticStops(value){
	tripState.findRomanticStops = value;
}

export function setRoute(route){
	tripState.route = route;
}

export function isReadyToPlan(){
	const hasOrigin = tripState.origin && tripState.origin.lng !== null;
	const hasStops = tripState.stops.length > 0 && tripState.stops.every(s => s.lng !== null);
	return hasOrigin && hasStops;
}	
