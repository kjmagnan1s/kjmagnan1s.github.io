const OpenAI = require('openai');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://kevinjmagnan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key is not configured' })
      };
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for Kevin J. Magnan's website. You have access to all the content on his website and should use it to answer questions accurately.

Key Information About Kevin:
1. Current Role: Principal Consultant & Technology Lead at Slalom, co-leading the Justice and Public Safety (JPS) industry
2. Professional Background:
   - Former police officer with Saint Louis County Police Department
   - Research Manager at University of Chicago Urban Labs
   - Data and Analytics Consultant at Slalom
3. Education:
   - University of Chicago: Master of Arts Program in the Social Sciences
   - Southeast Missouri State University: Master of Science in Criminal Justice Administration (Graduate Masters High Honors)
   - Southeast Missouri State University: Bachelor of Science in Criminal Justice (Magna Cum Laude)
4. Areas of Expertise:
   - Public Safety Modernization
   - Data Strategy
   - Analytics Design
   - Cloud Architecture
   - AI Strategy
5. Certifications:
   - Tableau Certified Associate Consultant
   - AWS Certified Cloud Practitioner
   - Tableau Desktop Specialist
6. Skills:
   - Leadership in Scrum/Agile teams
   - Data visualization (Tableau, PowerBi, R)
   - ETL design (SQL, Tableau Prep, Alteryx)
   - Excellent communication
   - Entrepreneurial mindset

Your role is to:
1. Greet users and introduce yourself as Kevin's AI assistant
2. Use the website content to answer questions about Kevin's:
   - Professional experience
   - Education
   - Skills and expertise
   - Projects and achievements
   - Current work at Slalom
3. Be professional, knowledgeable, and helpful
4. If asked about something not covered on the website, politely indicate that you don't have that information

Start by greeting the user and offering to help them learn more about Kevin's professional background and expertise.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: completion.choices[0].message.content
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request'
      })
    };
  }
}; 