/**
 * Conversation Module
 * Handles the chat modal and fit analysis
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: 'https://tubular-torte-6b51ae.netlify.app/.netlify/functions/claude-chat',
        revealDelay: 300, // ms before greeting starts revealing
        loadingMessages: [
            "Thinking...",
            "Pulling from memory...",
            "Considering my experience...",
            "Reflecting on that...",
            "Let me think about this...",
            "Gathering my thoughts...",
            "Connecting the dots...",
            "Recalling relevant work...",
            "Formulating a response...",
            "Almost there...",
            "Digging into that question...",
            "Processing..."
        ],
        loadingInterval: 5000 // ms between message changes
    };

    let loadingIntervalId = null;

    // DOM Elements - initialized in init() after DOM ready
    let elements = null;

    /**
     * Initialize DOM element references
     */
    function initElements() {
        elements = {
            // Homepage greeting
            greetingText: document.getElementById('greeting-text'),

            // Trigger form
            triggerForm: document.getElementById('trigger-form'),
            triggerInput: document.getElementById('trigger-input'),

            // Modal
            modal: document.getElementById('chat-modal'),
            modalClose: document.getElementById('chat-modal-close'),
            responseText: document.getElementById('chat-response-text'),
            loading: document.getElementById('chat-loading'),
            chatForm: document.getElementById('chat-form'),
            chatInput: document.getElementById('chat-input'),
            chatSubmit: document.getElementById('chat-submit'),
            submitText: document.querySelector('.submit-text'),
            submitLoading: document.querySelector('.submit-loading'),

            // Fit Analysis
            fitIntro: document.querySelector('.fit-intro'),
            fitInputArea: document.getElementById('fit-input-area'),
            jobDescription: document.getElementById('job-description'),
            analyzeButton: document.getElementById('analyze-button'),
            analyzeText: document.querySelector('.analyze-text'),
            analyzeLoading: document.querySelector('.analyze-loading'),
            fitResults: document.getElementById('fit-results'),
            fitSummary: document.getElementById('fit-summary'),
            strongFitList: document.getElementById('strong-fit-list'),
            growthList: document.getElementById('growth-list'),
            gapsList: document.getElementById('gaps-list'),
            resetButton: document.getElementById('reset-analysis')
        };
    }

    /**
     * Reveal text with fade effect
     */
    function revealText(element) {
        if (element) {
            element.classList.add('revealed');
        }
    }

    /**
     * Start cycling loading messages
     */
    function startLoadingMessages() {
        if (!elements.loading) return;

        let index = 0;
        elements.loading.textContent = CONFIG.loadingMessages[index];
        elements.loading.classList.add('active');

        loadingIntervalId = setInterval(() => {
            index = (index + 1) % CONFIG.loadingMessages.length;
            elements.loading.textContent = CONFIG.loadingMessages[index];
        }, CONFIG.loadingInterval);
    }

    /**
     * Stop cycling loading messages
     */
    function stopLoadingMessages() {
        if (loadingIntervalId) {
            clearInterval(loadingIntervalId);
            loadingIntervalId = null;
        }
        if (elements.loading) {
            elements.loading.classList.remove('active');
        }
    }

    /**
     * Initialize greeting reveal on scroll
     */
    function initGreetingReveal() {
        if (!elements.greetingText) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        revealText(elements.greetingText);
                    }, CONFIG.revealDelay);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.3 });

        const section = document.querySelector('.conversation');
        if (section) {
            observer.observe(section);
        }
    }

    /**
     * Initialize fit intro reveal on scroll
     */
    function initFitIntroReveal() {
        if (!elements.fitIntro) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        revealText(elements.fitIntro);
                    }, CONFIG.revealDelay);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.3 });

        const section = document.querySelector('.fit-analysis');
        if (section) {
            observer.observe(section);
        }
    }

    /**
     * Open modal
     */
    function openModal() {
        elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        elements.chatInput.focus();
    }

    /**
     * Close modal
     */
    function closeModal() {
        elements.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Send message to API
     */
    async function sendMessage(message) {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, mode: 'conversation' })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        return data.response || 'Sorry, I couldn\'t process that. Try asking something else.';
    }

    /**
     * Display response with fade reveal
     */
    function displayResponse(text) {
        elements.responseText.textContent = text;
        elements.responseText.classList.remove('revealed');

        // Trigger reflow for animation
        void elements.responseText.offsetWidth;

        // Reveal after brief delay
        setTimeout(() => {
            elements.responseText.classList.add('revealed');
        }, 100);
    }

    /**
     * Handle trigger form submission (opens modal with first question)
     */
    async function handleTriggerSubmit(e) {
        e.preventDefault();

        const message = elements.triggerInput.value.trim();
        if (!message) {
            elements.triggerInput.focus();
            return;
        }

        // Open modal
        openModal();

        // Show loading
        startLoadingMessages();
        elements.responseText.textContent = '';
        elements.responseText.classList.remove('revealed');

        try {
            const reply = await sendMessage(message);
            stopLoadingMessages();
            displayResponse(reply);

            // Clear trigger input
            elements.triggerInput.value = '';

        } catch (error) {
            console.error('Chat error:', error);
            stopLoadingMessages();
            displayResponse('Something went wrong. Please try again.');
        }
    }

    /**
     * Handle chat form submission (follow-up questions in modal)
     */
    async function handleChatSubmit(e) {
        e.preventDefault();

        const message = elements.chatInput.value.trim();
        if (!message) return;

        // Show loading
        elements.chatSubmit.disabled = true;
        elements.submitText.style.display = 'none';
        elements.submitLoading.style.display = 'inline';
        startLoadingMessages();
        elements.responseText.classList.remove('revealed');

        try {
            const reply = await sendMessage(message);
            stopLoadingMessages();
            displayResponse(reply);
            elements.chatInput.value = '';

        } catch (error) {
            console.error('Chat error:', error);
            stopLoadingMessages();
            displayResponse('Something went wrong. Please try again.');
        } finally {
            elements.chatSubmit.disabled = false;
            elements.submitText.style.display = 'inline';
            elements.submitLoading.style.display = 'none';
            elements.chatInput.focus();
        }
    }

    /**
     * Handle fit analysis
     */
    async function handleFitAnalysis() {
        const jobDescription = elements.jobDescription.value.trim();
        if (!jobDescription) {
            elements.jobDescription.focus();
            return;
        }

        // Show loading state
        elements.analyzeButton.disabled = true;
        elements.analyzeText.style.display = 'none';
        elements.analyzeLoading.style.display = 'inline';

        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: jobDescription, mode: 'fit-analysis' })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            renderFitResults(data);

        } catch (error) {
            console.error('Fit analysis error:', error);
            alert('Something went wrong analyzing the job description. Please try again.');
        } finally {
            elements.analyzeButton.disabled = false;
            elements.analyzeText.style.display = 'inline';
            elements.analyzeLoading.style.display = 'none';
        }
    }

    /**
     * Render fit analysis results
     */
    function renderFitResults(data) {
        elements.fitInputArea.style.display = 'none';
        elements.fitResults.style.display = 'block';

        // Summary
        if (data.summary) {
            elements.fitSummary.textContent = data.summary;
            elements.fitSummary.style.display = 'block';
        } else {
            elements.fitSummary.style.display = 'none';
        }

        // Helper to populate a list
        function populateList(listElement, items, emptyMessage) {
            listElement.innerHTML = '';
            if (items && items.length > 0) {
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    listElement.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = emptyMessage;
                li.style.fontStyle = 'italic';
                li.style.opacity = '0.7';
                listElement.appendChild(li);
            }
        }

        // Populate all three columns
        populateList(elements.strongFitList, data.strongFit, 'None identified.');
        populateList(elements.growthList, data.growthAreas, 'None identified.');
        populateList(elements.gapsList, data.gaps, 'None identified.');
    }

    /**
     * Reset fit analysis
     */
    function resetFitAnalysis() {
        elements.fitResults.style.display = 'none';
        elements.fitInputArea.style.display = 'flex';
        elements.jobDescription.value = '';
        elements.jobDescription.focus();
    }

    /**
     * Initialize
     */
    function init() {
        // Initialize DOM element references
        initElements();

        // Check if elements exist
        if (!elements.greetingText) return;

        // Initialize greeting reveal
        initGreetingReveal();

        // Initialize fit intro reveal
        initFitIntroReveal();

        // Trigger form (homepage)
        if (elements.triggerForm) {
            elements.triggerForm.addEventListener('submit', handleTriggerSubmit);
        }

        // Modal close button
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', closeModal);
        }

        // Close modal on overlay click
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    closeModal();
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Chat form (in modal)
        if (elements.chatForm) {
            elements.chatForm.addEventListener('submit', handleChatSubmit);
        }

        // Fit analysis
        if (elements.analyzeButton) {
            elements.analyzeButton.addEventListener('click', handleFitAnalysis);
        }

        // Reset button
        if (elements.resetButton) {
            elements.resetButton.addEventListener('click', resetFitAnalysis);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
