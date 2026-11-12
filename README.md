<p align="center">
  <img src="icons/icon-192.png" alt="LovinglyLost heart and winding road logo" width="96" height="96">
</p>
<h1 align="center">LovinglyLost</h1>
<p align="center">
  <em>Plan a drive worth remembering.</em><br>
  A romantic road-trip planner that maps your route and finds the scenic, cozy and unforgettable stops along the way.
</p>
<p align="center">
  <a href="https://johnstondevelop.github.io/Wayfinder/"><strong>Open the app &rarr;</strong></a>
</p>
<p align="center">
  <img alt="HTML, CSS and JavaScript" src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JS-no%20build%20step-5C2135">
  <img alt="Maps by Mapbox" src="https://img.shields.io/badge/maps-Mapbox-5C2135">
  <img alt="Accounts by Supabase" src="https://img.shields.io/badge/accounts-Supabase-5C2135">
  <img alt="Installable web app" src="https://img.shields.io/badge/installable-PWA-C98A4B">
  <img alt="Hosted on GitHub Pages" src="https://img.shields.io/badge/hosted%20on-GitHub%20Pages-C98A4B">
</p>

Contents

	•	What it does
	•	Features
	•	How it's built
	•	Project layout
	•	Running it on your computer
	•	Settings
	•	Accounts (Supabase)
	•	How do I…
	•	Behind-the-scenes tools
	•	Good to know
	•	Update history
	•	What's next

What it does

Tell LovinglyLost where you're starting and where you want to go. It plans the drive, then looks for romantic and scenic places near your route, like overlooks, waterfalls, wineries, little cafes, bookstores and bed & breakfasts. It spreads them evenly from start to finish, so there's always something worth pulling over for. Add the ones you like to your trip, tap Start Drive, and follow along as you go.

It runs entirely in the browser, with no server of its own, and you can install it on a phone like an app.

Features

🗺️ Plan the drive

	•	Starting point and any number of stops, with place suggestions as you type
	•	Avoid tolls, highways or ferries for a slower, prettier road
	•	Multiple days: split a long drive evenly across a few days
	•	A trip summary with total drive time, time per day, and time for each leg

💞 Find stops worth the detour

	•	100 stop types in 5 groups: Scenery · Food & drink · Things to do together · Places to stay · Along the way
	•	Pick a group, tap the stops you like, and see how many are on in each group. Your picks are remembered.
	•	Only the types you choose are searched, so it stays fast however many there are
	•	Stops are spread evenly along the whole route, and quiet stretches get a second look (up to 400 stops)
	•	Every stop type has its own little icon

📍 On the map

	•	Tap any stop to see its name, address and website, plus + Add to Trip, ♡ Save and Avoid
	•	Open any stop in Google Maps or Apple Maps
	•	Stop names and addresses appear as you zoom in
	•	Adding or removing a stop updates the route without jumping the map around

🚗 Drive mode

	•	Start Drive shows turn-by-turn directions in a banner at the top
	•	A heart marks where you are and glides smoothly as you move
	•	The map follows you, and Recenter brings it back if you scroll away
	•	On phones, the map fills the screen, with a pull-up panel for your trip and Edit Trip to get back to your choices

👤 Your account

	•	Sign up, sign in, and reset your password by email
	•	Favorite stops and places to avoid (avoided places are hidden from future searches)
	•	Home town, a short "about you", road preferences and colors, which follow you to every device you sign in on

🎨 Make it yours

	•	Five color themes: Plum & Gold, Sage & Sand, Ocean & Coral, Sunset Canyon and Lavender Dusk

✨ A warm welcome

	•	An animated heart-and-road intro when the app opens
	•	A first-time tour: the page darkens and a plum arrow with a heart at its tip walks through every part of the app. Replay it anytime from Take the tour in the menu.
	•	What's new notices after each update, plus a page listing all of them

📱 Works like an app

	•	Install it to your home screen
	•	Opens offline, always loading the newest version when there's a connection

