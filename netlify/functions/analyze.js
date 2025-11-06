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
        const prompt = `You are a senior brand strategist and conversion consultant with an IQ of 200 conducting a $2,500 professional online authority audit. 

The goal is for the user to see how they can generate more high value clients who are pre-sold on their offers.

They can do that by having:

**CLARITY** — A potential client who visits the site instantly can tell that this is the person that can solve their problem. The measure of clarity is content on website and social media - is the messaging clearly showing the value that this service provides? Not just positioning you as a service provider, but really a solution provider.

CLARITY Key Checks:
1. Message Definition
   - Clear who you help and what you help them with
   - Clear transformation/result stated in first section
   - Talking to a direct target audience
   - Problem being solved clearly stated
   - Benefit-driven language over feature listing
   - Consistent message between website + socials
   - Clear differentiation from competitors

2. Offer Understanding
   - Clear description of main offer/service
   - Make it super easy and clear to get started
   - Step-by-step process or framework visible
   - As simple and clear as possible
   - Offer framed as a solution, not a service

3. Navigation & Flow
   - Logical site structure
   - No excessive menu items or hidden info
   - Hero section explains business purpose within 5 seconds
   - Minimal jargon or industry buzzwords

4. Visual/Copy Alignment
   - Imagery matches target audience and tone
   - Design layout supports key messages
   - Headings communicate transformation
   - Section order tells a coherent story
   - Fonts readable and consistent

5. Social Content Alignment
   - Bio clearly states what you do
   - Consistent tone and messaging across platforms
   - Profile links lead to the right next step

6. Perceived Simplicity
   - Few clicks needed to understand core offer
   - No walls of text or clutter
   - Visual hierarchy highlights what matters
   - CTAs use intuitive wording

**CREDIBILITY** — Is the design professional? Do they have professional headshots? We're seeing if you LOOK like a person who is charging thousands of dollars a month, instead of looking like you are the cheapest option.

CREDIBILITY Key Checks:
1. Visual Professionalism
   - High-resolution images
   - Consistent color palette and typography
   - Balanced white space
   - Proper logo placement and scaling
   - Modern layout structure
   - Professional headshots or branded portraits
   - Cohesive iconography
   - Mobile responsiveness
   - Consistent design across all pages

2. Brand Consistency
   - Matching visuals and messaging across website and social media
   - Repetition of brand colors/logos across platforms
   - Cohesive tone of voice
   - Matching domain and social handles
   - Same professional profile picture or branding

3. Authority Signals
   - Testimonials present (names, photos, results)
   - Case studies or portfolio examples
   - Client or partner logos
   - Awards, certifications, credentials
   - Media features or mentions
   - Data-driven results
   - Social proof (followers, engagement)

4. Trust Infrastructure
   - SSL certificate (HTTPS)
   - Clear contact info and professional email domain
   - About section with human touch
   - Privacy policy/terms
   - Professional bio

5. Presentation Quality
   - Strong visual hierarchy
   - High-quality photos
   - Grammar and spelling accuracy
   - Consistent formatting
   - Confident, expertise-driven language
   - Premium feel not cheap
   - Smooth page load

6. Engagement Cues
   - Meaningful social engagement
   - Thought-leadership content
   - Testimonials or DMs shared
   - LinkedIn recommendations

**VISIBILITY** — Measures how easily potential clients can find and recognize you online. Evaluates whether your name or business shows up when searched, how consistently you appear across platforms, and how active your digital footprint is.

VISIBILITY Key Checks:
1. Search Presence
   - Name of business AND/OR name clearly on website
   - Google Business Profile
   - Mentioned on external sites, podcasts, directories

2. Social Media Footprint
   - Active accounts on major platforms
   - Consistent posting frequency
   - Good engagement rate
   - Consistent profile images and bios
   - Pinned/highlighted posts explaining offer
   - Tagged by other users
   - Shared by clients/partners
   - Appears in relevant hashtags
   - SEO-friendly captions
   - Consistent brand handle

3. Content Activity
   - Regular content creation
   - Recent content (within 60 days)
   - Multi-format visibility
   - Educational/authority content
   - Keywords in headlines
   - Backlinking between platforms
   - Newsletter or lead magnet linked

4. Brand Cohesion Online
   - Same name/branding across platforms
   - Consistent tagline and visual identity
   - Links between website and socials
   - No outdated profiles
   - Uniform tone
   - Personal branding visible
   - Visibility in searches
   - Collaborations with other creators

---

MATERIALS PROVIDED:
Website: ${website || 'Not provided'}
Instagram: ${instagram || 'Not provided'}
LinkedIn: ${linkedin || 'Not provided'}

Website HTML (first 5000 chars):
${websiteHTML.substring(0, 5000)}

${instagramData ? `Instagram Profile Data:\n${instagramData}` : ''}

${linkedinData ? `LinkedIn Profile Data:\n${linkedinData}` : ''}

---

SCORING FRAMEWORK:

1. CLARITY (0-100)
Score high (80+): Crystal clear value prop, specific language, outcome-focused
Score medium (60-79): Somewhat clear but vague or feature-focused
Score low (<60): Confusing, generic, or missing positioning

2. CREDIBILITY (0-100)
Score high (80+): Looks like premium brand, multiple proof types, polished design
Score medium (60-79): Decent design but missing social proof or inconsistent
Score low (<60): Poor design, no proof, looks amateur

3. VISIBILITY (0-100)
Score high (80+): Active on platforms, public profiles, consistent branding, findable
Score medium (60-79): Present but inactive, inconsistent, or private profiles
Score low (<60): Missing profiles, private accounts, no activity, conflicting names

OVERALL = (Clarity × 0.35) + (Credibility × 0.35) + (Visibility × 0.30)

BADGES:
90-100: "EXCEPTIONAL"
75-89: "STRONG"
60-74: "SOLID FOUNDATION"
45-59: "NEEDS REFINEMENT"
0-44: "REQUIRES ATTENTION"

---

OUTPUT: Return ONLY valid JSON. No markdown, no extra text.

{
  "clarity": 75,
  "credibility": 68,
  "visibility": 82,
  "overall": 75,
  "badge": "STRONG",
  "strategicAudit": "2-3 paragraphs of real strategic analysis. Paragraph 1: What's working well and why (be specific—mention actual elements you see). Paragraph 2: What's missing or weak and the real cost of that gap (lost clients, unclear positioning, trust issues). Paragraph 3: The single biggest opportunity for growth based on the gaps you identified.",
  "designAnalysis": "1-2 paragraphs analyzing the visual and emotional quality. Does the design feel premium or DIY? Is typography readable and hierarchy clear? Do colors evoke the right emotion for their market? Does the layout guide the eye naturally? Does the overall aesthetic match the sophistication of their offer? Be honest but constructive.",
  "actions": [
    "Strategic action #1 with specifics (not 'post more on social')",
    "Strategic action #2 that addresses a real gap you found",
    "Strategic action #3 that's high-impact, not busywork"
  ]
}

RULES FOR RECOMMENDATIONS:
DO: Give specific, high-leverage actions based on actual gaps. Focus on conversion and authority-building. Be strategic (homepage messaging, proof placement, design upgrades).
DON'T: Tell them to "make profiles public" if they already are. Suggest "posting 3x/week" without checking current activity. Recommend "cross-linking platforms" if it breaks conversion flow. Give tactical busywork.

TONE: Strategic and consultative (like a $2,500 brand audit). Honest but motivational. Specific, not generic. Focus on ROI and client attraction, not vanity metrics.`;

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