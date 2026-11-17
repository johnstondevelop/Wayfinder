// Saved trips, kept in the signed-in person's account (the saved_trips
// table in Supabase). The planner uses this to save and open trips, and
// the account page uses it to list and delete them. Each row holds the
// trip's name and a "trip" box with the places, the days and the totals.
import { supabase } from './supabase-client.js';

const COLUMNS = 'id, name, trip, updated_at';

// Every saved trip, most recently saved first.
export async function listTrips(){
	const { data, error } = await supabase
		.from('saved_trips')
		.select(COLUMNS)
		.order('updated_at', { ascending: false });
	if (error) throw error;
	return data;
}

// One saved trip, or null if it isn't there (deleted, or someone else's).
export async function getTrip(id){
	const { data, error } = await supabase
		.from('saved_trips')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();
	if (error) throw error;
	return data;
}

// Saves a trip. With an id it updates that saved trip; without one it adds
// a new one. Gives back the saved row.
export async function saveTrip({ id, name, trip }){
	const row = { name, trip, updated_at: new Date().toISOString() };
	const request = id
		? supabase.from('saved_trips').update(row).eq('id', id)
		: supabase.from('saved_trips').insert(row);
	const { data, error } = await request.select(COLUMNS).single();
	if (error) throw error;
	return data;
}

export async function deleteTrip(id){
	const { error } = await supabase.from('saved_trips').delete().eq('id', id);
	if (error) throw error;
}