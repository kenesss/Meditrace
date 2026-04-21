// ════════════════════════════
// Mobile Drawer Menu
// ════════════════════════════
const mobileToggle  = document.getElementById('mobileMenuToggle');
const mobileMenu    = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileMenuOverlay');

function openMobileMenu() {
    mobileMenu.classList.add('menu-open');
    mobileOverlay.classList.add('active');
    mobileToggle.style.display = 'none';
}

function closeMobileMenu() {
    mobileMenu.classList.remove('menu-open');
    mobileOverlay.classList.remove('active');
    mobileToggle.style.display = 'flex';
    document.body.style.overflow = '';
}

mobileToggle?.addEventListener('click', () => {
    mobileMenu.classList.contains('menu-open') ? closeMobileMenu() : openMobileMenu();
});

mobileOverlay?.addEventListener('click', closeMobileMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
});

// ════════════════════════════
// Profile Dropdown
// ════════════════════════════
const profileTrigger  = document.getElementById('profileTrigger');
const profileDropdown = document.getElementById('profileDropdown');

profileTrigger?.addEventListener('click', () => {
    profileDropdown?.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!profileTrigger?.contains(e.target) && !profileDropdown?.contains(e.target)) {
        profileDropdown?.classList.remove('show');
    }
});

// ════════════════════════════
// Header Burger (если есть)
// ════════════════════════════
const menuBtn  = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('show'));
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('show'));
    });
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !navLinks.contains(e.target)) {
            navLinks.classList.remove('show');
        }
    });
}