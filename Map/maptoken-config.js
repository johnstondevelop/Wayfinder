export const MAPBOX_TOKEN = 'pk.eyJ1Ijoiam9obnN0b25kZXZlbG9wIiwiYSI6ImNtdG54MHlzeTBpZGUyeW1ybjNoOW5xcGUifQ.7K_iEYC09eo41TKpiXndBQ';

export const DEFAULT_CENTER = [-98.5795, 39.8283];
export const DEFAULT_ZOOM = 3.5;
export const ROMANTIC_STOP_MAX_DISTANCE_MILES = 20;

// How far in you zoom before scenic stops show their names on the map, and
// then their addresses too. Bigger numbers mean  closer in: 9 is about a
// 70-mile-wide view on a phone, 11 about 18 miles, 13 about 4 miles.
export const SCENIC_NAME_ZOOM = 9;
export const SCENIC_ADDRESS_ZOOM = 11;

// ================ STOP TYPES ================
// Every kind of stop the planner can look for, in the groups people pick
// from. To add one: find its Mapbox ID with tools/category-finder.html,
// then add a line to a group below, like   lake: 'Lake',
// (the ID on the left, the name people see on the right).
export const CATEGORY_GROUPS = [
	{
		id: 'scenery',
		label: 'Scenery',
		categories: {
			viewpoint: 'Viewpoint',
			waterfall: 'Waterfall',
			lighthouse: 'Lighthouse',
			beach: 'Beach',
			garden: 'Garden',
			trailhead: 'Trailhead',
			park: 'Park',
			pier: 'Pier',
			historic_site: 'Historic Site',
			monument: 'Monument',
			tourist_attraction: 'Tourist Attraction',
			national_park: 'National Park',
			state_park: 'State Park',
			nature_reserve: 'Nature Reserve',
			lake: 'Lake',
			river: 'River',
			mountain: 'Mountain',
			forest: 'Forest',
			island: 'Island',
			coastal: 'Bay',
			cave: 'Cave',
			spring_geyser: 'Spring or Geyser',
			marina: 'Marina',
			bridge: 'Bridge',
			windmill: 'Windmill',
			fountain: 'Fountain'
		}
	},
	{
		id: 'food',
		label: 'Food & drink',
		categories: {
			winery: 'Winery',
			vineyard: 'Vineyard',
			wine_bar: 'Wine Bar',
			cocktail_bar: 'Cocktail Bar',
			champagne_bar: 'Champagne Bar',
			speakeasy: 'Speakeasy',
			whiskey_bar: 'Whiskey Bar',
			beach_bar: 'Beach Bar',
			brewery: 'Brewery',
			distillery: 'Distillery',
			cafe: 'Cafe',
			teahouse: 'Teahouse',
			bakery: 'Bakery',
			dessert_shop: 'Dessert Shop',
			chocolate_shop: 'Chocolate Shop',
			ice_cream: 'Ice Cream',
			cheese_shop: 'Cheese Shop',
			diner_restaurant: 'Diner',
			brunch_restaurant: 'Brunch',
			steakhouse: 'Steakhouse',
			seafood_restaurant: 'Seafood',
			french_restaurant: 'French Restaurant',
			italian_restaurant: 'Italian Restaurant',
			mediterranean_restaurant: 'Mediterranean',
			spanish_restaurant: 'Spanish Restaurant',
			tapas_restaurant: 'Tapas',
			greek_restaurant: 'Greek Restaurant',
			sushi_restaurant: 'Sushi',
			gastropub: 'Gastropub'
		}
	},
	{
		id: 'together',
		label: 'Things to do together',
		categories: {
			museum: 'Museum',
			art_gallery: 'Art Gallery',
			cinema: 'Cinema',
			theatre: 'Theatre',
			concert_hall: 'Concert Hall',
			music_venue: 'Live Music',
			arts_center: 'Arts Center',
			aquarium: 'Aquarium',
			zoo: 'Zoo',
			observatory: 'Observatory',
			planetarium: 'Planetarium',
			outdoor_sculpture: 'Outdoor Sculpture',
			public_artwork: 'Public Art',
			plaza: 'Plaza',
			market: 'Market',
			farm: 'Farm',
			antique_shop: 'Antique Shop',
			book_store: 'Bookstore',
			florist: 'Flower Shop',
			boutique: 'Boutique',
			gift_shop: 'Gift Shop',
			spa: 'Spa',
			sauna: 'Sauna',
			massage_shop: 'Massage',
			miniature_golf: 'Mini Golf',
			bowling_alley: 'Bowling',
			arcade: 'Arcade',
			ice_rink: 'Ice Rink',
			theme_park: 'Theme Park',
			boat_rental: 'Boat Rental',
			cruise: 'Cruise',
			tours: 'Tours',
			cable_car: 'Cable Car',
			chairlift: 'Chairlift',
			rafting_spot: 'Rafting'
		}
	},
	{
		id: 'stay',
		label: 'Places to stay',
		categories: {
			bed_and_breakfast: 'Bed & Breakfast',
			hotel: 'Hotel',
			resort: 'Resort',
			vacation_rental: 'Vacation Rental',
			campground: 'Campground',
			mountain_hut: 'Mountain Hut'
		}
	},
	{
		id: 'practical',
		label: 'Along the way',
		categories: {
			rest_area: 'Rest Area',
			picnic_shelter: 'Picnic Shelter',
			gas_station: 'Gas Station',
			charging_station: 'Charging Station'
		}
	}
];

// The stop types that are switched on until someone picks their own.
export const DEFAULT_SELECTED_CATEGORIES = [
	'viewpoint', 'waterfall', 'lighthouse', 'beach', 'garden', 'trailhead', 'park', 'pier',
	'historic_site', 'monument',
	'winery', 'wine_bar', 'cocktail_bar', 'cafe', 'dessert_shop', 'diner_restaurant',
	'steakhouse', 'french_restaurant', 'italian_restaurant',
	'museum', 'art_gallery', 'cinema', 'theatre'
];

// Made from the groups above, so there's only one place to edit.
export const ROMANTIC_POI_CATEGORIES = CATEGORY_GROUPS.flatMap(group => Object.keys(group.categories));
export const ROMANTIC_POI_CATEGORY_LABELS = Object.assign({}, ...CATEGORY_GROUPS.map(group => group.categories));

// If a stop type shows a x in tools/category-filter.html, find the right
// Mapbox category there and write it here, like castle: 'historic_site',
// The planner then searches that ID for it. Leave it empty otherwise.
export const MAPBOX_CATEGORY_IDS = {
}; 
