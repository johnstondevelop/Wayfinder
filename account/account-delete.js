// "Delete my account" on the account page. The current password is checked
// first, then the delete-account function on Supabase removes the account
// and everything saved in it (see supabase/functions/delete-account).
// Things kept only on this device, like the colors, stay as they are.
import { supabase } from './supabase-client.js';

const WAITING_TRIP_KEY = 'lovinglylost-waiting-trip'; // same name as in Map/save-trip.js

function showMessage(el, text, kind){
	el.textContent = text;
	el.className = 'account-message' + (kind ? ' is-' + kind : '');
}

// A short note on why the delete didn't work, like "401: Invalid JWT", to
// show under the error. It helps work out what went wrong.
async function whyItFailed(error, data){
	if (!error) return 'unexpected answer: ' + JSON.stringify(data);
	const response = error.context;
	if (response && typeof response.json === 'function'){
		let reason = '';
		try {
			const body = await response.clone().json();
			reason = [body.error || body.message || body.msg, body.detail].filter(Boolean).join(', ');
		} catch (err){}
		return `${response.status}${reason ? ': ' + reason : ''}`;
	}
	return error.message || 'no answer';
}

export function initAccountDelete(user){
	const section = document.getElementById('deleteSection');
	const form = document.getElementById('deleteForm');
	const passwordInput = document.getElementById('deletePassword');
	const confirmBox = document.getElementById('deleteConfirm');
	const deleteBtn = document.getElementById('deleteAccountBtn');
	const message = document.getElementById('deleteMessage');
	if (!form) return;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!confirmBox.checked){
			showMessage(message, "Tick the box to confirm you understand this can't be undone.", 'error');
			return;
		}
		deleteBtn.disabled = true;
		showMessage(message, 'Checking your password...');

		// Signing in again is how the password gets checked.
		const check = await supabase.auth.signInWithPassword({ email: user.email, password: passwordInput.value });
		if (check.error){
			deleteBtn.disabled = false;
			const wrong = /invalid login credentials/i.test(check.error.message || '');
			showMessage(message, wrong ? "That isn't your password." : "Couldn't check your password. Check your connection and try again.", 'error');
			return;
		}

		showMessage(message, 'Deleting your account...');
        // The function's name in Supabase (the end of its URL, after /functions/v1/).
		const { data, error } = await supabase.functions.invoke('dynamic-handler', { method: 'POST' });
		// Only a clear "deleted" from the function counts as done.
		if (error || !data || data.deleted !== true){
			deleteBtn.disabled = false;
			const why = await whyItFailed(error, data);
			console.warn("Couldn't delete the account:", why);
			showMessage(message, `Couldn't finish deleting your account. Please try again, or contact us if it keeps happening. (Details: ${why})`, 'error');
			return;
		}

		// The account is gone, so just forget it on this device.
		await supabase.auth.signOut({ scope: 'local' });
		try { localStorage.removeItem(WAITING_TRIP_KEY); } catch (err){}
		location.replace('login.html?deleted=1');
	});

	// The section stays hidden until it's ready to use, so an older copy of
	// the page's code (saved by the browser) can't show a button that does nothing.
	if (section) section.hidden = false;
}