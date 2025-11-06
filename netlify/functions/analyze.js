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

        // Create the analysis prompt
        const prompt = `You are a senior brand strategist and conversion consultant conducting a $2,500 professional online authority audit. 

GOAL: Help the user see how to generate more high-value clients who are pre-sold on their offers through stronger clarity, credibility, and visibility.

---

**CLARITY** — Can a potential client instantly understand you're the solution to their problem?
Measures: messaging on website and social media showing VALUE, not just services.

Key Checks:
- Clear who you help + what transformation you create
- Problem and solution stated explicitly
- Benefit-driven language (outcomes, not features)
- Consistent message across platforms
- Logical site structure, hero explains purpose in 5 seconds
- Imagery and design support the message
- Simple CTAs with intuitive wording

**CREDIBILITY** — Do you LOOK like someone charging premium prices?
Measures: professional design, proof elements, brand consistency.

Key Checks:
- High-resolution images, consistent typography and colors
- Modern layout, balanced white space
- Professional headshots or branded portraits
- Testimonials with names/photos/results (NOT required above fold)
- Case studies, client logos, credentials
- SSL, professional email, complete bio
- Strong visual hierarchy, premium feel
- Confident, expertise-driven language

**VISIBILITY** — How easily can ideal clients find and recognize you?
Measures: findability, platform consistency, content activity.

Key Checks:
- Name/business clearly on website
- Active social presence with consistent branding
- Recent content (within 60 days)
- Consistent profile images and bios
- Profile links funnel to website
- Appears in relevant searches
- Educational/authority content visible

---

MATERIALS PROVIDED:
Website: ${website || 'Not provided'}
Instagram: ${instagram || 'Not provided'}
LinkedIn: ${linkedin || 'Not provided'}

Website HTML (first 5000 chars):
${websiteHTML.substring(0, 5000)}

${instagramData ? `Instagram Data:\n${instagramData}` : ''}
${linkedinData ? `LinkedIn Data:\n${linkedinData}` : ''}

---

SCORING (0-100 each):

CLARITY:
- 85-100: Crystal clear value prop, specific transformation, outcome-focused
- 70-84: Clear but could be more specific
- 55-69: Somewhat vague or feature-focused
- 40-54: Unclear positioning
- 0-39: Confusing or missing

CREDIBILITY:
- 85-100: Premium brand, multiple proof types, polished design
- 70-84: Professional with some proof
- 55-69: Decent design but inconsistent or missing proof
- 40-54: Amateur feel or poor design
- 0-39: No credibility signals

VISIBILITY:
- 85-100: Active, consistent, findable across platforms
- 70-84: Present and somewhat active
- 55-69: Inconsistent or limited activity
- 40-54: Minimal presence
- 0-39: Hard to find or inactive

OVERALL = (Clarity × 0.35) + (Credibility × 0.35) + (Visibility × 0.30)

BADGES:
- 85-100: "EXCEPTIONAL"
- 70-84: "STRONG"  
- 55-69: "SOLID FOUNDATION"
- 40-54: "NEEDS REFINEMENT"
- 0-39: "REQUIRES ATTENTION"

---

CRITICAL - BAD UX PRACTICES TO NEVER RECOMMEND:
✗ Adding testimonials or social proof "above the fold" or in hero section
✗ Cluttering hero before explaining the offer clearly
✗ Moving proof elements higher when messaging isn't clear first
✗ Cross-linking that sends traffic away from website
✗ Adding video testimonials to hero
✗ Generic advice like "post 3x/week" without evidence of current activity

DETECTION RULES:
- Be conservative: don't suggest adding things that might already exist
- Look for proof keywords throughout HTML: "results", "case study", "client", "testimonial", "worked with", numbers/percentages
- If Instagram shows high follower count, don't suggest "building audience"

RECOMMENDATION PRIORITY:
1. Fix clarity FIRST (if unclear, nothing else matters)
2. Then credibility (design, proof placement)
3. Then visibility (reach/traffic)

---

CRITICAL: You MUST return valid JSON with these EXACT field names. Do not use any other field names.

Return ONLY this JSON structure (no markdown, no ```json tags, no extra text):

{
  "clarity": 78,
  "credibility": 72,
  "visibility": 45,
  "overall": 67,
  "badge": "SOLID FOUNDATION",
  "interpretation": "Write a brief 1-2 sentence summary of their overall authority position.",
  "summary": "Write 2-3 paragraphs. Paragraph 1: What works well (specific elements). Paragraph 2: What's missing and the cost (lost clients, unclear positioning). Paragraph 3: Biggest growth opportunity.",
  "actions": [
    "First strategic action addressing a real gap",
    "Second high-impact action",
    "Third conversion-focused action"
  ]
}

TONE: Strategic consultant ($2,500 audit quality). Honest but motivational. Specific, not generic. Focus on ROI and client attraction.`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Parse Claude's response (strip markdown if present)
        let responseText = message.content[0].text;
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let analysis;
        try {
            analysis = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response Text:', responseText);
            throw new Error('Failed to parse Claude response as JSON');
        }

        // BULLETPROOF: Ensure all required fields exist with fallbacks
        if (!analysis.interpretation) {
            analysis.interpretation = "Your online authority shows promise with opportunities for strategic growth.";
        }
        if (!analysis.summary) {
            analysis.summary = "Your online presence demonstrates solid fundamentals. The primary opportunity lies in strengthening the clarity of your positioning and value proposition. By refining your messaging to be more outcome-focused and adding strategic proof elements, you can significantly enhance your authority and attract higher-quality clients who are pre-sold on your expertise.";
        }
        if (!analysis.actions || !Array.isArray(analysis.actions) || analysis.actions.length === 0) {
            analysis.actions = [
                "Refine homepage messaging to clearly state who you help and the transformation you create",
                "Add client testimonials with specific results to build credibility",
                "Ensure consistent branding and active presence across your social platforms"
            ];
        }
        if (!analysis.badge) {
            analysis.badge = "SOLID FOUNDATION";
        }
        if (!analysis.clarity) analysis.clarity = 70;
        if (!analysis.credibility) analysis.credibility = 70;
        if (!analysis.visibility) analysis.visibility = 50;
        if (!analysis.overall) {
            analysis.overall = Math.round((analysis.clarity * 0.35) + (analysis.credibility * 0.35) + (analysis.visibility * 0.30));
        }

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