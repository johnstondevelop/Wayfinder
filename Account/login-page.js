// The sign-in page. One form does four jobs, and "mode" says which one is
// showing: signing in, creating an account, asking for a password reset
// email, or choosing a new password after clicking that email's link.
import { supabase, getSignedInUser, emailLinkType, emailLinkError, pageAddress } from './supabase-client.js';

const form = document.getElementById('authForm');
const title = document.getElementById('authTitle');
const nameInput = document.getElementById('authName');
const emailInput = document.getElementById('authEmail');
const passwordInput = document.getElementById('authPassword');
const submitBtn = document.getElementById('authSubmit');
const message = document.getElementById('authMessage');

const MODES = {
	signin:      { title: 'Welcome <em>back.</em>',        button: 'Sign in' },
	signup:      { title: 'Join the <em>drive.</em>',      button: 'Create account' },
	forgot:      { title: 'Forgot your <em>password?</em>', button: 'Email me a reset link' },
	newpassword: { title: 'Choose a new <em>password.</em>', button: 'Save new password' }
};
let mode = 'signin';

// Shows only the parts of the form marked for this mode (data-show="...").
// Hidden boxes are also disabled, so the browser doesn't insist on filling them.
function setMode(nextMode){
	mode = nextMode;
	title.innerHTML = MODES[mode].title;
	submitBtn.textContent = MODES[mode].button;
	passwordInput.autocomplete = mode === 'signin' ? 'current-password' : 'new-password';

	document.querySelectorAll('[data-show]').forEach(el => {
		const visible = el.dataset.show.split(' ').includes(mode);
		el.hidden = !visible;
		el.querySelectorAll('input').forEach(input => { input.disabled = !visible; });
	});
	document.querySelectorAll('.account-tab').forEach(tab => {
		tab.classList.toggle('is-active', tab.dataset.mode === mode);
	});
	showMessage('');
}

function showMessage(text, kind){
	message.textContent = text;
	message.className = 'account-message' + (kind ? ' is-' + kind : '');
}

function setBusy(busy){
	submitBtn.disabled = busy;
	submitBtn.textContent = busy ? 'One moment...' : MODES[mode].button;
}

// Supabase's error messages are written for developers; these are kinder.
function friendlyError(error){
	const text = (error && error.message) || '';
	if (/invalid login credentials/i.test(text)) return "That email and password don't match an account. Check for typos, or create an account.";
	if (/email not confirmed/i.test(text)) return 'Please confirm your email first. Look for the confirmation email (check your spam folder too).';
	if (/rate limit|too many/i.test(text)) return 'Too many tries in a short time. Please wait a few minutes and try again.';
	if (/failed to fetch|network/i.test(text)) return "Couldn't reach the account service. Check your connection and try again.";
	return text || 'Something went wrong. Please try again.';
}

document.querySelectorAll('[data-mode]').forEach(button => {
	button.addEventListener('click', () => setMode(button.dataset.mode));
});

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const email = emailInput.value.trim();
	const password = passwordInput.value;
	setBusy(true);

	try {
		if (mode === 'signin'){
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) throw error;
			location.href = 'account.html';
			return;
		}

		if (mode === 'signup'){
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: pageAddress('account.html'),
					data: { display_name: nameInput.value.trim() }
				}
			});
			if (error) throw error;
			// If "Confirm email" is ever turned off in Supabase, people are
			// signed in straight away.
			if (data.session){
				location.href = 'account.html';
				return;
			}
			passwordInput.value = '';
			setMode('signin');
			showMessage(`Almost there! We sent a link to ${email}. Open it to confirm your email, then you're all set.`, 'success');
			return;
		}

		if (mode === 'forgot'){
			const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: pageAddress('login.html') });
			if (error) throw error;
			showMessage(`If there's an account for ${email}, a reset link is on its way.`, 'success');
			return;
		}

		if (mode === 'newpassword'){
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;
			location.href = 'account.html';
			return;
		}
	} catch (error){
		showMessage(friendlyError(error), 'error');
	} finally {
		setBusy(false);
	}
});

// ---- When the page opens ----
if (emailLinkType === 'recovery'){
	// Arrived from a "reset your password" email.
	setMode('newpassword');
} else {
	const params = new URLSearchParams(location.search);
	setMode(params.get('mode') === 'signup' ? 'signup' : 'signin');

	if (emailLinkError){
		showMessage(`That email link didn't work (${emailLinkError}). Links expire after a while and only work once, so try again for a fresh one.`, 'error');
	} else if (await getSignedInUser()){
		// Already signed in: nothing to do here.
		location.replace('account.html');
	}
}
