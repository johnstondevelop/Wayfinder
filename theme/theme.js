// Color themes. Loaded in the <head> of every page so the chosen colors
// are in place before anything is drawn (no flash of the default colors).
// The colors themselves are in themes.css; this file picks which set is
// used, remembers it, and adds the "Colors" choice to the menu.
(function(){
	const STORAGE_KEY = 'lovinglylost-theme';
	const SIGN_IN_KEY = 'lovinglylost-auth'; // same name as in account/supabase-client.js

	// id matches html[data-theme="..."] in themes.css. main and accent are
	// only used to draw the little color swatches.
	const THEMES = [
		{ id: 'plum',     name: 'Plum & Gold',   main: '#5C2135', accent: '#E3B980' },
		{ id: 'sage',     name: 'Sage & Sand',   main: '#3B5747', accent: '#E2C48F' },
		{ id: 'ocean',    name: 'Ocean & Coral', main: '#1D4A66', accent: '#F4B7A0' },
		{ id: 'sunset',   name: 'Sunset Canyon', main: '#8C3A25', accent: '#F2CF8C' },
		{ id: 'lavender', name: 'Lavender Dusk', main: '#4A3A73', accent: '#E8CBA0' }
	];

	function findTheme(id){
		return THEMES.find(theme => theme.id === id) || THEMES[0];
	}

	function savedThemeId(){
		try {
			return findTheme(localStorage.getItem(STORAGE_KEY)).id;
		} catch (err){
			return THEMES[0].id; // storage blocked (private browsing)
		}
	}

	// Puts a theme on the page: the colors, plus the phone's status bar color.
	function applyTheme(id){
		const theme = findTheme(id);
		document.documentElement.dataset.theme = theme.id;
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', theme.main);
		return theme.id;
	}

	// Ticks whichever choice is the current theme, in every picker on the page.
	function markCurrent(){
		const current = document.documentElement.dataset.theme;
		document.querySelectorAll('.theme-option').forEach(option => {
			option.setAttribute('aria-pressed', String(option.dataset.themeId === current));
		});
	}

	// Signed-in people get their colors saved to their account too, so they
	// follow them to other phones and computers.
	async function saveToAccount(id){
		let signedIn = false;
		try { signedIn = Boolean(localStorage.getItem(SIGN_IN_KEY)); } catch (err){}
		if (!signedIn) return;
		try {
			const { supabase, getSignedInUser } = await import('./account/supabase-client.js');
			const user = await getSignedInUser();
			if (user) await supabase.from('profiles').upsert({ id: user.id, theme: id });
		} catch (err){
			console.warn("Couldn't save colors to your account", err);
		}
	}

	// Switches theme, remembers it on this device, and lets the rest of the
	// page know (the map listens for 'themechange' to recolor itself).
	function setTheme(id, options = {}){
		const applied = applyTheme(id);
		try { localStorage.setItem(STORAGE_KEY, applied); } catch (err){}
		markCurrent();
		window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: applied } }));
		if (options.saveToAccount !== false) saveToAccount(applied);
	}

	// Fills a box with one button per theme. The menu and the account page both use this.
	function fillThemeOptions(container){
		const current = document.documentElement.dataset.theme;
		THEMES.forEach(theme => {
			const option = document.createElement('button');
			option.type = 'button';
			option.className = 'theme-option';
			option.dataset.themeId = theme.id;
			option.setAttribute('aria-pressed', String(theme.id === current));
			const swatch = document.createElement('span');
			swatch.className = 'theme-swatch';
			swatch.style.background = `linear-gradient(135deg, ${theme.main} 0 55%, ${theme.accent} 55% 100%)`;
			option.append(swatch, theme.name);
			option.addEventListener('click', () => setTheme(theme.id));
			container.appendChild(option);
		});
	}

	// Adds "Colors" to the end of the menu, with the choices in a small drop-down.
	function addMenuPicker(){
		const nav = document.getElementById('siteNav');
		if (!nav) return;

		const picker = document.createElement('div');
		picker.className = 'theme-picker';
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'site-nav-link theme-picker-btn';
		button.setAttribute('aria-expanded', 'false');
		button.innerHTML = '<span class="theme-dot" aria-hidden="true"></span>Colors';
		const list = document.createElement('div');
		list.className = 'theme-options';
		list.hidden = true;
		fillThemeOptions(list);
		picker.append(button, list);
		nav.appendChild(picker);

		function setOpen(open){
			list.hidden = !open;
			button.setAttribute('aria-expanded', String(open));
		}
		button.addEventListener('click', (e) => {
			e.stopPropagation();
			setOpen(list.hidden);
		});
		document.addEventListener('click', (e) => {
			if (!picker.contains(e.target)) setOpen(false);
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') setOpen(false);
		});
	}

	applyTheme(savedThemeId());
	document.addEventListener('DOMContentLoaded', addMenuPicker);

	// Lets the account page use the same choices.
	window.LovinglyTheme = { THEMES, setTheme, fillThemeOptions };
})();
