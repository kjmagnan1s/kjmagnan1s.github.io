/* Particles.js configuration for the hero background */
(function() {
    // Only initialize particles on the homepage - EXACTLY '/' or '/index.html'
    const pathname = window.location.pathname;
    const isHomepage = pathname === '/' || pathname === '/index.html';

    if (!isHomepage) {
        // Hide particles container on non-homepage pages (blog, about, etc)
        const particlesContainer = document.getElementById('particles-js');
        if (particlesContainer) {
            particlesContainer.style.display = 'none';
        }
        return;
    }

    if (typeof particlesJS === 'undefined') {
        console.warn('Particles.js library not found. Skipping particle background.');
        return;
    }

    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 40,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#2563eb"
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#2563eb"
                },
                "polygon": {
                    "nb_sides": 5
                }
            },
            "opacity": {
                "value": 0.4,
                "random": false,
                "anim": {
                    "enable": false,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 4,
                "random": true,
                "anim": {
                    "enable": false,
                    "speed": 40,
                    "size_min": 0.1,
                    "sync": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#2563eb",
                "opacity": 0.3,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 4,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
                "attract": {
                    "enable": false,
                    "rotateX": 600,
                    "rotateY": 1200
                }
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": false,
                    "mode": "repulse"
                },
                "onclick": {
                    "enable": false,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 400,
                    "line_linked": {
                        "opacity": 1
                    }
                },
                "bubble": {
                    "distance": 400,
                    "size": 40,
                    "duration": 2,
                    "opacity": 8,
                    "speed": 3
                },
                "repulse": {
                    "distance": 200
                },
                "push": {
                    "particles_nb": 4
                },
                "remove": {
                    "particles_nb": 2
                }
            }
        },
        "retina_detect": true
    });
})();