How it's built

Front end	Plain HTML, CSS and JavaScript (ES modules). No framework and no build step.
Maps & places	Mapbox GL JS for the map, plus Mapbox's Directions, Geocoding and Search Box APIs
Accounts & saved data	Supabase (sign-in, plus tables protected by row-level security)
Offline & install	A service worker and web app manifest
Hosting	GitHub Pages

Project layout

Wayfinder/
├── index.html            The trip planner
├── about.html            About LovinglyLost
├── contact.html          Contact page
├── login.html            Sign in, sign up, password reset
├── account.html          "My account"
├── updates.html          Every update, newest first
├── manifest.webmanifest  Makes it installable  ┐ these two must stay
├── service-worker.js     Offline support       ┘ at the top level
│
├── Map/                  The trip planner
│   ├── maptoken-config.js   ⭐ Settings: Mapbox token, map start, stop types
│   ├── Main-Launch.js       Starts the planner and connects everything
│   ├── Map.js               The map, markers, popups and drive-mode heart
│   ├── Routing-Location.js  Directions, place lookups and suggestions
│   ├── scenic-search.js     Finds stops spread evenly along the route
│   ├── category-check.js    Checks stop types against Mapbox's list
│   ├── CategoryFilter.js    The grouped stop-type picker
│   ├── CategoryIcons.js     An icon for every stop type
│   ├── PlaceAutocomplete.js Suggestions as you type
│   ├── road-preferences.js  Avoid tolls / highways / ferries
│   ├── MapReveal.js         Phone layout: planner first, then the map
│   └── state-and-data.js    The current trip
│
├── account/              Accounts (Supabase)
│   ├── supabase-client.js   The connection to Supabase
│   ├── login-page.js        The sign-in page
│   ├── account-page.js      The "My account" page
│   ├── account-places.js    Favorites and places to avoid on the account page
│   ├── place-lists.js       ♡ Save and Avoid in the planner
│   ├── hometown-suggest.js  Town suggestions for "Home town"
│   └── account-nav.js       Shows "My account" in the menu when signed in
│
├── JavaScript/           Shared by every page
│   ├── updates.js           ⭐ The list of updates people see
│   ├── whats-new.js         The What's new card, note and page
│   ├── tour.js              The first-time tour
│   ├── intro.js             The opening animation
│   ├── theme.js             Color themes
│   ├── site-nav.js          The menu
│   ├── contact-page.js      ⭐ The Contact email address
│   └── ProgressiveWebApp-Register.js  Turns on offline support
│
├── css/                  One stylesheet per part of the app
├── tools/                Behind-the-scenes pages (not in the menu)
├── icons/                App icons
└── images/               Artwork

⭐ = the files you'll edit most often.

Running it on your computer

The JavaScript loads as modules, so double-clicking index.html won't work. It needs to be served from a web address. From the project folder:

python3 -m http.server 8000

Then open http://localhost:8000. Any simple static server works too.

Mapbox token: the token only works on the web addresses it's allowed on. To use the app locally, add http://localhost:8000 to the token's allowed URLs in your Mapbox account. Otherwise the map and searches won't load.

Settings

Everything you'd want to change about the planner lives in Map/maptoken-config.js:

Setting	What it does
MAPBOX_TOKEN	Your Mapbox public token
DEFAULT_CENTER, DEFAULT_ZOOM	Where the map starts before a trip is planned
ROMANTIC_STOP_MAX_DISTANCE_MILES	How far from the road a stop can be (20 miles)
SCENIC_NAME_ZOOM, SCENIC_ADDRESS_ZOOM	How close you zoom in before stop names, then addresses, appear
CATEGORY_GROUPS	Every stop type, in the groups people pick from
DEFAULT_SELECTED_CATEGORIES	The stop types switched on for new visitors
MAPBOX_CATEGORY_IDS	Lets a stop type search a different Mapbox ID if its own isn't found

