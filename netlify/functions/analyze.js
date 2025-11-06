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
        let websiteHTML = '';
        if (website) {
            try {
                const websiteResponse = await fetch(website.startsWith('http') ? website : `https://${website}`);
                websiteHTML = await websiteResponse.text();
            } catch (error) {
                console.error('Error fetching website:', error);
                websiteHTML = 'Unable to fetch website content';
            }
        }

        // Fetch Instagram profile (public data only)
        let instagramData = '';
        if (instagram) {
            try {
                const handle = instagram.replace('@', '');
                const instagramResponse = await fetch(`https://www.instagram.com/${handle}/`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const instagramHTML = await instagramResponse.text();
                
                // Extract basic info from HTML (bio, follower count if visible)
                // Instagram embeds JSON-LD data we can extract
                const bioMatch = instagramHTML.match(/"biography":"([^"]+)"/);
                const followersMatch = instagramHTML.match(/"edge_followed_by":{"count":(\d+)}/);
                const postsMatch = instagramHTML.match(/"edge_owner_to_timeline_media":{"count":(\d+)}/);
                
                instagramData = `Instagram @${handle}:\n`;
                if (bioMatch) instagramData += `Bio: ${bioMatch[1]}\n`;
                if (followersMatch) instagramData += `Followers: ${parseInt(followersMatch[1]).toLocaleString()}\n`;
                if (postsMatch) instagramData += `Posts: ${postsMatch[1]}\n`;
                
                if (!bioMatch && !followersMatch) {
                    instagramData += 'Profile exists but limited public data available\n';
                }
            } catch (error) {
                console.error('Error fetching Instagram:', error);
                instagramData = `Instagram handle provided: ${instagram} (unable to fetch profile data)`;
            }
        }

        // Fetch LinkedIn profile (very limited without login)
        let linkedinData = '';
        if (linkedin) {
            try {
                const linkedinResponse = await fetch(linkedin.startsWith('http') ? linkedin : `https://${linkedin}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const linkedinHTML = await linkedinResponse.text();
                
                // Extract headline/title if visible
                const titleMatch = linkedinHTML.match(/<title>([^<]+)<\/title>/);
                
                linkedinData = `LinkedIn Profile:\n`;
                if (titleMatch) {
                    linkedinData += `Title: ${titleMatch[1]}\n`;
                } else {
                    linkedinData += 'Profile exists but limited public data available (LinkedIn requires login for most data)\n';
                }
            } catch (error) {
                console.error('Error fetching LinkedIn:', error);
                linkedinData = `LinkedIn profile provided: ${linkedin} (unable to fetch profile data)`;
            }
        }

        // Create the analysis prompt with your updated version
        const prompt = `
You are a senior marketing strategist and online authority analyst. Your job is to evaluate someone's online presence (website + Instagram + LinkedIn) as if you were conducting a $500 professional audit. The goal is to provide genuinely valuable, personalized insight that helps them attract more qualified clients through stronger clarity, credibility, and visibility.

Analyze the provided materials below and return ONLY valid JSON using the format shown at the end. Do not include explanations or extra text outside the JSON.

Website: ${website || 'Not provided'}
Instagram: ${instagram || 'Not provided'}
LinkedIn: ${linkedin || 'Not provided'}

Website HTML (first 5000 chars):
${websiteHTML.substring(0, 5000)}

${instagramData ? `Instagram Profile Data:\n${instagramData}` : ''}

${linkedinData ? `LinkedIn Profile Data:\n${linkedinData}` : ''}

---
SCORING INSTRUCTIONS (0–100 each)

1. **Clarity** — How clearly do they communicate their value?
   - Does the site quickly explain what they do, who they help, and what transformation they create?
   - Is the copy specific (problem + solution + outcome) rather than vague or self-focused?
   - Do visuals and messaging align with a clear, client-centered promise?

2. **Credibility** — How trustworthy and professional do they appear?
   - Design quality (logo, layout, consistent branding, typography)
   - Presence of testimonials, case studies, or measurable results
   - Professionalism and authority tone (does it feel like an expert brand?)

3. **Visibility** — How visible and consistent is their marketing presence?
   - Active on social platforms (Instagram/LinkedIn activity if available)
   - Cross-platform consistency in messaging and branding
   - Social proof indicators (followers, engagement, testimonials)

---
SCORING RULES

- 0–39: Poor or missing fundamentals
- 40–54: Needs major work
- 55–69: Decent start but inconsistent
- 70–84: Strong, polished, and credible
- 85–100: Exceptional, professional, high-authority

Overall = (clarity * 0.33) + (credibility * 0.33) + (visibility * 0.34)

Badge options:
"EXCEPTIONAL" (85–100)
"STRONG" (70–84)
"GOOD START" (55–69)
"NEEDS WORK" (40–54)
"CRITICAL" (0–39)

---
TONE & OUTPUT

- Be consultative, motivational, and insightful (like a top-tier strategist).
- Point out the "why" behind each score.
- Provide *specific and realistic action steps* (but do NOT rewrite copy or give headline examples).
- Return only valid JSON with this exact structure:

{
  "clarity": 75,
  "credibility": 80,
  "visibility": 65,
  "overall": 73,
  "badge": "STRONG",
  "interpretation": "You have a strong foundation. A few strategic improvements will push you into the exceptional range.",
  "summary": "Your clarity and credibility are solid; focus now on improving consistency and visibility.",
  "actions": [
    "Add 2–3 testimonials with client headshots (+10 points to Credibility)",
    "Refine homepage messaging to highlight a single transformation (+8 points to Clarity)",
    "Post consistently on LinkedIn and cross-link your profiles (+12 points to Visibility)"
  ]
}
`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Parse Claude's response (strip markdown if present)
        let responseText = message.content[0].text;
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(responseText);

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
