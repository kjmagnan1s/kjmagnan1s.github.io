// Chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Add initial message
    addMessage('bot', 'Hello! I\'m Kevin\'s AI assistant. I can help you learn about Kevin\'s professional background in data analytics and business intelligence. Feel free to ask about his experience, skills, or areas of expertise. How can I help you today?');
    
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing';
        typingDiv.innerHTML = '<p>Typing...</p>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingDiv;
    }
    
    async function handleUserInput() {
        const question = userInput.value.trim();
        if (!question) return;
        
        // Add user message
        addMessage('user', question);
        userInput.value = '';
        
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        try {
            // Make API call
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: question })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Remove typing indicator
            typingIndicator.remove();
            
            if (data.success) {
                addMessage('bot', data.response);
            } else {
                console.error('API Error:', data.error);
                addMessage('bot', `Sorry, I encountered an error: ${data.error}`);
            }
        } catch (error) {
            console.error('Network Error:', error);
            typingIndicator.remove();
            addMessage('bot', `Sorry, I encountered a network error. Please try again later. Error: ${error.message}`);
        }
    }
    
    // Event listeners
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });
}); 