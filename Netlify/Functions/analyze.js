const Anthropic = require('@anthropic-ai/sdk');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

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

        // Fetch full website content using Puppeteer
        let websiteHTML = '';
        let screenshot = '';

        if (website) {
            try {
                const browser = await puppeteer.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath,
                    headless: chromium.headless,
                });

                const page = await browser.newPage();
                await page.goto(
                    website.startsWith('http') ? website : `https://${website}`,
                    { waitUntil: 'networkidle2', timeout: 60000 }
                );

                // Scroll through page so lazy sections load
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let total = 0;
                        const dist = 400;
                        const timer = setInterval(() => {
                            window.scrollBy(0, dist);
                            total += dist;
                            if (total >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200);
                    });
                });

                // Capture HTML and screenshot
                websiteHTML = await page.content();
                screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });

                await browser.close();
            } catch (err) {
                console.error('Error rendering site:', err);
                websiteHTML = 'Unable to render full website.';
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

        // Fetch LinkedIn profile
        let linkedinData = '';
        if (linkedin) {
            try {
                const linkedinResponse = await fetch(linkedin.startsWith('http') ? linkedin : `https://${linkedin}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const linkedinHTML = await linkedinResponse.text();
                
                const titleMatch = linkedinHTML.match(/<title>([^<]+)<\/title>/);
                
                linkedinData = `LinkedIn Profile:\n`;
                if (titleMatch) {
                    linkedinData += `Title: ${titleMatch[1]}\n`;
                } else {
                    linkedinData += 'Profile exists but limited public data available\n';
                }
            } catch (error) {
                console.error('Error fetching LinkedIn:', error);
                linkedinData = `LinkedIn profile provided: ${linkedin} (unable to fetch profile data)`;
            }
        }

        // Build the prompt
        const websiteInfo = website || 'Not provided';
        const instagramInfo = instagram || 'Not provided';
        const linkedinInfo = linkedin || 'Not provided';
        const htmlSnippet = websiteHTML;

        // DEBUG: Log what we're sending
        console.log('HTML length:', websiteHTML.length);
        console.log('Has case study keyword:', websiteHTML.toLowerCase().includes('case study'));
        console.log('Has client keyword:', websiteHTML.toLowerCase().includes('client'));
        console.log('Has results keyword:', websiteHTML.toLowerCase().includes('results'));
        
        const prompt = `You are a senior brand strategist conducting a $2500 professional online authority audit.

GOAL: Evaluate this person's ability to attract high-value clients who are pre-sold on their expertise.

---

ULTRA-SPECIFIC SCORING RUBRICS:

=== CLARITY SCORING (0-100) ===

90-100 (EXCEPTIONAL):
✓ Hero headline states EXACTLY who you help + specific measurable transformation (under 10 words)
✓ Problem clearly articulated in hero or first section
✓ Solution/process visible within first scroll (3-step framework, timeline, methodology)
✓ Single primary CTA with clear action verb
✓ Identical core message across website, Instagram bio, LinkedIn headline
✓ Zero jargon - written in client's language
✓ Benefit-driven copy throughout (not feature lists)

75-89 (STRONG):
✓ Clear target audience mentioned in hero
✓ Transformation stated but could be more specific/measurable
✓ Process/offer explained within 2 scrolls
✓ 1-2 clear CTAs (not competing)
✓ Consistent messaging across 2+ platforms
✓ Minimal jargon, mostly client-focused language

60-74 (SOLID FOUNDATION):
✓ Target audience mentioned but somewhat broad
✓ Transformation implied but not explicitly stated
✓ Offer explained but requires exploration to understand
✓ 2-3 CTAs present (some competing for attention)
✓ Some messaging inconsistency between website and socials
✓ Mix of jargon and plain language

45-59 (NEEDS REFINEMENT):
✓ Vague audience ("entrepreneurs", "businesses", "people")
✓ Generic transformation language ("grow", "succeed", "thrive")
✓ Unclear what specific service/product is offered
✓ Multiple confusing or unclear CTAs
✓ Inconsistent messaging across platforms

0-44 (REQUIRES ATTENTION):
✗ No clear target audience defined
✗ No transformation or outcome stated
✗ Cannot determine what is being offered
✗ No clear call to action
✗ Completely different messages on different platforms

---

=== CREDIBILITY SCORING (0-100) ===

90-100 (EXCEPTIONAL):
✓ Custom professional design (clearly not a template)
✓ 5+ detailed case studies with client names AND specific metrics (revenue, percentages, concrete outcomes)
✓ 10+ testimonials with full names and professional photos
✓ Client logos from 5+ recognizable companies/brands
✓ Media features, podcast appearances, or speaking engagements displayed
✓ Professional photography throughout (headshots, team photos, event photos)
✓ SSL certificate + custom professional email domain visible
✓ Awards, certifications, or credentials prominently displayed
✓ Premium aesthetic (custom fonts, sophisticated color palette, professional spacing)

75-89 (STRONG):
✓ Professional design (may be premium template but well-customized)
✓ 3-4 case studies with results and metrics
✓ 5-9 testimonials with full names (at least half with photos)
✓ 2-4 client logos or recognizable brand mentions
✓ Professional headshot present
✓ SSL certificate active
✓ Consistent visual branding across pages
✓ At least one authority signal (certification, media mention, speaking)

60-74 (SOLID FOUNDATION):
✓ Decent design with some professional elements
✓ 1-2 client success examples or case studies
✓ 2-4 testimonials with names provided
✓ At least one client logo or proof element
✓ SSL certificate present
✓ Professional photo visible somewhere
✓ Generally consistent branding

45-59 (NEEDS REFINEMENT):
✓ Template design with minimal customization
✓ 0-1 testimonial (generic, no photo)
✓ No case studies or specific client results
✓ Stock photos or low-resolution images
✓ Missing some trust signals (no SSL, generic email, incomplete about page)
✓ Inconsistent visual identity

0-44 (REQUIRES ATTENTION):
✗ DIY website builder look or broken/outdated design
✗ Zero testimonials or proof of any kind
✗ No client results, outcomes, or success stories
✗ Poor quality images or missing images entirely
✗ No SSL certificate
✗ No professional headshot
✗ No trust infrastructure (about page, contact info, policies)

---

=== VISIBILITY SCORING (0-100) ===

90-100 (EXCEPTIONAL):
✓ 10,000+ Instagram followers OR 5,000+ LinkedIn connections
✓ Posting 4-7x per week with consistent schedule
✓ Most recent post within 48 hours
✓ Instagram/LinkedIn bio clearly states value proposition AND links to website
✓ 100+ posts showing consistent content creation
✓ Identical branding (profile pic, colors, messaging) across all platforms
✓ Active engagement visible (responding to comments, tagged by others)
✓ Name search on Google shows them on first page
✓ Content shows thought leadership (educational, insights, frameworks)

75-89 (STRONG):
✓ 3,000-10,000 followers on primary platform
✓ Posting 2-3x per week consistently
✓ Most recent post within 7 days
✓ Profile clearly links to website with some value prop mentioned
✓ 50+ posts demonstrating ongoing content
✓ Mostly consistent branding across platforms
✓ Some visible engagement and interaction
✓ Findable on Google for their name

60-74 (SOLID FOUNDATION):
✓ 1,000-3,000 followers
✓ Posting 1-2x per week (somewhat consistent)
✓ Most recent post within 2 weeks
✓ Social profiles exist, are public, and link to website
✓ 20+ posts showing some commitment
✓ Profile pictures and basic branding present

45-59 (NEEDS REFINEMENT):
✓ 500-1,000 followers
✓ Sporadic posting (2-4 weeks between posts)
✓ Last post 3-6 weeks ago
✓ Profile exists but limited or unclear
✓ Few posts (under 20 total)
✓ Inconsistent or missing branding

0-44 (REQUIRES ATTENTION):
✗ Under 500 followers OR private account
✗ No posts in 2+ months OR under 10 posts total
✗ No website link in bio
✗ Hard to find on social platforms
✗ Not discoverable on Google
✗ No consistent online presence

---

OVERALL SCORE CALCULATION:
Overall = (Clarity × 0.35) + (Credibility × 0.35) + (Visibility × 0.30)

BADGE ASSIGNMENTS:
90-100 = "EXCEPTIONAL"
75-89 = "STRONG"
60-74 = "SOLID FOUNDATION"
45-59 = "NEEDS REFINEMENT"
0-44 = "REQUIRES ATTENTION"

---

NOW ANALYZE THIS WEBSITE:

Website: ${websiteInfo}
Instagram: ${instagramInfo}
LinkedIn: ${linkedinInfo}

Full Website HTML:
${htmlSnippet}

${instagramData ? `Instagram Data:\n${instagramData}` : ''}

${linkedinData ? `LinkedIn Data:\n${linkedinData}` : ''}

---

CRITICAL ANALYSIS RULES:

1. ACTUALLY ANALYZE - Do not use example scores. Calculate real scores based on the rubrics above.

2. FOR CREDIBILITY - SCAN THE ENTIRE HTML:
   - Look for ANY form of client results: "case studies", "testimonials", "results", "clients achieved", "worked with", "success stories"
   - Client names + outcomes/metrics = proof (even if not labeled "case study")
   - Look at the SCREENSHOT to see visual proof elements
   - If you find proof ANYWHERE, acknowledge it - do not suggest adding what already exists

3. FOR VISIBILITY - Use the actual data:
   - Count the follower numbers provided
   - Check post count if available
   - Evaluate bio quality from the data given

4. BE PRECISE - Use the specific checkmarks in each rubric to calculate scores.

5. DO NOT RECOMMEND:
   - Adding testimonials "above the fold" or in hero section
   - Cross-linking that sends traffic away from website
   - Generic advice without evidence (like "post 3x/week" when you can't see posting frequency)

---

Return ONLY valid JSON (no markdown, no code blocks):

{
  "clarity": [your calculated score based on rubric],
  "credibility": [your calculated score based on rubric],
  "visibility": [your calculated score based on rubric],
  "overall": [calculated using the formula],
  "badge": "[badge based on overall score]",
  "interpretation": "[1-2 sentences summarizing overall authority position]",
  "summary": "[2-3 paragraphs: (1) What works well with specific examples from their site. (2) What is missing and the real business cost. (3) Single biggest growth opportunity.]",
  "actions": [
    "[First strategic action addressing highest-impact gap]",
    "[Second action based on your analysis]",
    "[Third conversion-focused action]"
  ]
}

TONE: Strategic consultant. Honest but motivational. Specific with examples. Focus on ROI and client attraction.`;

        // Call Claude API (vision-capable)
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot } }
                    ]
                }
            ]
        });

        // Parse response
        let responseText = message.content[0].text;
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const analysis = JSON.parse(responseText);

        // Return results
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