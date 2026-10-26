// Plays the welcome animation once per visit. Its loaded in the <head>, so
// it can decide before the page is drawn: if the intro already played since
// the app was opened (say you went to About and came back), nothing shows.
(function(){
    const SEEN_KEY = 'lovingly-lost-intro-seen';

    let alreadySeen = false;
    try {
        alreadySeen = sessionStorage.getItem(SEEN_KEY) === 'yes';
        sessionStorage.setItem(SEEN_KEY, 'yes');
    } catch (err){
        // Private Browsing can block storage; the intro just plays each time.
    }
    if (alreadySeen) return;

    document.documentElement.classList.add('show-intro');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SHOW_FOR_MS = reduceMotion ? 1200 : 2400;
    const EXIT_MS = reduceMotion ? 500 :
    1200; // how long the leaving animation takes

    document.addEventListener('DOMContentLoaded', () => {
        const intro = document.getElementById('intro');
        if (!intro) return;

        let finished = false;
        function finish(){
            if (finished) return;
            finished = true;
            // The window onto the map opens from the middle of the heart.
            const heart = intro.querySelector('.intro-heart');
            if (heart){
                const box = heart.getBoundingClientRect();
                intro.style.setProperty('--hole-x', (box.left + box.width / 2) + 'px');
                intro.style.setProperty('--hole-y', (box.top + box.height / 2) + 'px');
            }
            intro.classList.add('is-leaving');
            setTimeout(() => {
                intro.remove();
                document.documentElement.classList.remove('show-intro');
            }, EXIT_MS);
        }

        setTimeout(finish, SHOW_FOR_MS);
        // A tap, click, or key press skips straight to the app.
        intro.addEventListener('click', finish);
        document.addEventListener('keydown', finish, { once: true});
    });
})();