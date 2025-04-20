require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const chatRouter = require('./api/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '_site')));

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api', chatRouter);

// Serve the main page
app.get('*', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, '_site', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Configured' : 'Missing');
}); 