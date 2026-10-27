// Shows people what changed since their last visit, using the list in
// updates.js. A big update gets a card listing the changes; a small one
// gets a short note at the top that fades away. Also adds "What's new" to
// the menu, and fills in the list on updates.html.
(function(){
	const SEEN_KEY = 'lovinglylost-seen-update';
	const TOAST_MS = 8000; // how long a small-update note stays up
	const updates = window.LOVINGLYLOST_UPDATES || [];
	if (!updates.length) return;
	const latest = updates[0];

	// ---- Remembering what each person has already seen ----
	function readSeen(){
		try { return localStorage.getItem(SEEN_KEY); } catch (err){ return 'unavailable'; }
	}
	function markSeen(){
		try { localStorage.setItem(SEEN_KEY, latest.id); } catch (err){}
		const dot = document.querySelector('.update-dot');
		if (dot) dot.remove();
	}

	// The updates this person hasn't seen yet, newest first.
	function unseenUpdates(){
		const seen = readSeen();
		if (seen === 'unavailable') return [];
		if (seen === null){
			// Never seen a notice before. Someone who has used the app before
			// (its offline helper is already running) gets the latest update;
			// a brand-new visitor doesn't need to hear what changed.
			const returning = Boolean(navigator.serviceWorker && navigator.serviceWorker.controller);
			if (!returning) markSeen();
			return returning ? [latest] : [];
		}
		const index = updates.findIndex(update => update.id === seen);
		if (index === -1) return [latest]; // their last one was taken off the list
		return updates.slice(0, index);
	}

	// ---- Building blocks ----
	function make(tag, className, text){
		const el = document.createElement(tag);
		if (className) el.className = className;
		if (text !== undefined) el.textContent = text;
		return el;
	}

	// One update: a Big/Small badge, the date, the title and its list of changes.
	function buildEntry(update, headingTag){
		const entry = make('article', 'update-entry');
		const meta = make('p', 'update-meta');
		const isBig = update.size === 'big';
		meta.append(make('span', 'update-badge' + (isBig ? ' is-big' : ''), isBig ? 'Big update' : 'Small update'), update.date || '');
		const list = make('ul', 'update-changes');
		(update.changes || []).forEach(change => list.appendChild(make('li', null, change)));
		entry.append(meta, make(headingTag, 'update-title', update.title), list);
		return entry;
	}

	// ---- The card, for big updates (or "What changed?" on a small note) ----
	function showCard(list){
		const backdrop = make('div', 'update-backdrop');
		const card = make('div', 'update-card');
		card.setAttribute('role', 'dialog');
		card.setAttribute('aria-modal', 'true');
		card.setAttribute('aria-label', "What's new");

		card.appendChild(make('p', 'update-eyebrow', "What's new"));
		list.forEach(update => card.appendChild(buildEntry(update, 'h2')));

		const actions = make('div', 'update-actions');
		const done = make('button', 'update-done', 'Got it');
		done.type = 'button';
		const all = make('a', 'update-all-link', 'See all updates');
		all.href = 'updates.html';
		actions.append(done, all);
		card.appendChild(actions);
		backdrop.appendChild(card);
		document.body.appendChild(backdrop);
		requestAnimationFrame(() => backdrop.classList.add('is-open'));
		done.focus({ preventScroll: true });

		function close(){
			backdrop.classList.remove('is-open');
			document.removeEventListener('keydown', onKey);
			setTimeout(() => backdrop.remove(), 300);
		}
		function onKey(e){
			if (e.key === 'Escape') close();
		}
		done.addEventListener('click', close);
		backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
		document.addEventListener('keydown', onKey);
	}

	// ---- The short note, for small updates ----
	function showToast(list){
		const update = list[0];
		const toast = make('div', 'update-toast');
		toast.setAttribute('role', 'status');

		const text = make('p', 'update-toast-text');
		text.append(make('span', 'update-badge', 'Small update'), make('span', null, update.title));
		const details = make('button', 'update-toast-more', 'What changed?');
		details.type = 'button';
		const closeBtn = make('button', 'update-toast-close', '×');
		closeBtn.type = 'button';
		closeBtn.setAttribute('aria-label', 'Close');
		toast.append(text, details, closeBtn);
		document.body.appendChild(toast);
		requestAnimationFrame(() => toast.classList.add('is-open'));

		let timer = setTimeout(close, TOAST_MS);
		// Don't vanish while someone is reaching for it.
		toast.addEventListener('mouseenter', () => clearTimeout(timer));
		toast.addEventListener('focusin', () => clearTimeout(timer));

		function close(){
			clearTimeout(timer);
			toast.classList.remove('is-open');
			setTimeout(() => toast.remove(), 300);
		}
		closeBtn.addEventListener('click', close);
		details.addEventListener('click', () => {
			close();
			showCard(list);
		});
	}

	// Waits for the welcome animation to finish so the two don't overlap.
	function afterIntro(callback){
		const root = document.documentElement;
		if (!root.classList.contains('show-intro')){
			setTimeout(callback, 600);
			return;
		}
		const watcher = new MutationObserver(() => {
			if (!root.classList.contains('show-intro')){
				watcher.disconnect();
				setTimeout(callback, 400);
			}
		});
		watcher.observe(root, { attributes: true, attributeFilter: ['class'] });
	}

	// ---- "What's new" in the menu, with a dot while there's something unseen ----
	function addMenuLink(hasUnseen){
		const nav = document.getElementById('siteNav');
		if (!nav) return;
		const link = make('a', 'site-nav-link', "What's new");
		link.href = 'updates.html';
		if (location.pathname.endsWith('updates.html')) link.setAttribute('aria-current', 'page');
		if (hasUnseen) link.appendChild(make('span', 'update-dot'));
		const accountLink = document.getElementById('accountNavLink');
		if (accountLink) nav.insertBefore(link, accountLink);
		else nav.appendChild(link);
	}

	// ---- Start ----
	const pageList = document.getElementById('updatesList');
	if (pageList){
		// On updates.html: show every update, and count them all as seen.
		updates.forEach(update => {
			const card = make('section', 'page-card');
			card.appendChild(buildEntry(update, 'h2'));
			pageList.appendChild(card);
		});
		addMenuLink(false);
		markSeen();
		return;
	}

	const unseen = unseenUpdates();
	addMenuLink(unseen.length > 0);
	if (!unseen.length) return;

	afterIntro(() => {
		markSeen();
		if (unseen.some(update => update.size === 'big')) showCard(unseen);
		else showToast(unseen);
	});
})();
