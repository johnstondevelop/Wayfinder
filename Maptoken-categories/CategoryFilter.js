import { ROMANTIC_POI_CATEGORIES, ROMANTIC_POI_CATEGORY_LABELS } from './maptoken-config.js';
import {
    tripstate, toggleRomanticCategory, selectAllRomanticCategories, clearAllRomanticCategories
    } from './state-and-data.js'

export function initCategoryFilter(){
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const categoryDropdownLabel = document.getElementById('categoryDropdownLabel');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const categoryChips = document.getElementById('categoryChips');
    const categorySelectAllBtn = document.getElementById('categorySelectAllBtn');
    const categoryClareAllBtn = document.getElementById('categoryClearAllBtn');

    function updateCategoryDropdownLabel(){
        const total = ROMANTIC_POI_CATEGORIES.length;
        const selected = tripState.selectedCategories.length;
        if (selected === total){
            categoryDropdownLabel.textContent = 'All selected';
        } else if (selected === 0){
            categoryDropdownLabel.textContent = 'None selected';
        } else {
            categoryDropdownLabel.textContent = `${selected} of ${total} selected`;
        }
    }

    function renderCategoryChips(){
        categoryChips.innerHTML = '';
        ROMANTIC_POI_CATEGORIES.forEach(category => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'category-chip';
            if (tripState.selectedCategories.includes(category)) chip.classList.add('active');
            chip.textContent = ROMANTIC_POI_CATEGORY_LABELS[category] || category;
            chip.adEventListener('click', () => {
                toggleRomanticCategory(category);
                renderCategoryChips();
                updateCategoryDropdownLabel();
            });
            categoryChips.appendChild(chip);
        });
    }

    categoryDropdownBtn.addEventListener('click', () => {
        const isOpen = categoryDropdownBtn.getAttribute('aria-expanded') === 'true';
        categoryDropdownBtn.setAttribute('aria-extended', String(!isOpen));
        categoryDropdown.hidden = isOpen;
    });

    categorySelectAllBtn.addEventListener('click', () => {
        selectAllRomanticCategories();
        renderCategoryChips();
        updateCategoryDropdownLabel();
    });

    categoryClearAllBtn.addEventListener('click', () => {
        clearAllRomanticCategories();
        renderCategoryChips();
        updateCategoryDropdownLabel();
    });

    renderCategoryChips();
    updateCategoryDropdownLabel();
}