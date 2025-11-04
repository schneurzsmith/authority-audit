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
        <div class="space-y-6">
            <!-- Overall Score -->
            <div class="text-center p-6 bg-blue-50 rounded-lg">
                <div class="text-6xl font-bold text-gray-900 mb-2">${data.overall}/100</div>
                <div class="text-xl font-semibold text-blue-600 mb-2">${data.badge}</div>
                <p class="text-gray-600">${data.interpretation}</p>
            </div>
            
            <!-- Three Scores -->
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold">Clarity</span>
                        <span>${data.clarity}/100</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-blue-600 h-3 rounded-full" style="width: ${data.clarity}%"></div>
                    </div>
                </div>
                
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold">Credibility</span>
                        <span>${data.credibility}/100</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-blue-600 h-3 rounded-full" style="width: ${data.credibility}%"></div>
                    </div>
                </div>
                
                <div>
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold">Visibility</span>
                        <span>${data.visibility}/100</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-blue-600 h-3 rounded-full" style="width: ${data.visibility}%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Summary -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-gray-700">${data.summary}</p>
            </div>
            
            <!-- Actions -->
            <div>
                <h3 class="font-bold text-lg mb-3">🎯 Your Top Actions:</h3>
                <ol class="list-decimal list-inside space-y-2 text-gray-700">
                    ${data.actions.map(action => `<li>${action}</li>`).join('')}
                </ol>
            </div>
            
            <!-- CTA -->
            <div class="text-center pt-6">
                <button onclick="location.reload()" class="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition">
                    Analyze Another Website
                </button>
            </div>
        </div>
    `;
    
    resultsDiv.classList.remove('hidden');
}