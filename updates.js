// ================ WHAT'S NEW ================
// The list of updates people see in the "What's new" notice and page.
// When you push something worth telling people about, add a new entry at
// the TOP of the list. Behind-the-scenes fixes don't need one.
//
//   id:      any text that's different for every update. The date works;
//            add -2, -3 if you post more than one update in a day.
//   date:    shown to people, written however you like
//   size:    'big'   a card pops up listing the changes
//            'small' a little note slides in at the top for a few seconds
//   title:   one short line
//   changes: a list of short sentences
window.LOVINGLYLOST_UPDATES = [
	{
		id: '2026-10-26',
		date: 'October 26, 2026',
		size: 'big',
		title: 'Accounts, colors and a fresh welcome',
		changes: [
			'Create an account to keep your name and home town in one place.',
			'Pick from five color themes under Colors in the menu.',
			'The welcome animation now opens right onto the map.',
			'Home town suggests towns as you type.',
			'New updates now show up as soon as you refresh.'
		]
	},
	{
		id: '2026-10-20',
		date: 'October 20, 2026',
		size: 'small',
		title: 'Remove stops from your trip',
		changes: [
			'Changed your mind? Stops you add now have a Remove from Trip button.'
		]
	}
];
