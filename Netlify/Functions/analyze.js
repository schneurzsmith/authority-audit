const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { name, website, instagram, linkedin } = JSON.parse(event.body);

        // Initialize Claude
        const anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });

        // Fetch website content
        const websiteResponse = await fetch(website.startsWith('http') ? website : `https://${website}`);
        const websiteHTML = await websiteResponse.text();

        // Create the analysis prompt
        const prompt = `You are an expert at analyzing online presence for lead generation. Analyze this website and provide scores.

Website: ${website}
Instagram: ${instagram || 'Not provided'}
LinkedIn: ${linkedin || 'Not provided'}

Website HTML (first 5000 chars):
${websiteHTML.substring(0, 5000)}

Provide a JSON response with this exact structure:
{
    "clarity": 75,
    "credibility": 80,
    "visibility": 65,
    "overall": 73,
    "badge": "STRONG",
    "interpretation": "You have a solid foundation. A few strategic improvements will push you into the exceptional range.",
    "summary": "Your Clarity and Credibility are strong. Your biggest opportunity is Visibility.",
    "actions": [
        "Add a blog section (+20 points to Visibility)",
        "Add LinkedIn profile link (+5 points)",
        "Create a lead magnet (+5 points)"
    ]
}

Score each area 0-100 based on:
- Clarity: Can people understand what you do?
- Credibility: Why should people trust you?
- Visibility: How easy are you to find?

Overall = (clarity * 0.33) + (credibility * 0.33) + (visibility * 0.34)

Badge options: "EXCEPTIONAL" (85-100), "STRONG" (70-84), "GOOD START" (55-69), "NEEDS WORK" (40-54), "CRITICAL" (0-39)

Return ONLY valid JSON, no other text.`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Parse Claude's response
        const analysis = JSON.parse(message.content[0].text);

        // Return the results
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(analysis)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Analysis failed', 
                details: error.message 
            })
        };
    }
};