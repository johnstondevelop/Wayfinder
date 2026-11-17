// "Change email" and "Change password" on the account page.
// - Email: Supabase sends a confirmation link, and the address only
//   changes once that link is opened.
// - Password: the current password is checked first, so someone who finds
//   a phone left signed in can't lock its owner out.
import { supabase, emailLinkType, emailLinkMessage, pageAddress } from './supabase-client.js';

function showMessage(el, text, kind){
	el.textContent = text;
	el.className = 'account-message' + (kind ? ' is-' + kind : '');
}

// Supabase's error messages are written for developers; these are kinder.
function friendlyError(error){
	const text = (error && error.message) || '';
	const code = (error && error.code) || '';
	if (code === 'same_password' || /different from the old/i.test(text)) return 'That is already your password. Choose a different one.';
	if (code === 'weak_password' || /weak|at least/i.test(text)) return 'Please choose a stronger password, at least 8 characters.';
	if (code === 'email_exists' || /already (been )?registered/i.test(text)) return 'Another account already uses that email address.';
	if (/rate limit|too many/i.test(text)) return 'Too many tries in a short time. Please wait a few minutes and try again.';
	if (/failed to fetch|network/i.test(text)) return "Couldn't reach the account service. Check your connection and try again.";
	return text || 'Something went wrong. Please try again.';
}

export function initAccountSecurity(user){
	const emailForm = document.getElementById('emailForm');
	const newEmailInput = document.getElementById('newEmail');
	const emailBtn = document.getElementById('emailSaveBtn');
	const emailMessage = document.getElementById('emailMessage');

	const passwordForm = document.getElementById('passwordForm');
	const currentInput = document.getElementById('currentPassword');
	const newInput = document.getElementById('newPassword');
	const repeatInput = document.getElementById('repeatPassword');
	const passwordBtn = document.getElementById('passwordSaveBtn');
	const passwordMessage = document.getElementById('passwordMessage');

	const securityMessage = document.getElementById('securityMessage');
	if (!emailForm || !passwordForm) return;

	// Arriving from one of the "confirm your new email" links.
	if (emailLinkType === 'email_change'){
		showMessage(securityMessage, 'Your email address has been changed.', 'success');
	} else if (emailLinkMessage){
		showMessage(securityMessage, 'Thanks! Now open the link we sent to your other email address to finish the change.', 'success');
	}

	// ---- Change email ----
	emailForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const newEmail = newEmailInput.value.trim();
		if (newEmail.toLowerCase() === (user.email || '').toLowerCase()){
			showMessage(emailMessage, 'That is already your email address.', 'error');
			return;
		}
		emailBtn.disabled = true;
		showMessage(emailMessage, 'One moment...');
		const { error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: pageAddress('account.html') });
		emailBtn.disabled = false;
		if (error){
			showMessage(emailMessage, friendlyError(error), 'error');
			return;
		}
		newEmailInput.value = '';
		showMessage(emailMessage, `Almost there! We sent a link to ${newEmail}. Open it to confirm, and your email will change. If a link also arrives at your current address, open that one too.`, 'success');
	});

	// ---- Change password ----
	passwordForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (newInput.value !== repeatInput.value){
			showMessage(passwordMessage, "The two new passwords don't match.", 'error');
			return;
		}
		passwordBtn.disabled = true;
		showMessage(passwordMessage, 'One moment...');

		// Signing in again is how the current password gets checked.
		const check = await supabase.auth.signInWithPassword({ email: user.email, password: currentInput.value });
		if (check.error){
			passwordBtn.disabled = false;
			const wrong = /invalid login credentials/i.test(check.error.message || '');
			showMessage(passwordMessage, wrong ? "That isn't your current password." : friendlyError(check.error), 'error');
			return;
		}

		const { error } = await supabase.auth.updateUser({ password: newInput.value });
		passwordBtn.disabled = false;
		if (error){
			showMessage(passwordMessage, friendlyError(error), 'error');
			return;
		}
		passwordForm.reset();
		showMessage(passwordMessage, 'Your password has been changed.', 'success');
	});
}