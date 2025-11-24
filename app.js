// Form handling
document.getElementById('auditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const website = document.getElementById('website').value;
    const instagram = document.getElementById('instagram').value;
    const linkedin = document.getElementById('linkedin').value;
    
    // Hide THE ENTIRE FORM CONTAINER (including the heading!)
    const formContainer = document.querySelector('.bg-gray-800.rounded-lg.shadow-2xl.p-8.border.border-gray-700');
    if (formContainer) {
        formContainer.classList.add('hidden');
    }
    
    // Show loading in its place
    document.getElementById('loading').classList.remove('hidden');
    
    try {
        // Call Netlify Function
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                website,
                instagram,
                linkedin
            })
        });
        
        const data = await response.json();
        
        // Debug: Log what we actually got
        console.log('Received data:', data);
        
        // Hide loading
        document.getElementById('loading').classList.add('hidden');
        
        // Show results
        displayResults(data, name);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').classList.add('hidden');
        alert('Something went wrong. Please try again.');
        // Show form container again on error
        if (formContainer) {
            formContainer.classList.remove('hidden');
        }
    }
});

function getScoreColor(score) {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#3B82F6'; // blue
    if (score >= 40) return '#F59E0B'; // yellow
    return '#EF4444'; // red
}

function getScoreEmoji(score) {
    if (score >= 80) return '🚀';
    if (score >= 60) return '💪';
    if (score >= 40) return '📈';
    return '🌱';
}

