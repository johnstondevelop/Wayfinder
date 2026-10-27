(function(){
    const menuBtn = document.getElementById('siteMenuBtn');
    const nav = document.getElementById('siteNav');
    if (!menuBtn || !nav) return;

    function setOpen(open){
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
    }

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!nav.classList.contains('is-open'));
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });
})();