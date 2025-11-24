// Form handling
document.getElementById('auditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const website = document.getElementById('website').value;
    const instagram = document.getElementById('instagram').value;
    const linkedin = document.getElementById('linkedin').value;
    
    // Show loading, hide form
    document.getElementById('auditForm').classList.add('hidden');
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
        document.getElementById('auditForm').classList.remove('hidden');
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
    
    resultsContent.innerHTML = `
        <div class="space-y-8 py-8 animate-fadeIn">
            
            <!-- Personalized Header -->
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold text-white mb-2">
                    ${userName ? `${userName}'s Authority Report` : 'Your Authority Report'}
                </h2>
                <p class="text-gray-400">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <!-- Main Score Card -->
            <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 text-center shadow-2xl border border-gray-700">
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
                <div class="inline-block px-6 py-2 rounded-full text-white font-bold text-sm shadow-lg animate-pulse"
                     style="background: linear-gradient(135deg, ${scoreColor}, ${scoreColor}CC);">
                    ${data.badge || 'BUILDING MOMENTUM'}
                </div>
                <p class="text-gray-300 mt-6 max-w-2xl mx-auto leading-relaxed text-lg">
                    ${interpretation}
                </p>
            </div>
            
            <!-- Score Breakdown Grid -->
            <div class="grid md:grid-cols-3 gap-6">
                <!-- Clarity -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h4 class="font-bold text-white text-lg">Clarity</h4>
                            <p class="text-gray-400 text-sm mt-1">Message & positioning</p>
                        </div>
                        <span class="text-3xl">🎯</span>
                    </div>
                    <div class="relative pt-1">
                        <div class="flex mb-2 items-center justify-between">
                            <div class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white" 
                                 style="background-color: ${getScoreColor(clarity)};">
                                ${clarity >= 80 ? 'Excellent' : clarity >= 60 ? 'Good' : clarity >= 40 ? 'Fair' : 'Needs Work'}
                            </div>
                            <div class="text-right">
                                <span class="text-xl font-bold text-white">${clarity}</span>
                                <span class="text-gray-400">/100</span>
                            </div>
                        </div>
                        <div class="overflow-hidden h-3 text-xs flex rounded-full bg-gray-700">
                            <div style="width:${clarity}%; background-color: ${getScoreColor(clarity)};" 
                                 class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center animate-widthReveal"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Credibility -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h4 class="font-bold text-white text-lg">Credibility</h4>
                            <p class="text-gray-400 text-sm mt-1">Trust & social proof</p>
                        </div>
                        <span class="text-3xl">⭐</span>
                    </div>
                    <div class="relative pt-1">
                        <div class="flex mb-2 items-center justify-between">
                            <div class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white"
                                 style="background-color: ${getScoreColor(credibility)};">
                                ${credibility >= 80 ? 'Excellent' : credibility >= 60 ? 'Good' : credibility >= 40 ? 'Fair' : 'Needs Work'}
                            </div>
                            <div class="text-right">
                                <span class="text-xl font-bold text-white">${credibility}</span>
                                <span class="text-gray-400">/100</span>
                            </div>
                        </div>
                        <div class="overflow-hidden h-3 text-xs flex rounded-full bg-gray-700">
                            <div style="width:${credibility}%; background-color: ${getScoreColor(credibility)};"
                                 class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center animate-widthReveal"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Visibility -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all duration-300">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h4 class="font-bold text-white text-lg">Visibility</h4>
                            <p class="text-gray-400 text-sm mt-1">Online discoverability</p>
                        </div>
                        <span class="text-3xl">👁️</span>
                    </div>
                    <div class="relative pt-1">
                        <div class="flex mb-2 items-center justify-between">
                            <div class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white"
                                 style="background-color: ${getScoreColor(visibility)};">
                                ${visibility >= 80 ? 'Excellent' : visibility >= 60 ? 'Good' : visibility >= 40 ? 'Fair' : 'Needs Work'}
                            </div>
                            <div class="text-right">
                                <span class="text-xl font-bold text-white">${visibility}</span>
                                <span class="text-gray-400">/100</span>
                            </div>
                        </div>
                        <div class="overflow-hidden h-3 text-xs flex rounded-full bg-gray-700">
                            <div style="width:${visibility}%; background-color: ${getScoreColor(visibility)};"
                                 class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center animate-widthReveal"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Strategic Analysis -->
            <div class="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-8 rounded-xl border border-blue-500/30 backdrop-blur">
                <div class="flex items-center gap-3 mb-6">
                    <span class="text-3xl">💡</span>
                    <h3 class="font-bold text-2xl text-white">Strategic Analysis</h3>
                </div>
                <div class="text-gray-200 leading-relaxed space-y-4 text-lg">
                    ${summary.split('\n').map(paragraph => 
                        paragraph.trim() ? `<p>${paragraph}</p>` : ''
                    ).join('')}
                </div>
            </div>
            
            <!-- Action Items -->
            <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
                <div class="flex items-center gap-3 mb-6">
                    <span class="text-3xl">🎯</span>
                    <h3 class="font-bold text-2xl text-white">Your Action Plan</h3>
                </div>
                <div class="space-y-4">
                    ${(data.actions || ['Improve your website clarity', 'Build more social proof', 'Increase online activity']).map((action, index) => `
                        <div class="flex gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 group">
                            <div class="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                                ${index + 1}
                            </div>
                            <div class="flex-grow">
                                <p class="text-gray-200 text-lg">${action}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- CTA Section -->
            <div class="text-center py-12 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-gray-700">
                <h3 class="text-3xl font-bold text-white mb-4">
                    Ready to Level Up Your Authority?
                </h3>
                <p class="text-gray-300 mb-8 text-lg max-w-2xl mx-auto">
                    Join 500+ entrepreneurs who've transformed their online presence 
                    and started attracting premium clients on autopilot.
                </p>
                <div class="space-y-4">
                    <button onclick="window.location.href='https://calendly.com/your-link'" 
                            class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105">
                        Get Your Free Strategy Session →
                    </button>
                    <div>
                        <button onclick="location.reload()" 
                                class="text-gray-400 hover:text-white transition font-medium">
                            Run Another Analysis
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Social Proof -->
            <div class="text-center pt-8 border-t border-gray-700">
                <p class="text-gray-400 mb-4">Trusted by industry leaders</p>
                <div class="flex justify-center gap-8 opacity-50">
                    <span class="text-gray-500">⭐⭐⭐⭐⭐</span>
                    <span class="text-gray-500">500+ Audits Completed</span>
                    <span class="text-gray-500">4.9/5 Rating</span>
                </div>
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