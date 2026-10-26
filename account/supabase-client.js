// Connects LovinglyLost to your Supabase project, where accounts saved
//trips and saved places are kept. The publishable key is meant to sit in
//oublic code like this; the security rules on each table are what stop
// peopl from seeing anyone else's data
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.100.1/+esm';

const SUPABASE_URL = 'https://uohhvcjqvozmpjlnuuny.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bhKkmgDCqyNt0Y183XJikw_zE2kRWQ_';

// Where this browser remembers that someone is signed in. account-nav.js
//checks the same name, so if you ever change it, change it there too.
export const SIGN_IN_STORAGE_KEY = 'lovinglylost-auth';

// The links in Supabase's emails (confirm your account, reset your password)
// bring people back with details after a # in the address. Read them now,
// before the Supabase library tidies them away
const linkInfo = new URLSearchParams(location.hash.slice(1));
export const emailLinkType = linkInfo.get('type'); // signup or recovery
export const emailLinkError = linkInfo.get('error_description');

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        storageKey: SIGN_IN_STORAGE_KEY,
        flowType: 'implicit'
    }
});

// the signed-in person, or null if nobody is signed in on this browser.
export async function getSignedInUser(){
    const { data } = await supabase.auth.getSession();
    return data.session ? data.session.user : null;
}

// The full web address of another page on the site, for the links in emails.
export function pageAddress(fileName){
    return new URL(fileName, location.href).href;
}