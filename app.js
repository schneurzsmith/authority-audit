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
        
        // Hide loading
        document.getElementById('loading').classList.add('hidden');
        
        // Show results
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').classList.add('hidden');
        alert('Something went wrong. Please try again.');
        document.getElementById('auditForm').classList.remove('hidden');
    }
});

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    resultsContent.innerHTML = `
        <div class="space-y-8 py-8">
            
            <!-- Main Score -->
            <div class="text-center">
                <h2 class="text-2xl font-bold text-white mb-4">Your Authority Score</h2>
                <div class="text-7xl font-bold text-white mb-2">${data.overall}<span class="text-4xl text-gray-400">/100</span></div>
                <div class="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-full text-sm mb-3">
                    ${data.badge}
                </div>
                <p class="text-gray-400 max-w-lg mx-auto">${data.interpretation}</p>
            </div>
            
            <!-- Divider -->
            <div class="border-t border-gray-700 my-8"></div>
            
            <!-- Three Scores -->
            <div class="space-y-6">
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold text-white">Clarity</span>
                        <span class="text-gray-400">${data.clarity}/100</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${data.clarity}%"></div>
                    </div>
                </div>
                
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold text-white">Credibility</span>
                        <span class="text-gray-400">${data.credibility}/100</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${data.credibility}%"></div>
                    </div>
                </div>
                
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold text-white">Visibility</span>
                        <span class="text-gray-400">${data.visibility}/100</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${data.visibility}%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Summary -->
            <div class="bg-gray-700 p-6 rounded-lg border border-gray-600">
                <p class="text-gray-300 leading-relaxed">${data.summary}</p>
            </div>
            
            <!-- Recommended Next Steps -->
            <div>
                <h3 class="font-bold text-xl mb-4 text-white">Recommended Next Steps</h3>
                <div class="space-y-3">
                    ${data.actions.map(action => `
                        <div class="flex items-start gap-3 text-gray-300">
                            <span class="text-blue-500 mt-1">□</span>
                            <span>${action}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Divider -->
            <div class="border-t border-gray-700 my-8"></div>
            
            <!-- CTA Section -->
            <div class="text-center">
                <h3 class="text-xl font-bold text-white mb-3">Want to boost your clarity, credibility, visibility?</h3>
                <p class="text-gray-400 mb-6">So you can attract high-value clients who get pre-sold<br>and already see you as the authority.</p>
                <button onclick="location.reload()" class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
                    Get a Guided Game Plan →
                </button>
            </div>
            
            <!-- Bottom trust line -->
            <p class="text-sm text-gray-500 text-center mt-6">
                Join 500+ entrepreneurs who've discovered their authority gaps.
            </p>
            
        </div>
    `;
    
    resultsDiv.classList.remove('hidden');
}