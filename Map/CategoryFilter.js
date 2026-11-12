// The "Scenic Categories" picker: stop types sorted into groups (Scenery,
// Food & drink, and so on). Tap a group to see its stop types, and tap a
// stop type to switch it on or off. Only the ones switched on are searched,
// which is what keeps the search fast however many types there are.
// What you pick is remembered on this device.
import { CATEGORY_GROUPS, ROMANTIC_POI_CATEGORIES, DEFAULT_SELECTED_CATEGORIES } from './maptoken-config.js';
import { ROMANTIC_POI_CATEGORY_ICONS } from './CategoryIcons.js';
import { tripState, toggleRomanticCategory } from './state-and-data.js';

const STORAGE_KEY = 'lovinglylost-stop-types';
// With more types than this switched on, a tip suggests picking fewer.
const MANY_TYPES = 30;

function loadSavedChoice(){
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
		// Drop any saved type that's no longer on the list.
		if (Array.isArray(saved)) tripState.selectedCategories = saved.filter(category => ROMANTIC_POI_CATEGORIES.includes(category));
	} catch (err){
		// Nothing saved, or storage is blocked: the suggested types stay on.
	}
}

function saveChoice(){
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tripState.selectedCategories)); } catch (err){}
}

export function initCategoryFilter(){
	const dropdownBtn = document.getElementById('categoryDropdownBtn');
	const dropdownLabel = document.getElementById('categoryDropdownLabel');
	const dropdown = document.getElementById('categoryDropdown');
	const chips = document.getElementById('categoryChips');
	const selectGroupBtn = document.getElementById('categorySelectAllBtn');
	const clearGroupBtn = document.getElementById('categoryClearAllBtn');

	// The row of group tabs, and the tip, are added above the chips.
	const tabs = document.createElement('div');
	tabs.className = 'category-groups';
	chips.before(tabs);
	const tip = document.createElement('p');
	tip.className = 'category-tip';
	tip.textContent = 'Tip: on long drives, picking fewer stop types finds more of each.';
	chips.after(tip);

	// A third button, next to the two already on the page.
	selectGroupBtn.textContent = 'Select group';
	clearGroupBtn.textContent = 'Clear group';
	const resetBtn = document.createElement('button');
	resetBtn.type = 'button';
	resetBtn.className = 'category-chip-action-btn';
	resetBtn.textContent = 'Reset to suggested';
	clearGroupBtn.after(resetBtn);

	let openGroup = CATEGORY_GROUPS[0];
	loadSavedChoice();

	function isOn(category){
		return tripState.selectedCategories.includes(category);
	}

	function draw(){
		const total = tripState.selectedCategories.length;
		dropdownLabel.textContent = total === 0 ? 'None selected' : `${total} selected`;
		tip.hidden = total <= MANY_TYPES;

		tabs.innerHTML = '';
		CATEGORY_GROUPS.forEach(group => {
			const onCount = Object.keys(group.categories).filter(isOn).length;
			const tab = document.createElement('button');
			tab.type = 'button';
			tab.className = 'category-group-tab' + (group === openGroup ? ' active' : '');
			tab.textContent = group.label;
			if (onCount){
				const count = document.createElement('span');
				count.className = 'category-group-count';
				count.textContent = onCount;
				tab.appendChild(count);
			}
			tab.addEventListener('click', () => {
				openGroup = group;
				draw();
			});
			tabs.appendChild(tab);
		});

		chips.innerHTML = '';
		Object.entries(openGroup.categories).forEach(([category, label]) => {
			const chip = document.createElement('button');
			chip.type = 'button';
			chip.className = 'category-chip' + (isOn(category) ? ' active' : '');
			chip.setAttribute('aria-pressed', String(isOn(category)));
			const icon = ROMANTIC_POI_CATEGORY_ICONS[category] || '';
			chip.innerHTML = `${icon ? `<span class="chip-icon">${icon}</span>` : ''}<span></span>`;
			chip.lastElementChild.textContent = label;
			chip.addEventListener('click', () => {
				toggleRomanticCategory(category);
				changed();
			});
			chips.appendChild(chip);
		});
	}

	function changed(){
		saveChoice();
		draw();
	}

	dropdownBtn.addEventListener('click', () => {
		const isOpen = dropdownBtn.getAttribute('aria-expanded') === 'true';
		dropdownBtn.setAttribute('aria-expanded', String(!isOpen));
		dropdown.hidden = isOpen;
	});

	selectGroupBtn.addEventListener('click', () => {
		Object.keys(openGroup.categories).forEach(category => {
			if (!isOn(category)) tripState.selectedCategories.push(category);
		});
		changed();
	});

	clearGroupBtn.addEventListener('click', () => {
		tripState.selectedCategories = tripState.selectedCategories.filter(category => !(category in openGroup.categories));
		changed();
	});

	resetBtn.addEventListener('click', () => {
		tripState.selectedCategories = [...DEFAULT_SELECTED_CATEGORIES];
		changed();
	});

	draw();
}
