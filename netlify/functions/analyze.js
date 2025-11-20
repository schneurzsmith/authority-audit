const Anthropic = require('@anthropic-ai/sdk');
const chromium = require('chrome-aws-lambda');
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
        const htmlSnippet = websiteHTML.substring;
        
        const prompt = `You are a senior brand strategist conducting a $2500 professional online authority audit.

GOAL: Help the user generate more high-value clients who are pre-sold through stronger clarity, credibility, and visibility.

CLARITY - Can a potential client instantly understand you are the solution to their problem?
Key Checks: Clear messaging showing VALUE not just services, outcome-focused language, logical site structure, simple CTAs.

CREDIBILITY - Do you LOOK like someone charging premium prices?
Key Checks: Professional design, high-res images, testimonials, client results, case studies, client logos, SSL certificate, premium feel.

VISIBILITY - How easily can ideal clients find and recognize you?
Key Checks: Name clearly on website, social presence, follower count, recent content, profile links funnel to website.

MATERIALS PROVIDED:
Website: ${websiteInfo}
Instagram: ${instagramInfo}
LinkedIn: ${linkedinInfo}

Website HTML:
${htmlSnippet}

${instagramData ? `Instagram Data:\n${instagramData}` : ''}

${linkedinData ? `LinkedIn Data:\n${linkedinData}` : ''}

SCORING (0-100 each):
CLARITY: 85-100 crystal clear, 70-84 clear but could be more specific, 55-69 somewhat vague, 40-54 unclear, 0-39 confusing
CREDIBILITY: 85-100 premium brand, 70-84 professional with some proof, 55-69 decent but inconsistent, 40-54 amateur, 0-39 no credibility
VISIBILITY: 85-100 active and findable, 70-84 present and somewhat active, 55-69 inconsistent, 40-54 minimal, 0-39 hard to find

OVERALL = (Clarity × 0.35) + (Credibility × 0.35) + (Visibility × 0.30)

BADGES: 85-100 EXCEPTIONAL, 70-84 STRONG, 55-69 SOLID FOUNDATION, 40-54 NEEDS REFINEMENT, 0-39 REQUIRES ATTENTION

CRITICAL - DO NOT RECOMMEND:
- Adding testimonials above the fold or in hero section
- Cluttering hero before explaining offer
- Cross-linking that sends traffic away from website
- Generic advice like post 3x per week without checking current activity

DETECTION RULES:
- Be conservative about suggesting things that might already exist
- Look for proof keywords: results, case study, client, testimonial, worked with
- If Instagram shows high followers, do not suggest building audience

Return ONLY this JSON (no markdown, no code blocks):

{
  "clarity": 78,
  "credibility": 72,
  "visibility": 45,
  "overall": 67,
  "badge": "SOLID FOUNDATION",
  "interpretation": "Brief 1-2 sentence summary of overall authority position",
  "summary": "2-3 paragraphs: What works well with specifics. What is missing and the business cost. Biggest growth opportunity.",
  "actions": [
    "First strategic action addressing a real gap",
    "Second high-impact action",
    "Third conversion-focused action"
  ]
}

TONE: Strategic consultant quality. Honest but motivational. Specific not generic. Focus on ROI and client attraction.`;

        // Call Claude API (now supports image + text)
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022', // vision-capable
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