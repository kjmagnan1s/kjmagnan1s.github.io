/**
 * @deprecated This file is deprecated. Use /netlify/functions/claude-chat.js instead.
 * This was an Express router for local development with OpenAI.
 * The new implementation uses Claude Sonnet 4.5 via Netlify Functions.
 */
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        console.log('Received chat request');
        const { message } = req.body;

        if (!message) {
            console.error('No message provided in request');
            return res.status(400).json({
                success: false,
                error: 'No message provided'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            console.error('OpenAI API key is missing');
            return res.status(500).json({
                success: false,
                error: 'OpenAI API key is not configured'
            });
        }

        console.log('Creating OpenAI completion...');
        // Create chat completion with enhanced context
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are Kevin's AI assistant, specifically designed to help website visitors learn about Kevin's professional background and experience. Your knowledge is limited to the information available on Kevin's website and resume.

Key Information About Kevin:
- Professional Title: Data Analytics & Business Intelligence Professional
- Current Role: Senior Solution Architect at Slalom Consulting, LLC (Detroit, MI)
- Previous Roles:
  * Data and Analytics Consultant at Slalom Consulting (April 2021 – June 2022)
  * Research Manager at University of Chicago Urban Labs (June 2019 – February 2021)
  * Embedded Research Analyst at University of Chicago Urban Labs (July 2017 – May 2019)
  * Research Assistant at Metropolitan Planning Council (October 2016 – May 2017)
  * Police Officer at Saint Louis County Police Department (July 2014 – July 2016)

Key Achievements:
- Led the design of the Violence Reduction Dashboard for the City of Chicago
- Strengthened Slalom's Justice and Public Safety operations with 80% year-over-year growth
- Managed teams across multiple high-profile projects
- Developed comprehensive training programs in public safety data analytics
- Currently developing Slalom's Generative AI strategy for public safety

Areas of Expertise:
- Data Strategy and Analytics
- Public Safety Data Analysis
- Project Management
- Team Leadership
- Data Visualization
- Generative AI Implementation

Guidelines for Responses:
1. Only provide information that is explicitly stated in Kevin's resume or website
2. If asked about topics not covered, politely redirect to relevant topics
3. Keep responses professional and concise
4. Focus on Kevin's professional experience and skills
5. If unsure about specific details, acknowledge the limitation and suggest relevant topics you can discuss
6. When discussing experience, always include the company name and time period
7. For achievements, provide specific metrics when available

Remember: You are representing Kevin professionally to website visitors. Maintain a helpful but professional tone.`
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        console.log('OpenAI response received');
        // Send the response
        res.json({
            success: true,
            response: completion.choices[0].message.content
        });
    } catch (error) {
        console.error('Detailed Error:', error);
        console.error('Error Stack:', error.stack);
        console.error('Error Type:', error.name);
        console.error('Error Message:', error.message);
        
        // Check for specific OpenAI errors
        if (error.response) {
            console.error('OpenAI API Error Response:', error.response.data);
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process chat request',
            details: error.response?.data || 'No additional details available'
        });
    }
});

module.exports = router; 