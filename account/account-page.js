// The "My account" page: loads the signed-in person's details, saves
// changes, and signs them out. Anyone not signed in is sent to login.html.
import { supabase, getSignedInUser, emailLinkType } from './supabase-client.js';
import { attachHometownSuggestions } from './hometown-suggest.js';

const loading = document.getElementById('accountLoading');
const sections = document.querySelectorAll('.account-section');
const greeting = document.getElementById('accountGreeting');
const emailText = document.getElementById('accountEmail');

const profileForm = document.getElementById('profileForm');
const nameInput = document.getElementById('profileName');
const homeTownInput = document.getElementById('profileHomeTown');
const aboutInput = document.getElementById('profileAbout');
const saveBtn = document.getElementById('profileSaveBtn');
const profileMessage = document.getElementById('profileMessage');
const welcomeMessage = document.getElementById('accountWelcome');
const signOutBtn = document.getElementById('signOutBtn');
const themeOptions = document.getElementById('accountThemeOptions');

attachHometownSuggestions(homeTownInput, document.getElementById('homeTownSuggestions'));
if (window.LovinglyTheme) window.LovinglyTheme.fillThemeOptions(themeOptions);

let user = null;

function showMessage(el, text, kind){
	el.textContent = text;
	el.className = 'account-message' + (kind ? ' is-' + kind : '');
}

// "Hello, Pat." using the first name, or "Hello, traveler." if there isn't one.
function updateGreeting(name){
	const firstName = name.trim().split(/\s+/)[0];
	greeting.textContent = (firstName || 'traveler') + '.';
}

async function loadAccount(){
	emailText.textContent = user.email;

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('display_name, home_town, about, theme')
		.eq('id', user.id)
		.maybeSingle();

	if (error){
		loading.textContent = "Couldn't load your account right now. Please refresh to try again.";
		return;
	}

	// Before the first save there's no profile yet, so use the name they
	// gave when they created the account.
	const signUpName = (user.user_metadata && user.user_metadata.display_name) || '';
	nameInput.value = (profile && profile.display_name) || signUpName;
	homeTownInput.value = (profile && profile.home_town) || '';
	aboutInput.value = (profile && profile.about) || '';
	updateGreeting(nameInput.value);

	const theme = document.documentElement.dataset.theme;
	if (profile && profile.theme && profile.theme !== theme && window.LovinglyTheme){
		window.LovinglyTheme.setTheme(profile.theme, { saveToAccount: false });
	}

	if (emailLinkType === 'signup'){
		showMessage(welcomeMessage, 'Your email is confirmed. Welcome to LovinglyLost!', 'success');
	}

	loading.hidden = true;
	sections.forEach(section => { section.hidden = false; });
}

profileForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	saveBtn.disabled = true;
	showMessage(profileMessage, 'Saving...');

	const { error } = await supabase.from('profiles').upsert({
		id: user.id,
		display_name: nameInput.value.trim() || null,
		home_town: homeTownInput.value.trim() || null,
		about: aboutInput.value.trim() || null,
		updated_at: new Date().toISOString()
	});

	saveBtn.disabled = false;
	if (error){
		showMessage(profileMessage, "Couldn't save. Check your connection and try again.", 'error');
		return;
	}
	updateGreeting(nameInput.value);
	showMessage(profileMessage, 'Saved!', 'success');
});

signOutBtn.addEventListener('click', async () => {
	signOutBtn.disabled = true;
	await supabase.auth.signOut();
	location.href = 'index.html';
});

// ---- When the page opens ----
user = await getSignedInUser();
if (user){
	loadAccount();
} else {
	// Keep anything after the # so the sign-in page can explain an expired email link.
	location.replace('login.html' + location.hash);
}
