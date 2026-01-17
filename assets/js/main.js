/**
 * Kevin Magnan Website - Minimal JavaScript
 * No dependencies, vanilla JS only
 */

(function() {
    'use strict';

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = this.getAttribute('href');
            if (href.length > 1) {
                e.preventDefault();
                var target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Intersection Observer for fade-in animations
    if ('IntersectionObserver' in window) {
        var observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
            observer.observe(el);
        });
    } else {
        // Fallback: show all elements immediately
        document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
            el.classList.add('is-visible');
        });
    }

    // Current year for footer
    var yearEl = document.querySelector('.current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

})();
