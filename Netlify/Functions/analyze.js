const Anthropic = require('@anthropic-ai/sdk');

// Optional Puppeteer imports - wrapped in try/catch
let chromium, puppeteer;
let PUPPETEER_AVAILABLE = false;

try {
    chromium = require('@sparticuz/chromium');
    puppeteer = require('puppeteer-core');
    PUPPETEER_AVAILABLE = true;
    console.log('Puppeteer modules loaded successfully');
} catch (err) {
    console.log('Puppeteer modules not available, using basic fetch only');
}

exports.handler = async (event) => {
    console.log('Function started at:', new Date().toISOString());
    const startTime = Date.now();
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { name, website, instagram, linkedin } = JSON.parse(event.body);
        console.log('Input received for:', name);

        // Check if API key exists
        if (!process.env.CLAUDE_API_KEY) {
            throw new Error('CLAUDE_API_KEY not configured in environment variables');
        }

        // Initialize Claude
        const anthropic = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });

        // Fetch website content
        let websiteHTML = '';
        let screenshot = null;
        
        if (website) {
            const websiteUrl = website.startsWith('http') ? website : `https://${website}`;
            console.log(`Fetching website: ${websiteUrl}`);
            
            // Try Puppeteer first if available and we have time
            if (PUPPETEER_AVAILABLE && (Date.now() - startTime) < 5000) {
                try {
                    console.log('Attempting Puppeteer fetch...');
                    const browser = await puppeteer.launch({
                        args: [...chromium.args, '--no-sandbox'],
                        defaultViewport: chromium.defaultViewport,
                        executablePath: await chromium.executablePath(),
                        headless: chromium.headless,
                    });
                    
                    const page = await browser.newPage();
                    
                    // Set shorter timeout for Netlify
                    await page.goto(websiteUrl, { 
                        waitUntil: 'domcontentloaded', 
                        timeout: 5000 
                    });
                    
                    // Quick scroll (don't wait too long)
                    await page.evaluate(() => {
                        window.scrollTo(0, document.body.scrollHeight);
                    });
                    
                    // Wait a bit for lazy loading
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    websiteHTML = await page.content();
                    
                    // Only take screenshot if we have time
                    if ((Date.now() - startTime) < 7000) {
                        screenshot = await page.screenshot({ 
                            encoding: 'base64',
                            fullPage: false, // Just viewport to save time
                            quality: 70 // Lower quality to reduce size
                        });
                    }
                    
                    await browser.close();
                    console.log('Puppeteer fetch successful');
                } catch (puppeteerError) {
                    console.error('Puppeteer failed, falling back to fetch:', puppeteerError.message);
                }
            }
            
            // Fallback to simple fetch if Puppeteer failed or unavailable
            if (!websiteHTML) {
                try {
                    const response = await fetch(websiteUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; AuthorityAuditBot/1.0)'
                        },
                        signal: AbortSignal.timeout(3000) // 3 second timeout
                    });
                    
                    if (response.ok) {
                        websiteHTML = await response.text();
                        console.log('Basic fetch successful');
                    } else {
                        websiteHTML = `<!-- Website returned ${response.status} -->\n`;
                    }
                } catch (fetchError) {
                    console.error('Basic fetch also failed:', fetchError.message);
                    websiteHTML = `<!-- Unable to fetch website: ${fetchError.message} -->\n`;
                }
            }
        }

        // Extract key information from HTML
        let extractedInfo = {
            title: '',
            description: '',
            hasTestimonials: false,
            hasCaseStudies: false,
            hasAboutSection: false,
            hasContactInfo: false,
            wordCount: 0
        };

        if (websiteHTML) {
            const titleMatch = websiteHTML.match(/<title>([^<]+)<\/title>/i);
            const descMatch = websiteHTML.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
            
            extractedInfo = {
                title: titleMatch ? titleMatch[1] : '',
                description: descMatch ? descMatch[1] : '',
                hasTestimonials: /testimonial|review|feedback|"what.*say"/i.test(websiteHTML),
                hasCaseStudies: /case\s+stud|portfolio|work\s+with|success\s+stor|client.*result/i.test(websiteHTML),
                hasAboutSection: /<(?:section|div)[^>]*(?:id|class)=["'][^"']*about[^"']*["']/i.test(websiteHTML),
                hasContactInfo: /contact|email|phone|get\s+in\s+touch/i.test(websiteHTML),
                wordCount: websiteHTML.replace(/<[^>]*>/g, '').split(/\s+/).length
            };
        }

        console.log('Extracted info:', extractedInfo);

        // Build Claude prompt
        const prompt = `You are a professional brand strategist conducting an online authority audit.

CONTEXT:
- Client Name: ${name}
- Website: ${website || 'Not provided'}
- Instagram: ${instagram || 'Not provided'}  
- LinkedIn: ${linkedin || 'Not provided'}

WEBSITE ANALYSIS:
- Title: ${extractedInfo.title || 'Not found'}
- Description: ${extractedInfo.description || 'Not found'}
- Has Testimonials: ${extractedInfo.hasTestimonials}
- Has Case Studies: ${extractedInfo.hasCaseStudies}
- Has About Section: ${extractedInfo.hasAboutSection}
- Has Contact Info: ${extractedInfo.hasContactInfo}
- Content Volume: ${extractedInfo.wordCount} words

${websiteHTML.length > 0 ? `Website HTML Preview (first 5000 chars):\n${websiteHTML.substring(0, 5000)}` : 'No website content available'}

Please analyze their online authority and provide scores:

CLARITY (0-100): How clear is their value proposition, target audience, and offering?
- 80-100: Crystal clear who they help and how
- 60-79: Generally clear but could be more specific
- 40-59: Somewhat vague or generic
- 0-39: Unclear or missing

CREDIBILITY (0-100): What trust signals and social proof exist?
- 80-100: Strong testimonials, case studies, professional design
- 60-79: Some proof elements present
- 40-59: Limited credibility signals
- 0-39: No visible trust factors

VISIBILITY (0-100): How discoverable and active are they online?
- 80-100: Active on multiple platforms with consistent presence
- 60-79: Present on some platforms
- 40-59: Limited online presence
- 0-39: Hard to find online

Calculate overall: (Clarity × 0.35) + (Credibility × 0.35) + (Visibility × 0.30)

Return ONLY valid JSON:
{
  "clarity": [number],
  "credibility": [number],
  "visibility": [number],
  "overall": [number],
  "badge": "[AUTHORITY LEADER|RISING AUTHORITY|BUILDING MOMENTUM|EMERGING PRESENCE|GETTING STARTED]",
  "interpretation": "[1-2 sentences about their current authority position]",
  "summary": "[2-3 paragraphs analyzing what's working, what's missing, and the biggest opportunity]",
  "actions": [
    "[Specific action to improve clarity]",
    "[Specific action to build credibility]",
    "[Specific action to increase visibility]"
  ]
}`;

        console.log('Calling Claude API...');
        
        // Check remaining time before Claude call
        const timeRemaining = 10000 - (Date.now() - startTime);
        if (timeRemaining < 2000) {
            throw new Error('Function running out of time, aborting Claude call');
        }

        // Call Claude with appropriate model
        const messages = [{
            role: 'user',
            content: screenshot && screenshot.length < 500000 ? [
                { type: 'text', text: prompt },
                { type: 'image', source: { 
                    type: 'base64', 
                    media_type: 'image/png', 
                    data: screenshot 
                }}
            ] : prompt
        }];

        const message = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307', // Using Haiku for speed
            max_tokens: 1500,
            temperature: 0.7,
            messages: messages
        });

        console.log('Claude response received');

        // Parse response
        let responseText = message.content[0].text;
        responseText = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^[^{]*{/, '{')  // Remove any text before first {
            .replace(/}[^}]*$/, '}')  // Remove any text after last }
            .trim();
        
        const analysis = JSON.parse(responseText);
        
        // Ensure all required fields exist
        analysis.clarity = Number(analysis.clarity) || 50;
        analysis.credibility = Number(analysis.credibility) || 50;
        analysis.visibility = Number(analysis.visibility) || 50;
        analysis.overall = Math.round((analysis.clarity * 0.35) + (analysis.credibility * 0.35) + (analysis.visibility * 0.30));
        
        if (!analysis.badge) {
            if (analysis.overall >= 90) analysis.badge = "AUTHORITY LEADER";
            else if (analysis.overall >= 75) analysis.badge = "RISING AUTHORITY";
            else if (analysis.overall >= 60) analysis.badge = "BUILDING MOMENTUM";
            else if (analysis.overall >= 45) analysis.badge = "EMERGING PRESENCE";
            else analysis.badge = "GETTING STARTED";
        }

        analysis.actions = analysis.actions || [
            "Define your target audience more clearly",
            "Add testimonials or case studies",
            "Increase your social media activity"
        ];

        console.log(`Function completed in ${Date.now() - startTime}ms`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(analysis)
        };

    } catch (error) {
        console.error('Function error:', error);
        
        // Return a meaningful error response
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Analysis failed', 
                details: error.message,
                tip: error.message.includes('API') ? 
                     'Check that CLAUDE_API_KEY is set in Netlify environment variables' : 
                     'The analysis service encountered an error. Please try again.'
            })
        };
    }
};