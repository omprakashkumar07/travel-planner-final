/* ═══════════════════════════════════════════════
   SUGGEST.JS — AI Destination Finder Logic
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('ai-suggest-form');
  if (form) {
    form.addEventListener('submit', handleSuggestSubmit);
  }
});

async function handleSuggestSubmit(e) {
  e.preventDefault();

  const interestInput = document.getElementById('suggest-interest');
  const budgetInput = document.getElementById('suggest-budget');
  const daysInput = document.getElementById('suggest-days');
  
  const loading = document.getElementById('ai-suggest-loading');
  const resultsContainer = document.getElementById('ai-suggest-results');
  
  if (!interestInput.value || !budgetInput.value) {
    if (typeof showToast === 'function') {
      showToast('Please select an interest and enter your budget.', 'error');
    } else {
      alert('Please select an interest and enter your budget.');
    }
    return;
  }

  // Determine API URL (using relative for now since frontend and backend are served together)
  // If we were hardcoding the Render URL: const API_URL = 'https://travel-planner-final.onrender.com/api/suggest-destinations';
  // Let's use relative path which is safer for dev/prod if served together
  const API_URL = '/api/suggest-destinations';

  const requestData = {
    interest: interestInput.value,
    budget: parseInt(budgetInput.value),
    days: daysInput.value ? parseInt(daysInput.value) : null
  };

  // Show loading
  resultsContainer.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const suggestions = await response.json();
    
    // Hide loading
    loading.classList.add('hidden');
    
    // Render results
    renderSuggestions(suggestions);
    
    // Scroll to results
    setTimeout(() => {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

  } catch (error) {
    console.error('Suggest Error:', error);
    loading.classList.add('hidden');
    if (typeof showToast === 'function') {
      showToast(error.message || 'Failed to find destinations. Please try again.', 'error');
    } else {
      alert(error.message || 'Failed to find destinations. Please try again.');
    }
  }
}

function renderSuggestions(suggestions) {
  const container = document.getElementById('ai-suggest-results');
  container.innerHTML = '';

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No suggestions found. Please try a different query.</p>';
    return;
  }

  suggestions.forEach((dest, index) => {
    const delay = index * 0.1; // Staggered animation delay

    const card = document.createElement('div');
    card.className = 'ai-result-card';
    card.style.animationDelay = `${delay}s`;
    
    card.innerHTML = `
      <h3>${dest.name || 'Unknown Destination'}</h3>
      <div class="result-cost">💰 ${dest.cost || 'Varies'}</div>
      <p class="result-desc">${dest.description || 'A great place to visit.'}</p>
      <div class="result-reason">✨ ${dest.reason || 'Matches your preferences perfectly.'}</div>
    `;
    
    container.appendChild(card);
  });
}
