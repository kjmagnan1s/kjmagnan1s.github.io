/**
 * Kevin J. Magnan - Redesigned Portfolio
 * Main JavaScript File
 */

// DOM ready helper
function onReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Preloader
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.display = 'none';
    }
});

// Typed.js Initialization
onReady(function() {
    if (document.querySelector('.typed')) {
        if (typeof Typed === 'undefined') {
            console.warn('Typed.js library not loaded. Skipping hero text animation.');
            return;
        }

        const typedElement = document.querySelector('.typed');
        const items = typedElement.getAttribute('data-typed-items');
        if (items) {
            const typedItems = items.split(',').map(item => item.trim());
            new Typed('.typed', {
                strings: typedItems,
                loop: true,
                typeSpeed: 100,
                backSpeed: 50,
                backDelay: 2000
            });
        }
    }
});

// Show particles ONLY on hero section (hide when scrolling past)
onReady(function() {
    const particlesContainer = document.getElementById('particles-js');
    const heroSection = document.getElementById('hero');

    if (!particlesContainer || !heroSection) {
        return;
    }

    // Check page location - particles should only show on homepage
    const isHomepage = window.location.pathname === '/' ||
                       window.location.pathname === '/index.html' ||
                       window.location.pathname.endsWith('/');

    if (!isHomepage) {
        // Not on homepage - hide particles completely
        particlesContainer.style.display = 'none';
        return;
    }

    // On homepage - show particles in hero, hide when scrolling past
    window.addEventListener('scroll', function() {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Show particles ONLY if within hero section
        if (scrollTop <= heroBottom) {
            particlesContainer.style.display = 'block';
            if (window.pJSDom && window.pJSDom[0]) {
                window.pJSDom[0].pJS.fn.particlesStart();
            }
        } else {
            // Scrolled past hero - hide particles
            particlesContainer.style.display = 'none';
            if (window.pJSDom && window.pJSDom[0]) {
                window.pJSDom[0].pJS.fn.particlesStop();
            }
        }
    });
});

// Smooth Scroll Navigation
document.querySelectorAll('.nav-menu a, .scrollto').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });

                // Update active menu item
                document.querySelectorAll('.nav-menu .active').forEach(item => {
                    item.classList.remove('active');
                });
                this.parentElement.classList.add('active');

                // Close mobile menu if open
                if (document.body.classList.contains('mobile-nav-active')) {
                    document.body.classList.remove('mobile-nav-active');
                    document.querySelector('.mobile-nav-toggle').classList.remove('open');
                }
            }
        }
    });
});

// Mobile Menu Toggle
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', function(e) {
        document.body.classList.toggle('mobile-nav-active');
        this.classList.toggle('open');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const header = document.querySelector('#header');

    if (!mobileNavToggle || !header) {
        return;
    }

    if (!mobileNavToggle.contains(e.target) && !header.contains(e.target)) {
        if (document.body.classList.contains('mobile-nav-active')) {
            document.body.classList.remove('mobile-nav-active');
            if (mobileNavToggle) mobileNavToggle.classList.remove('open');
        }
    }
});

// Highlight active menu item on scroll
window.addEventListener('scroll', function() {
    const scrollTop = window.scrollTop || document.documentElement.scrollTop;
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 300;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-menu .active').forEach(item => {
                item.classList.remove('active');
            });

            const activeLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.parentElement.classList.add('active');
            }
        }
    });
});

// Hash navigation on page load
if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
        setTimeout(function() {
            window.scrollTo({
                top: target.offsetTop,
                behavior: 'smooth'
            });
        }, 100);
    }
}

// Back to Top Button
const backToTopButton = document.querySelector('.back-to-top');

window.addEventListener('scroll', function() {
    if (!backToTopButton) {
        return;
    }

    if (window.pageYOffset > 100) {
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.style.display = 'none';
    }
});

if (backToTopButton) {
    backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Portfolio Filtering with Isotope
onReady(function() {
    // Check if isotope is available
    if (typeof Isotope !== 'undefined') {
        const portfolioContainer = document.querySelector('.portfolio-container');

        if (portfolioContainer) {
            const iso = new Isotope(portfolioContainer, {
                itemSelector: '.portfolio-item',
                layoutMode: 'fitRows'
            });

            const filters = document.querySelectorAll('#portfolio-filters li');
            filters.forEach(filter => {
                filter.addEventListener('click', function() {
                    filters.forEach(f => f.classList.remove('filter-active'));
                    this.classList.add('filter-active');

                    const filterValue = this.getAttribute('data-filter');
                    iso.arrange({ filter: filterValue });

                    // Reinitialize AOS animations
                    if (typeof AOS !== 'undefined') {
                        AOS.refresh();
                    }
                });
            });
        }
    }

    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            easing: 'ease-in-out'
        });
    }
});

// Load Blog Posts Dynamically
onReady(loadBlogPosts);

function loadBlogPosts() {
    const blogContainer = document.getElementById('blog-posts');
    if (!blogContainer) return;

    // Fetch blog posts from Jekyll
    fetch('/blog/index.html')
        .then(response => response.text())
        .then(html => {
            // Parse blog posts from the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const posts = doc.querySelectorAll('.blog-post');

            // Display first 3 posts
            let count = 0;
            posts.forEach(post => {
                if (count >= 3) return;

                const postTitle = post.querySelector('.post-title a')?.textContent || 'Untitled';
                const postLink = post.querySelector('.post-title a')?.href || '#';
                const postDate = post.querySelector('.post-date')?.textContent || '';
                const postExcerpt = post.querySelector('.post-excerpt')?.textContent || '';

                const blogCard = document.createElement('div');
                blogCard.className = 'col-md-6 col-lg-4';
                blogCard.innerHTML = `
                    <div class="icon-box" data-aos="fade-up" data-aos-delay="${count * 100}">
                        <h4><a href="${postLink}">${postTitle}</a></h4>
                        <p class="blog-date">${postDate}</p>
                        <p>${postExcerpt.substring(0, 100)}...</p>
                        <a href="${postLink}" class="read-more">Read More →</a>
                    </div>
                `;

                blogContainer.appendChild(blogCard);
                count++;
            });
        })
        .catch(error => console.log('Could not load blog posts:', error));
}

// Contact Form Handling
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;

        // Simple validation
        if (!name || !email || !subject || !message) {
            alert('Please fill in all fields');
            return;
        }

        // You can add Email.js integration here
        // For now, just log the data
        console.log({
            name: name,
            email: email,
            subject: subject,
            message: message
        });

        // Show success message
        alert('Thank you for your message! I will get back to you soon.');
        contactForm.reset();
    });
}

// Venobox Integration (if available)
if (typeof VenoBox !== 'undefined') {
    new VenoBox({
        selector: '.venobox',
        share: false
    });
}

// Add smooth page transitions
window.addEventListener('beforeunload', function() {
    document.body.style.opacity = '1';
});

// Utility: Scroll to element
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Export for global use
window.scrollToElement = scrollToElement;