Elsewhere:

	•	Contact email: CONTACT_EMAIL in JavaScript/contact-page.js
	•	Supabase project: the URL and publishable key in account/supabase-client.js
	•	Search speed and spread: the numbers at the top of Map/scenic-search.js

Accounts (Supabase)

Accounts use Supabase sign-in. Each table has row-level security, so people can only see and change their own rows. The publishable key is meant to be in public code; those security rules are what keep the data private.

Table	What it holds
profiles	display_name, home_town, about, avoid_tolls, avoid_highways, avoid_ferries, theme
saved_places	Favorites and places to avoid: list, place_key, name, lng, lat, category, address
saved_trips	Ready for the upcoming Save this trip feature

The account code only loads for people who are signed in, so the planner stays quick for everyone else.

How do I…

<details>
<summary><strong>Add a new stop type?</strong></summary>
	1.	Open tools/category-finder.html and search for the kind of place to find its Mapbox ID.
	2.	In Map/maptoken-config.js, add one line to the right group in CATEGORY_GROUPS, with the ID on the left and the name people see on the right:

lake: 'Lake',

	3.	That's it. It gets its group's icon automatically. To give it its own icon, add it to Map/CategoryIcons.js.
</details>
<details>
<summary><strong>Tell people about an update?</strong></summary>

Add a new entry at the top of the list in JavaScript/updates.js. Use size: 'big' for a card that pops up, or size: 'small' for a short note that fades away. Behind-the-scenes fixes don't need one.

</details>
<details>
<summary><strong>Show the tour to everyone again?</strong></summary>

In JavaScript/tour.js, change TOUR_VERSION from '1' to '2'. The steps are listed in STEPS near the top of the same file.

</details>
<details>
<summary><strong>Add a color theme?</strong></summary>

Add its colors to css/theme.css under a new html[data-theme="..."] block, then add it to the THEMES list in JavaScript/theme.js.

</details>
<details>
<summary><strong>Make sure an update reaches phones that installed the app?</strong></summary>

Normal edits show up on their own: the app always asks for the newest files first. Only when files are moved or renamed, bump CACHE_NAME in service-worker.js (for example v15 → v16). Every file listed in its APP_SHELL must exist, or the offline update won't install.

</details>

Behind-the-scenes tools

These pages aren't in the menu. Open them by adding the path to the site address.

Page	What it's for
tools/category-finder.html	Search Mapbox's full list of place categories, check every stop type in the app (✓ or ✗), and copy the whole list
tools/search-compare.html	Runs the old and new scenic search on the same route and compares speed and spread

Good to know

	•	Mapbox limits: the scenic search sends many small requests, one per stop type for each stretch of road. It paces itself and slows down if Mapbox says it's going too fast. If some stretches still miss out, the app says so instead of failing quietly.
	•	Picking fewer stop types finds more of each on long drives, which is why the picker shows a tip when more than 30 are on.
	•	Broad map features (Mountain, River, Forest, Bay) can return points without parking, so they're off by default.
	•	Choose from the suggestions when typing a place. It fills in the location right away, while typing and immediately tapping Find our route can occasionally beat the lookup.

Update history

Date	Update
Nov 12, 2026	Pick your kind of trip: grouped stop types, 75+ new ones, first-time tour
Nov 2, 2026	Faster, better spread scenic stops
Nov 2, 2026	Stop names on the map
Oct 27, 2026	Skip the tolls, find the hidden beauty: road preferences
Oct 27, 2026	Favorite stops and places to avoid
Oct 26, 2026	Accounts, colors and a fresh welcome
Oct 20, 2026	Remove stops from your trip

The full list, with every change, is on the What's new page.

What's next

	☐︎	Save this trip: keep planned trips in your account and open them again later
	☐︎	Set the real Contact email

<p align="center">
  Made with ♥ by Patrick Johnston<br>
  <sub>Maps &copy; Mapbox &copy; OpenStreetMap contributors</sub>
</p>
