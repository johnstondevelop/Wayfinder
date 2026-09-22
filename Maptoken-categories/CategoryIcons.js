// Small hand-drawn line icons, one per romantic/scenic POI category.
// Each is a self-contained 24x24 SVG string using currentColor, so it can be
// tinted from CSS just by setting `color` on a wrapping element. Used by the
// category filter chips and by the scenic-stop map popups so every category
// gets its own little "badge" at a glance.

const ICON_DEFAULTS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

export const ROMANTIC_POI_CATEGORY_ICONS = {
	viewpoint: `<svg ${ICON_DEFAULTS}><circle cx="17.5" cy="6" r="1.7" fill="currentColor" stroke="none"/><path d="M2 19l5.5-8 3.5 4.5L14.5 11l7 8"/></svg>`,

	waterfall: `<svg ${ICON_DEFAULTS}><path d="M8 3c0 3-1.5 3-1.5 6s1.5 3 1.5 6"/><path d="M12 3c0 3-1.5 3-1.5 6s1.5 3 1.5 6"/><path d="M16 3c0 3-1.5 3-1.5 6s1.5 3 1.5 6"/><path d="M4 21c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0"/></svg>`,

	lighthouse: `<svg ${ICON_DEFAULTS}><path d="M9.5 21L10.8 7h2.4L14.5 21z"/><path d="M10.8 7L12 4.3l1.2 2.7z"/><path d="M9.9 15h4.2"/><path d="M12 4.3l-2.3-1.8M12 4.3l2.3-1.8"/><path d="M7.3 21h9.4"/></svg>`,

	winery: `<svg ${ICON_DEFAULTS}><circle cx="9.3" cy="8.5" r="1.9"/><circle cx="13.5" cy="8" r="1.9"/><circle cx="11.2" cy="11.6" r="1.9"/><circle cx="8" cy="13.6" r="1.9"/><circle cx="14.3" cy="13.4" r="1.9"/><path d="M11.5 4.6V2.8"/><path d="M9.8 2.8c0 1.2.8 1.8 1.7 1.8s1.7-.6 1.7-1.8"/></svg>`,

	beach: `<svg ${ICON_DEFAULTS}><path d="M12 3c4 0 7.2 3.6 7.2 7.4H4.8C4.8 6.6 8 3 12 3z"/><path d="M12 3v14"/><path d="M12 12L5 19"/><path d="M4 21c1.3-1.2 2.6-1.2 3.9 0s2.6 1.2 3.9 0 2.6-1.2 3.9 0 2.6 1.2 3.9 0"/></svg>`,

	garden: `<svg ${ICON_DEFAULTS}><circle cx="12" cy="9.6" r="1.5"/><circle cx="9" cy="11.2" r="1.9"/><circle cx="15" cy="11.2" r="1.9"/><circle cx="10.2" cy="14.2" r="1.9"/><circle cx="13.8" cy="14.2" r="1.9"/><path d="M12 17v4"/></svg>`,

	trailhead: `<svg ${ICON_DEFAULTS}><path d="M6.5 21V4"/><path d="M6.5 6.2h9.5l-2.4 2.6 2.4 2.6H6.5z"/></svg>`,

	park: `<svg ${ICON_DEFAULTS}><path d="M12 3l3.6 5.4h-2l2.8 4.6h-2.4l3 5.6H7l3-5.6H7.6l2.8-4.6h-2z"/><path d="M12 18.6V21"/></svg>`,

	historic_site: `<svg ${ICON_DEFAULTS}><path d="M4 21h16"/><path d="M6 21V10M10 21V10M14 21V10M18 21V10"/><path d="M3.5 10L12 5l8.5 5z"/></svg>`,

	castle: `<svg ${ICON_DEFAULTS}><path d="M4.5 21V10.5H7V8h1.7v2.5h1.8V7h1.8v3.5h1.8V8H16v2.5h2.5V21z"/><path d="M4.5 21h14"/></svg>`,

	monument: `<svg ${ICON_DEFAULTS}><path d="M10.6 5L12 2l1.4 3"/><path d="M10.6 5l.3 13M13.4 5l-.3 13"/><path d="M9.9 18h4.2l.5 3H9.4z"/></svg>`,

	cinema: `<svg ${ICON_DEFAULTS}><rect x="3.5" y="9.5" width="17" height="10.5" rx="1.4"/><path d="M3.5 9.5l2.3-4.7h3l-2.3 4.7zM9.7 9.5L12 4.8h3l-2.3 4.7zM15.9 9.5l2.3-4.7h2.3v4.7z"/></svg>`,

	theatre: `<svg ${ICON_DEFAULTS}><path d="M4.5 3.2c3.6 3 3.6 14.6 0 17.6"/><path d="M19.5 3.2c-3.6 3-3.6 14.6 0 17.6"/><path d="M9.6 3.2v3.6a2.4 2.4 0 004.8 0V3.2"/></svg>`,

	art_gallery: `<svg ${ICON_DEFAULTS}><rect x="3.5" y="4" width="17" height="14.5" rx="1.2"/><circle cx="8.2" cy="8.6" r="1.3" fill="currentColor" stroke="none"/><path d="M3.5 16l4.6-4.8 3.1 3.2 3.4-3.9 5.9 6.3"/></svg>`,

	museum: `<svg ${ICON_DEFAULTS}><path d="M2.3 10.2L12 4.4l9.7 5.8z"/><path d="M4 21V11.6M8 21V11.6M12 21V11.6M16 21V11.6M20 21V11.6"/><path d="M2.3 21h19.4"/></svg>`,

	diner_restaurant: `<svg ${ICON_DEFAULTS}><path d="M7.2 3v6.2a1.8 1.8 0 003.6 0V3"/><path d="M9 3v6.2"/><path d="M9 11.4V21"/><path d="M16 3c-1.5 0-2.3 1.9-2.3 4.4S14.5 11.8 16 11.8V21"/></svg>`,

	dessert_shop: `<svg ${ICON_DEFAULTS}><path d="M6.5 12h11l-1.4 7.2a1.9 1.9 0 01-1.9 1.5H9.8a1.9 1.9 0 01-1.9-1.5z"/><path d="M7 12a5 5 0 0110 0"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/></svg>`,

	pier: `<svg ${ICON_DEFAULTS}><path d="M2.5 11.5h19"/><path d="M6 11.5V19M10.3 11.5V19M13.7 11.5V19M18 11.5V19"/><path d="M2 21c1.7-1.6 3.3-1.6 5 0s3.3 1.6 5 0 3.3-1.6 5 0 3.3 1.6 5 0"/></svg>`,

	cafe: `<svg ${ICON_DEFAULTS}><path d="M4.5 8h12.4v5.6a4.8 4.8 0 01-4.8 4.8H9.3a4.8 4.8 0 01-4.8-4.8z"/><path d="M16.9 9.2h1.8a2 2 0 010 4h-1.8"/><path d="M8.4 3c0 .9-.9.9-.9 1.9s.9 1 .9 1.9M12.6 3c0 .9-.9.9-.9 1.9s.9 1 .9 1.9"/></svg>`,

	wine_bar: `<svg ${ICON_DEFAULTS}><path d="M7.8 3h8.4l-.9 5.4a3.3 3.3 0 01-6.6 0z"/><path d="M12 12.2V18"/><path d="M8.6 21h6.8"/></svg>`,
};