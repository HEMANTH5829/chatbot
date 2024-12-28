const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create an Express app
const app = express();

// Use CORS to allow requests from frontend (you can customize it for specific origins)
app.use(cors());
app.use(bodyParser.json());

// Sample data to simulate search results
const data = [
    { title: "AI in Architecture", description: "Explore how AI is transforming the field of architecture.", url: "https://example.com/ai-architecture" },
    { title: "AI for Design Automation", description: "Learn how AI can automate design processes.", url: "https://example.com/ai-design-automation" },
    { title: "The Future of AI", description: "A deep dive into the future of AI technology.", url: "https://example.com/future-ai" }
];

// Search API endpoint
app.get('/search', (req, res) => {
    const query = req.query.query.toLowerCase();
    const results = data.filter(item => 
        item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );

    // Return the results as a JSON response
    res.json({ results });
});

// Chat API endpoint
app.post('/chat', (req, res) => {
    const userMessage = req.body.message;
    // Simulate a response from the bot
    const botResponse = `You said: ${userMessage}`;
    res.json({ response: botResponse });
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});