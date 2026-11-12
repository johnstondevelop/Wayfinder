// The first-time tour of the planner page. The page darkens, and a plum
// arrow with a heart at its tip points at each part of the app in turn,
// with a little card explaining it. It plays once on each device (after
// the welcome animation and any "What's new" card), and "Take the tour"
// in the menu plays it again anytime.
(function(){
	const DONE_KEY = 'lovinglylost-tour-done';
	// Change this to '2' (and so on) to show a new tour to everyone again.
	const TOUR_VERSION = '1';

	let signedIn = false;
	try { signedIn = Boolean(localStorage.getItem('lovinglylost-auth')); } catch (err){}

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isPhone = () => window.matchMedia('(max-width: 860px)').matches;

	// Gives back the element only if it's actually showing on the screen.
	function shown(el){
		if (!el) return null;
		const box = el.getBoundingClientRect();
		return box.width > 0 && box.height > 0 ? el : null;
	}
	const byId = id => document.getElementById(id);
	const panelOf = id => byId(id) && byId(id).closest('.panel');
	const navLink = href => document.querySelector(`#siteNav a[href="${href}"]`);

	// ---- The steps ----
	// target: what the arrow points at (nothing = a card in the middle)
	// menu: open the menu first on phones, where it's tucked away
	// categories: open the stop types box first
	const STEPS = [
		{
			title: 'Welcome to LovinglyLost',
			text: "Here's a quick look around. It takes about a minute, and you can skip it anytime.",
			list: [
				'Planning your route',
				'Picking the kinds of stops you love',
				'Using the map and starting your drive',
				'About, Contact and What’s new',
				'Colors and your account'
			]
		},
		{
			title: 'Start here',
			text: "Type where you're leaving from, like a city, an address or a landmark, and pick it from the list.",
			target: () => panelOf('originInput')
		},
		{
			title: 'Where are you headed?',
			text: 'Type each place you want to go. Tap + add stop for another one. Your last stop is where the drive ends.',
			target: () => panelOf('addStopBtn')
		},
		{
			title: 'Pick your kind of stops',
			text: 'Stop types come in groups: Scenery, Food & drink, Things to do together, Places to stay and Along the way. Tap a group, then tap the stops you like. The little number shows how many are on.',
			target: () => document.querySelector('.category-groups') || byId('categoryDropdownBtn'),
			categories: true
		},
		{
			title: 'Take the slow road',
			text: "Skip tolls, highways or ferries if you'd rather not drive them.",
			target: () => document.querySelector('[data-road-prefs]') && document.querySelector('[data-road-prefs]').closest('.panel')
		},
		{
			title: 'A longer getaway?',
			text: 'Turn on Multiple Days to split a long drive across a few days.',
			target: () => panelOf('multiDayToggle')
		},
		{
			title: 'Romantic stops',
			text: "Leave this on and we'll find overlooks, waterfalls, cafes, wineries and more along your way.",
			target: () => panelOf('scenicToggle')
		},
		{
			title: 'Find our route',
			text: "When you're ready, tap here. Your drive and the stops along it show up on the map.",
			target: () => byId('planBtn')
		},
		{
			title: 'The map',
			text: 'Tap any heart on the map to see what it is, then + Add to Trip to make it part of your drive. When it looks right, Start Drive gives you directions as you go. On a phone, Edit Trip brings you back to these choices.',
			target: () => shown(document.querySelector('.map-frame')) || shown(document.querySelector('.map-placeholder-card'))
		},
		{
			title: 'About',
			text: 'The story behind LovinglyLost, and why it was made for two.',
			target: () => navLink('about.html'),
			menu: true
		},
		{
			title: 'Contact',
			text: 'Questions, ideas, or something not working right? Send a note here.',
			target: () => navLink('contact.html'),
			menu: true
		},
		{
			title: "What's new",
			text: 'Every update to the app is listed here. A little dot shows up when there’s something new.',
			target: () => navLink('updates.html'),
			menu: true
		},
		{
			title: 'Make it yours',
			text: 'Pick a color theme, like Plum & Gold, Sage & Sand or Ocean & Coral.',
			target: () => document.querySelector('.theme-picker-btn'),
			menu: true
		},
		signedIn ? {
			title: 'Your account',
			text: 'Your favorite stops, places to avoid, home town, road preferences and colors live here, and follow you to any phone or computer you sign in on.',
			target: () => byId('accountNavLink'),
			menu: true
		} : {
			title: 'Sign in',
			text: 'Make a free account to save your favorite stops, hide places you want to avoid, and keep your preferences on every device.',
			target: () => byId('accountNavLink'),
			menu: true
		},
		{
			title: "You're all set",
			text: 'You can take this tour again anytime from the menu. Happy travels, and enjoy getting a little lost together.',
			target: () => document.querySelector('.tour-replay-link'),
			menu: true,
			nextLabel: 'Start planning'
		}
	];

	// ---- Building blocks ----
	function make(tag, className, text){
		const el = document.createElement(tag);
		if (className) el.className = className;
		if (text !== undefined) el.textContent = text;
		return el;
	}
	const SVG_NS = 'http://www.w3.org/2000/svg';
	function makeSvg(tag, attrs){
		const el = document.createElementNS(SVG_NS, tag);
		Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
		return el;
	}

	// The same heart as the logo, moved so its point sits at 0,0.
	const HEART = 'M0 0c0 0-4.7-3.2-4.7-6.9 0-2 1.6-3.2 3.2-3.2.7 0 1.3.3 1.5.9.2-.6.8-.9 1.5-.9 1.6 0 3.2 1.2 3.2 3.2 0 3.7-4.7 6.9-4.7 6.9z';

	let tour = null; // everything on screen while the tour is running

	// ---- Opening the menu (phones) and the stop types box ----
	function setMenu(open){
		const nav = byId('siteNav');
		const button = byId('siteMenuBtn');
		if (!nav || !button) return;
		nav.classList.toggle('is-open', open);
		button.setAttribute('aria-expanded', String(open));
	}
	function setCategories(open){
		const box = byId('categoryDropdown');
		const button = byId('categoryDropdownBtn');
		if (!box || !button) return;
		box.hidden = !open;
		button.setAttribute('aria-expanded', String(open));
	}

	// ---- Start and finish ----
	function start(){
		if (tour) return;
		setMenu(false);

		const root = make('div', 'tour');
		const blocker = make('div', 'tour-blocker');
		const spot = make('div', 'tour-spot is-empty');

		const arrow = makeSvg('svg', { class: 'tour-arrow', 'aria-hidden': 'true' });
		const halo = makeSvg('path', { class: 'tour-arrow-halo', pathLength: '1' });
		const line = makeSvg('path', { class: 'tour-arrow-line', pathLength: '1' });
		const heart = makeSvg('path', { class: 'tour-arrow-heart', d: HEART });
		arrow.append(halo, line, heart);

		const card = make('div', 'tour-card');
		card.setAttribute('role', 'dialog');
		card.setAttribute('aria-modal', 'true');
		card.setAttribute('aria-labelledby', 'tourTitle');
		const count = make('p', 'tour-count');
		const title = make('h2', 'tour-title');
		title.id = 'tourTitle';
		const text = make('p', 'tour-text');
		const list = make('ul', 'tour-list');
		const dots = make('div', 'tour-dots');
		dots.setAttribute('aria-hidden', 'true');
		const actions = make('div', 'tour-actions');
		const skipBtn = make('button', 'tour-skip', 'Skip tour');
		const backBtn = make('button', 'tour-back', 'Back');
		const nextBtn = make('button', 'tour-next', 'Next');
		[skipBtn, backBtn, nextBtn].forEach(button => { button.type = 'button'; });
		actions.append(skipBtn, backBtn, nextBtn);
		card.append(count, title, text, list, dots, actions);

		root.append(blocker, spot, arrow, card);
		document.body.appendChild(root);

		tour = {
			root, spot, arrow, halo, line, heart, card, count, title, text, list, dots, backBtn, nextBtn,
			index: 0,
			target: null,
			categoriesWereOpen: !byId('categoryDropdown') || !byId('categoryDropdown').hidden
		};

		// Clicks inside the tour stay inside it, so they don't close the menu.
		root.addEventListener('click', (e) => e.stopPropagation());
		skipBtn.addEventListener('click', finish);
		backBtn.addEventListener('click', () => go(tour.index - 1));
		nextBtn.addEventListener('click', () => go(tour.index + 1));
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', place);
		document.addEventListener('scroll', place, true);

		requestAnimationFrame(() => root.classList.add('is-open'));
		go(0);
	}

	function finish(){
		if (!tour) return;
		try { localStorage.setItem(DONE_KEY, TOUR_VERSION); } catch (err){}
		document.removeEventListener('keydown', onKey);
		window.removeEventListener('resize', place);
		document.removeEventListener('scroll', place, true);
		setMenu(false);
		setCategories(tour.categoriesWereOpen);
		const root = tour.root;
		tour = null;
		root.classList.remove('is-open');
		setTimeout(() => root.remove(), reduceMotion ? 0 : 300);
	}

	function onKey(e){
		if (e.key === 'Escape') finish();
		else if (e.key === 'ArrowRight') go(tour.index + 1);
		else if (e.key === 'ArrowLeft') go(tour.index - 1);
	}

	// ---- Showing one step ----
	function go(index){
		if (index < 0) return;
		if (index >= STEPS.length){
			finish();
			return;
		}
		tour.index = index;
		const step = STEPS[index];

		setMenu(Boolean(step.menu) && isPhone());
		setCategories(Boolean(step.categories) || tour.categoriesWereOpen);

		tour.count.textContent = `Step ${index + 1} of ${STEPS.length}`;
		tour.title.textContent = step.title;
		tour.text.textContent = step.text;
		tour.list.innerHTML = '';
		(step.list || []).forEach(item => tour.list.appendChild(make('li', null, item)));
		tour.list.hidden = !step.list;
		tour.dots.innerHTML = '';
		STEPS.forEach((other, i) => {
			tour.dots.appendChild(make('span', 'tour-dot' + (i < index ? ' is-done' : i === index ? ' is-current' : '')));
		});
		tour.backBtn.hidden = index === 0;
		tour.nextBtn.textContent = step.nextLabel || (index === 0 ? "Let's go" : 'Next');

		tour.target = shown(step.target ? step.target() : null);
		if (tour.target) tour.target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });

		// Draw the arrow fresh for each step.
		tour.arrow.classList.remove('is-drawing');
		void tour.arrow.getBoundingClientRect();
		tour.arrow.classList.add('is-drawing');

		// Keep things lined up while the page scrolls to the target.
		const until = performance.now() + 700;
		(function follow(){
			if (!tour) return;
			place();
			if (performance.now() < until) requestAnimationFrame(follow);
		})();
		tour.nextBtn.focus({ preventScroll: true });
	}

	// ---- Placing the spotlight, the card and the arrow ----
	function place(){
		if (!tour) return;
		const { spot, card, arrow, halo, line, heart } = tour;
		const width = window.innerWidth;
		const height = window.innerHeight;
		const MARGIN = 16; // space kept at the screen's edges
		const GAP = 80;    // room between the card and the target, for the arrow
		const cardW = card.offsetWidth;
		const cardH = card.offsetHeight;
		const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

		const target = tour.target && tour.target.isConnected ? tour.target : null;
		if (!target){
			// No target: the whole page darkens and the card sits in the middle.
			spot.classList.add('is-empty');
			Object.assign(spot.style, { left: width / 2 + 'px', top: height / 2 + 'px', width: '0px', height: '0px' });
			Object.assign(card.style, { left: (width - cardW) / 2 + 'px', top: Math.max(MARGIN, (height - cardH) / 2) + 'px' });
			arrow.style.display = 'none';
			return;
		}

		// The spotlight: a clear window around the target.
		const box = target.getBoundingClientRect();
		const PAD = 8;
		const hole = {
			left: box.left - PAD,
			top: box.top - PAD,
			right: box.right + PAD,
			bottom: box.bottom + PAD
		};
		spot.classList.remove('is-empty');
		Object.assign(spot.style, {
			left: hole.left + 'px',
			top: hole.top + 'px',
			width: hole.right - hole.left + 'px',
			height: hole.bottom - hole.top + 'px'
		});

		// The card goes beside the target (on a computer), below it, or above
		// it, wherever there's room. The arrow runs from the card to it.
		const midX = (hole.left + hole.right) / 2;
		const midY = (hole.top + hole.bottom) / 2;
		const roomRight = width - hole.right - MARGIN - cardW;
		const roomLeft = hole.left - MARGIN - cardW;
		const roomBelow = height - hole.bottom - MARGIN - cardH;
		const roomAbove = hole.top - MARGIN - cardH;
		const SMALLEST_GAP = 44; // the shortest arrow that still looks right
		let side = null;
		if (!isPhone() && midX < width / 2 && roomRight >= GAP) side = 'right';
		else if (roomBelow >= GAP) side = 'below';
		else if (roomAbove >= GAP) side = 'above';
		else if (!isPhone() && midX > width / 2 && roomLeft >= GAP) side = 'left';
		else if (Math.max(roomBelow, roomAbove) >= SMALLEST_GAP) side = roomBelow >= roomAbove ? 'below' : 'above';

		let left, top, from, to;
		if (side === 'right' || side === 'left'){
			top = clamp(midY - cardH / 2, MARGIN, height - cardH - MARGIN);
			left = side === 'right' ? hole.right + GAP : hole.left - GAP - cardW;
			const y = clamp(midY, top + 28, top + cardH - 28);
			from = { x: side === 'right' ? left - 6 : left + cardW + 6, y };
			to = { x: side === 'right' ? hole.right + 4 : hole.left - 4, y: clamp(midY, hole.top + 10, hole.bottom - 10) };
		} else if (side === 'below' || side === 'above'){
			const gap = Math.min(GAP, side === 'below' ? roomBelow : roomAbove);
			top = side === 'below' ? hole.bottom + gap : hole.top - gap - cardH;
			left = clamp(midX - cardW / 2, MARGIN, width - cardW - MARGIN);
			from = { x: clamp(midX, left + 40, left + cardW - 40), y: side === 'below' ? top - 6 : top + cardH + 6 };
			to = { x: clamp(midX, hole.left + 14, hole.right - 14), y: side === 'below' ? hole.bottom + 4 : hole.top - 4 };
		} else {
			// No room around it (a big target): the card sits on top, no arrow.
			left = clamp(midX - cardW / 2, MARGIN, width - cardW - MARGIN);
			top = midY < height / 2 ? height - cardH - MARGIN : MARGIN;
		}
		Object.assign(card.style, { left: left + 'px', top: top + 'px' });

		if (!from){
			arrow.style.display = 'none';
			return;
		}
		arrow.style.display = '';
		// A gentle curve, bent a little to one side.
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const bend = 0.22;
		const curve = { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend };
		// The heart's point touches the target. Its size, and which way it faces:
		const HEART_SIZE = 3;
		const angle = Math.atan2(to.y - curve.y, to.x - curve.x);
		heart.setAttribute('transform', `translate(${to.x} ${to.y}) rotate(${angle * 180 / Math.PI - 90}) scale(${HEART_SIZE})`);
		// The line stops inside the heart, so it joins where the two bumps meet.
		const tuck = 6 * HEART_SIZE;
		const end = { x: to.x - Math.cos(angle) * tuck, y: to.y - Math.sin(angle) * tuck };
		const path = `M${from.x} ${from.y}Q${curve.x} ${curve.y} ${end.x} ${end.y}`;
		halo.setAttribute('d', path);
		line.setAttribute('d', path);
	}

	// ---- Waiting for a quiet moment ----
	// Starts once the welcome animation and any "What's new" card are gone.
	function whenPageIsClear(callback){
		const root = document.documentElement;
		let clearSince = null;
		(function check(){
			const busy = root.classList.contains('show-intro') || document.querySelector('.update-backdrop');
			if (busy) clearSince = null;
			else if (clearSince === null) clearSince = Date.now();
			if (clearSince !== null && Date.now() - clearSince >= 900) callback();
			else setTimeout(check, 300);
		})();
	}

	// ---- "Take the tour" in the menu ----
	function addMenuLink(){
		const nav = byId('siteNav');
		if (!nav) return;
		const link = make('a', 'site-nav-link tour-replay-link', 'Take the tour');
		link.href = 'index.html?tour';
		link.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			start();
		});
		const accountLink = byId('accountNavLink');
		if (accountLink) nav.insertBefore(link, accountLink);
		else nav.appendChild(link);
	}

	// ---- Start ----
	addMenuLink();
	let seen = true;
	try { seen = localStorage.getItem(DONE_KEY) === TOUR_VERSION; } catch (err){
		// Storage blocked (private browsing): skip it rather than show it every visit.
	}
	const asked = new URLSearchParams(location.search).has('tour');
	if (!seen || asked){
		document.addEventListener('DOMContentLoaded', () => whenPageIsClear(start));
	}

	window.LovinglyTour = { start };
})();