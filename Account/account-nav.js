// Turns the menus 'Sign in' link into 'My Account' when someone is signed
// in. It only checks whether this browser has a saved sign-in, so pages
// dont have to wait for the whole account system to load
(function(){
    const link = document.getElementById('accountNavLink');
    if (!link) return;

    let signedIn = false;
    try {
        signedIn = Boolean(localStorage.getItem('lovinglylost-auth'));
    } catch (err){
        // Storage can be blocked in private browsing; the link stays "Sign in".
    }

    if (signedIn){
        link.textContent = 'My account';
        link.href = 'account.html';
    }
})(); 