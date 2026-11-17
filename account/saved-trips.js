// Saved trips, kept in the signed-in person's account (the saved_trips
// table in Supabase). The planner uses this to save, open and share trips,
// and the account page uses it to list them. Each row holds the trip's
// name and a "trip" box with the places, the days and the totals.
//
// Trips can be shared: each has a secret share code, and people who open
// the share link join the trip (the trip_members table) and can change it
// too. See supabase/trip-sharing-setup.sql.
import { supabase, getSignedInUser } from './supabase-client.js';

const COLUMNS = 'id, name, trip, updated_at, updated_by, user_id, share_code';

// Every saved trip you can see (your own and ones shared with you),
// most recently saved first.
export async function listTrips(){
	const { data, error } = await supabase
		.from('saved_trips')
		.select(COLUMNS)
		.order('updated_at', { ascending: false });
	if (error) throw error;
	return data;
}

// One saved trip, or null if it isn't there (deleted, or not shared with you).
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
	const user = await getSignedInUser();
	const row = { name, trip, updated_at: new Date().toISOString(), updated_by: user ? user.id : null };
	const request = id
		? supabase.from('saved_trips').update(row).eq('id', id)
		: supabase.from('saved_trips').insert(row);
	const { data, error } = await request.select(COLUMNS).single();
	if (error) throw error;
	return data;
}

// Only the person who made a trip can delete it (for everyone on it).
export async function deleteTrip(id){
	const { error } = await supabase.from('saved_trips').delete().eq('id', id);
	if (error) throw error;
}

// ---- Sharing ----

// Joins the trip a share link points to. Gives back { trip_id, trip_name },
// or null if no trip has that code.
export async function joinTrip(code){
	const { data, error } = await supabase.rpc('join_trip', { p_code: code });
	if (error) throw error;
	return (data && data[0]) || null;
}

// The trip's name and who shared it, for someone who isn't signed in yet.
// Gives back { trip_name, from_name }, or null.
export async function tripInvite(code){
	const { data, error } = await supabase.rpc('trip_invite', { p_code: code });
	if (error) throw error;
	return (data && data[0]) || null;
}

// Everyone else on your trips: [{ trip_id, user_id, first_name, is_owner }].
export async function tripPeople(){
	const { data, error } = await supabase.rpc('trip_people');
	if (error) throw error;
	return data || [];
}

// Takes you off a trip someone shared with you.
export async function leaveTrip(tripId){
	const user = await getSignedInUser();
	const { error } = await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', user.id);
	if (error) throw error;
}

// The address someone opens to join a trip.
export function shareLink(shareCode){
	return new URL('index.html?join=' + encodeURIComponent(shareCode), location.href).href;
}

// Opens the phone's share menu, or copies the link on a computer.
// Gives back 'shared', 'copied', 'cancelled', or 'failed'.
export async function sendShareLink(shareCode, tripName){
	const url = shareLink(shareCode);
	const text = `Let's plan "${tripName}" together on LovinglyLost.`;
	const phone = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
	if (navigator.share && phone){
		try {
			await navigator.share({ title: tripName, text, url });
			return 'shared';
		} catch (err){
			if (err && err.name === 'AbortError') return 'cancelled';
			// Otherwise fall through and copy it instead.
		}
	}
	try {
		await navigator.clipboard.writeText(url);
		return 'copied';
	} catch (err){
		return 'failed';
	}
}