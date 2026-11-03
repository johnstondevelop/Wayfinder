export const MAPBOX_TOKEN = 'pk.eyJ1Ijoiam9obnN0b25kZXZlbG9wIiwiYSI6ImNtdG54MHlzeTBpZGUyeW1ybjNoOW5xcGUifQ.7K_iEYC09eo41TKpiXndBQ';

export const DEFAULT_CENTER = [-98.5795, 39.8283];
export const DEFAULT_ZOOM = 3.5;
export const ROMANTIC_STOP_MAX_DISTANCE_MILES = 20;

// How far in you zoom before scenic stops show their names on the map, and
// then their addresses too. Bigger numbers mean  closer in: 9 is about a
// 70-mile-wide view on a phone, 11 about 18 miles, 13 about 4 miles.
export const SCENIC_NAME_ZOOM = 9;
export const SCENIC_ADDRESS_ZOOM = 11;

export const ROMANTIC_POI_CATEGORIES = ['viewpoint',
     'waterfall',
      'lighthouse',
       'winery',
        'beach',
         'garden',
          'trailhead',
           'park',
            'historic_site',
              'monument',
               'cinema',
                'theatre',
                 'art_gallery',
                  'museum',
                   'diner_restaurant',
                    'dessert_shop',
                     'pier',
                      'cafe',
                       'wine_bar',
                         'steakhouse',
                          'french_restaurant',
                           'italian_restaurant',
                            'cocktail_bar'];


export const ROMANTIC_POI_CATEGORY_LABELS = {
     viewpoint: 'Viewpoint',
     waterfall: 'Waterfall',
     lighthouse: 'Lighthouse',
     winery: 'Winery',
     beach: 'Beach',
     garden: 'Garden',
     trailhead: 'Trailhead',
     park: 'Park',
     historic_site: 'Historic Site',
     monument: 'Monument',
     cinema: 'Cinema',
     theatre: 'Theatre',
     art_gallery: 'Art Gallery',
     museum: 'Museum',
     diner_restaurant: 'Diner',
     dessert_shop: 'Dessert Shop',
     pier: "Pier",
     cafe: 'Cafe',
     wine_bar: 'Wine Bar',
     steakhouse: 'Steakhouse',
     french_restaurant: 'French Restaurant',
     italian_restaurant: 'Italian Restaurant',
     cocktail_bar: 'Cocktail Bar'
     
};
// If a stop type shows a x in tools/category-filter.html, find the right
// Mapbox category there and write it here, like castle: 'historic_site',
// The planner then searches that ID for it. Leave it empty otherwise.
export const MAPBOX_CATEGORY_IDS = {
}; 