function displayResults(data, userName) {
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    // Use whichever field Claude actually returned
    const interpretation = data.interpretation || data.strategicAudit || "Your online presence shows potential for growth.";
    const summary = data.summary || data.designAnalysis || "Analysis complete. Review your scores below.";
    
    // Ensure we have valid numbers
    const overall = Math.round(data.overall || 50);
    const clarity = Math.round(data.clarity || 50);
    const credibility = Math.round(data.credibility || 50);
    const visibility = Math.round(data.visibility || 50);
    
    const scoreColor = getScoreColor(overall);
    const scoreEmoji = getScoreEmoji(overall);
    
    // Create a complete results container with its own proper heading
    resultsContent.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700 max-w-4xl mx-auto">
            <!-- RESULTS HEADER - Not "Start Your Free Audit"! -->
            <div class="text-center mb-8">
                <h2 class="text-4xl font-bold text-white mb-3">
                    🎯 Your Authority Analysis Complete!
                </h2>
                <p class="text-gray-400 text-lg">
                    ${userName ? `Here's your personalized report, ${userName}` : 'Here\'s your personalized authority report'}
                </p>
            </div>
            
            <div class="space-y-8 animate-fadeIn">
                
                <!-- Main Score Card -->
                <div class="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-8 text-center">
                    <div class="mb-4">
                        <span class="text-6xl">${scoreEmoji}</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-300 mb-4">Overall Authority Score</h3>
                    <div class="relative inline-block mb-4">
                        <svg class="transform -rotate-90 w-40 h-40">
                            <circle cx="80" cy="80" r="70" stroke="#374151" stroke-width="12" fill="none" />
                            <circle cx="80" cy="80" r="70" stroke="${scoreColor}" stroke-width="12" fill="none"
                                stroke-dasharray="${overall * 4.4} 440"
                                stroke-linecap="round"
                                class="animate-scoreReveal" />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div>
                                <div class="text-5xl font-bold text-white animate-countUp">${overall}</div>
                                <div class="text-gray-400 text-sm">/100</div>
                            </div>
                        </div>
                    </div>
                    <div class="inline-block px-6 py-2 rounded-full text-white font-bold text-sm shadow-lg"
                         style="background: linear-gradient(135deg, ${scoreColor}, ${scoreColor}CC);">
                        ${data.badge || 'BUILDING MOMENTUM'}
                    </div>
                    <p class="text-gray-300 mt-6 max-w-2xl mx-auto leading-relaxed text-lg">
                        ${interpretation}
                    </p>
                </div>
                
                <!-- Score Breakdown -->
                <div class="space-y-6">
                    <h3 class="text-xl font-bold text-white">Score Breakdown</h3>
                    
                    <!-- Clarity -->
                    <div>
                        <div class="flex justify-between mb-2">
                            <span class="font-semibold text-white">🎯 Clarity</span>
                            <span class="text-gray-400">${clarity}/100</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full transition-all duration-500 animate-widthReveal" 
                                 style="width: ${clarity}%; background-color: ${getScoreColor(clarity)};"></div>
                        </div>
                        <p class="text-sm text-gray-400 mt-1">How clear is your value proposition and messaging</p>
                    </div>
                    
                    <!-- Credibility -->
                    <div>
                        <div class="flex justify-between mb-2">
                            <span class="font-semibold text-white">⭐ Credibility</span>
                            <span class="text-gray-400">${credibility}/100</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full transition-all duration-500 animate-widthReveal"
                                 style="width: ${credibility}%; background-color: ${getScoreColor(credibility)};"></div>
                        </div>
                        <p class="text-sm text-gray-400 mt-1">Trust signals and social proof strength</p>
                    </div>
                    
                    <!-- Visibility -->
                    <div>
                        <div class="flex justify-between mb-2">
                            <span class="font-semibold text-white">👁️ Visibility</span>
                            <span class="text-gray-400">${visibility}/100</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="h-3 rounded-full transition-all duration-500 animate-widthReveal"
                                 style="width: ${visibility}%; background-color: ${getScoreColor(visibility)};"></div>
                        </div>
                        <p class="text-sm text-gray-400 mt-1">Your online discoverability and reach</p>
                    </div>
                </div>
                
                <!-- Strategic Analysis -->
                <div class="bg-gray-700 p-6 rounded-lg border border-gray-600">
                    <h3 class="font-bold text-xl text-white mb-4">💡 Strategic Analysis</h3>
                    <div class="text-gray-300 leading-relaxed space-y-3">
                        ${summary.split('\n').map(paragraph => 
                            paragraph.trim() ? `<p>${paragraph}</p>` : ''
                        ).join('')}
                    </div>
                </div>
                
                <!-- Action Items -->
                <div>
                    <h3 class="font-bold text-xl mb-4 text-white">📋 Recommended Next Steps</h3>
                    <div class="space-y-3">
                        ${(data.actions || ['Improve your website clarity', 'Build more social proof', 'Increase online activity']).map((action, index) => `
                            <div class="flex items-start gap-3 text-gray-300 bg-gray-700/50 p-4 rounded-lg">
                                <span class="text-blue-500 mt-1 font-bold">${index + 1}.</span>
                                <span>${action}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Divider -->
                <div class="border-t border-gray-700 my-8"></div>
                
                <!-- CTA Section -->
                <div class="text-center">
                    <h3 class="text-xl font-bold text-white mb-3">Ready to Boost Your Authority?</h3>
                    <p class="text-gray-400 mb-6">Get expert guidance to attract premium clients who already see you as the authority.</p>
                    <div class="space-x-4">
                        <button onclick="window.open('https://calendly.com/your-link', '_blank')" 
                                class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
                            Get Your Strategy Call →
                        </button>
                        <button onclick="location.reload()" 
                                class="bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                            Run Another Audit
                        </button>
                    </div>
                </div>
                
                <!-- Trust line -->
                <p class="text-sm text-gray-500 text-center mt-6">
                    Join 500+ entrepreneurs who've discovered their authority gaps
                </p>
                
            </div>
        </div>
        
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes scoreReveal {
                from { stroke-dasharray: 0 440; }
            }
            
            @keyframes widthReveal {
                from { width: 0%; }
            }
            
            @keyframes countUp {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .animate-fadeIn {
                animation: fadeIn 0.8s ease-out;
            }
            
            .animate-scoreReveal {
                animation: scoreReveal 1.5s ease-out;
            }
            
            .animate-widthReveal {
                animation: widthReveal 1s ease-out;
            }
            
            .animate-countUp {
                animation: countUp 0.5s ease-out;
            }
        </style>
    `;
    
    resultsDiv.classList.remove('hidden');
    
    // Smooth scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}