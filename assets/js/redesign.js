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

// Particles are now position: absolute within hero section
// No scroll detection needed - they stay fixed in hero and don't follow scroll

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

// ========================================
// AI Chatbot Functionality
// ========================================
class Chatbot {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSend = document.getElementById('chat-send');
        this.chatBody = document.getElementById('chatbot-body');
        this.chatToggle = document.getElementById('chatbot-toggle');
        this.chatStatus = document.getElementById('chat-status');

        this.apiUrl = 'https://tubular-torte-6b51ae.netlify.app/.netlify/functions/chat';
        this.isTyping = false;
        this.isCollapsed = false;

        this.init();
    }

    init() {
        if (!this.chatMessages || !this.chatInput || !this.chatSend) {
            console.warn('Chatbot elements not found. Skipping chatbot initialization.');
            return;
        }

        // Event listeners
        this.chatSend.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Toggle functionality
        if (this.chatToggle && this.chatBody) {
            this.chatToggle.addEventListener('click', () => this.toggleChat());
        }

        // Auto-resize input
        this.chatInput.addEventListener('input', () => this.autoResizeInput());

        console.log('Chatbot initialized successfully');
    }

    toggleChat() {
        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            this.chatBody.classList.add('collapsed');
            this.chatToggle.classList.add('collapsed');
        } else {
            this.chatBody.classList.remove('collapsed');
            this.chatToggle.classList.remove('collapsed');
            // Focus input when opening
            setTimeout(() => this.chatInput.focus(), 300);
        }
    }

    autoResizeInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();

        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.autoResizeInput();

        // Show typing indicator
        this.showTypingIndicator();
        this.updateStatus('sending');

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'omit',
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.reply) {
                this.removeTypingIndicator();
                this.addMessage(data.reply, 'bot');
                this.updateStatus('online');
            } else {
                throw new Error('No reply received from the server');
            }

        } catch (error) {
            console.error('Chatbot error:', error);
            this.removeTypingIndicator();

            // Fallback responses
            const fallbackResponses = [
                "I'm having trouble connecting right now, but I'd be happy to tell you that Kevin specializes in AI and analytics for justice and public safety modernization.",
                "Sorry, I'm experiencing technical difficulties. Kevin is a Principal Consultant at Slalom with expertise in cloud architecture and data strategy.",
                "I can't connect at the moment, but Kevin has extensive experience in CJIS compliance and government technology modernization."
            ];

            const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            this.addMessage(randomResponse, 'bot');
            this.updateStatus('error');

            // Reset status after 3 seconds
            setTimeout(() => this.updateStatus('online'), 3000);
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const icon = document.createElement('i');
        icon.className = type === 'user' ? 'bx bx-user' : 'bx bx-bot';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const paragraph = document.createElement('p');
        paragraph.textContent = content;

        messageContent.appendChild(paragraph);
        messageDiv.appendChild(icon);
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.isTyping = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator-message';
        typingDiv.id = 'typing-indicator';

        const icon = document.createElement('i');
        icon.className = 'bx bx-bot';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        messageContent.appendChild(typingIndicator);
        typingDiv.appendChild(icon);
        typingDiv.appendChild(messageContent);

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    updateStatus(status) {
        if (!this.chatStatus) return;

        const statusIcon = this.chatStatus.querySelector('i');
        const statusText = this.chatStatus.querySelector('span');

        // Remove all status classes
        this.chatStatus.classList.remove('sending', 'error');

        switch (status) {
            case 'sending':
                this.chatStatus.classList.add('sending');
                statusIcon.className = 'bx bx-time-five';
                statusText.textContent = 'AI Assistant Thinking...';
                break;
            case 'error':
                this.chatStatus.classList.add('error');
                statusIcon.className = 'bx bx-error';
                statusText.textContent = 'Connection Error';
                break;
            case 'online':
            default:
                statusIcon.className = 'bx bx-check-circle';
                statusText.textContent = 'AI Assistant Online';
                break;
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chatbot when DOM is ready
onReady(function() {
    window.chatbot = new Chatbot();
});

// Export for global use
window.scrollToElement = scrollToElement;
