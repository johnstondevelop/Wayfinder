import {setFitPaddingProvider } from './Map.js';

// Matches the same 860px breakpoint app-style.css uses for phones.
const PHONE_QUERY = window.matchMedia('(max-width: 860px)');
const DEFAULT_SHEET_PEEK = 156;

let sheet, sheetHandle, sheetActions, sheetBody;
let editTripBtn, backToMapBtn, startDriveBtn, summaryPanel;

export function initMapReveal(){
    sheet = document.getElementById('tripSheet');
    sheetHandle = document.getElementById('tripSheetHandle');
    sheetActions = document.getElementById('tripSheetActions');
    sheetBody = document.getElementsById('tripSheetBody');
    editTripBtn = document.getElementById('editTripBtn');
    backToMapBtn = document.getElementById('backToMapBtn');
    startDriveBtn = document.getElementById('startDriveBtn');
    summaryPanel = document.getElementById('summaryPanel');

    placeTripControls();
    PHONE_QUERY.addEventListener('change', placeTripControls);

    editTripBtn.addEventListener('click', () => {
        document.body.classList.add('editing-trip');
        setSheetExpanded(false);
    });
    backToMapBtn.addEventListener('click', () => {
        document.body.classList.remove('editing-trip');
        refreshMapSize();
    });

    initSheetDrag();

    // On a phone, the pull-up panel covers the bottom of the map, so when the
    // map zooms to fit your route it needs extra room at the bottom or the 
    // end of te route would be hidden behind the panel
    setFitPaddingProvider(getFitPadding);
}

// Called by Main-Launch.js the moment you hit "Find our route" (and the 
// trip is filled in), before the route is drawn, so the map is already
// visible and the right size when it zooms to fit the route.
export function showMapView(){
    document.body.classList.add('route-ready');
    document.body.classList.remove('editing-trip');
    setSheetExpanded(false);
    refreshMapSize();
}

// Mapbox cant measure a map that was hidden, so whenever it appears we
// fire a resize; Map.js already listens fot that and calls map.resize().
function refreshMapSize(){
    window.dispatchEvent(new Event('resize'));
}

// On a phone, Start Drive and the route summary live in the pull-up panel.
// On a computer they go back to their normal spot under "find our route".
// Moving the elements keeps all their click handlers working.
function placeTripControls(){
    if (PHONE_QUERY.matches){
        sheetActions.prepend(startDriveBtn);
        sheetBody.append(summaryPanel);
    } else {
        backToMapBtn.after(startDriveBtn, summaryPanel);
    }
}

function getSheetPeek(){
    return parseFloat(getComputedStyle(sheet).getPropertyValue('--sheet-peek')) || DEFAULT_SHEET_PEEK;
}

function getFitPadding(){
    if (PHONE_QUERY.matches && document.body.classList.contains('route-ready')){
        return { top: 40, left: 40, right: 40, bottom: getSheetPeek() + 30 };
    }
    return 60;
}

function setSheetExpanded(expanded){
    sheet.classList.toggle('is-expanded', expanded);
    sheetHandle.setAttribute('aria-expanded', String(expanded));
    sheetHandle.setAttribute('aria-label', expanded ? 'Show less' : 'Show more trip details');
}

// Lets you drag the panel up and down by its handle, and snaps it open or
// closed when you let go. A quick tap on the handle just flips it.
function initSheetDrag(){
    let dragging = false;
    let moved = false;
    let startY = 0;
    let startOffset = 0;
    let collapsedOffset = 0;

    function offSetFor(clientY){
        return Math.min(collapsedOffset, Math.max(0, startOffset + (clientY - startY)));
    }

    sheetHandle.addEventListener('pointerDown', (e) => {
        dragging = true;
        moved = false;
        startY = e.clientY;
        collapsedOffset = sheet.offSetHeight - getSheetPeek();
        startOffset = sheet.classList.contains('is-expanded') ? 0 : collapsedOffset;
        sheet.style.transition = 'none';
        sheetHandle.setPointerCapture(e.pointerId);
    });

    sheetHandle.addEventListener('pointer-move', (e) => {
        if (!dragging) return;
        if (Math.abs(e.clientY - startY) > 4) moved = true;
        if (!moved) return;
        sheet.style.transform = `translateY${offSetFor(e.clientY)}px`;
    });

    sheetHandle.addEventListener('pointer-up', (e) => {
        if (!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (!moved){
            setSheetExpanded(!sheet.classList.contains('is-expanded'));
            return;
        }
        setSheetExpanded(offSetFor(e.clientY) < collapsedOffset / 2);
    });

    sheetHandle.addEventListener('pointer-cancel', (e) => {
        dragging = false;
        sheet.style.transition = '';
        sheet.style.transform = '';
    });

    // Keyboard users (Enter / Space) geta. click without any pointer events.
    sheetHandle.addEventListener('click', (e) => {
        if (e.detail === 0) setSheetExpanded(!sheet.classList.contains('is-expanded'));
    });
}