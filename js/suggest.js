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

  // Determine API URL (using centralized config if available)
  const API_URL = (window.API_BASE_URL || '') + '/api/suggest-destinations';

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
    
    // Set initial structure with loading image
    card.innerHTML = `
      <div class="result-img-container loading-img"></div>
      <div class="ai-result-card-body">
        <h3>${dest.name || 'Unknown Destination'}</h3>
        <div class="result-cost">💰 ${dest.cost || 'Varies'}</div>
        <p class="result-desc">${dest.description || 'A great place to visit.'}</p>
        <div class="result-reason">✨ ${dest.reason || 'Matches your preferences perfectly.'}</div>
      </div>
    `;
    
    container.appendChild(card);

    // Fetch image asynchronously from Wikipedia API
    const cleanName = (dest.name || '').split(/[\/,]/)[0].replace(/\s*\(.*\)\s*/, '').trim();
    let imageUrl = '../images/hero-bg.png'; // Fallback image
    
    if (cleanName) {
      fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanName)}&prop=pageimages&format=json&pithumbsize=600&origin=*`)
        .then(res => res.json())
        .then(data => {
          const pages = data.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pageId !== '-1' && pages[pageId].thumbnail?.source) {
              imageUrl = pages[pageId].thumbnail.source;
            }
          }
          updateCardImage(card, imageUrl, dest.name);
        })
        .catch(err => {
          console.error('Failed to fetch image for', cleanName, err);
          updateCardImage(card, imageUrl, dest.name);
        });
    } else {
      updateCardImage(card, imageUrl, dest.name);
    }
  });
}

function updateCardImage(card, url, altText) {
  const imgContainer = card.querySelector('.result-img-container');
  if (imgContainer) {
    imgContainer.classList.remove('loading-img');
    imgContainer.innerHTML = `<img src="${url}" alt="${altText}" class="result-img" loading="lazy">`;
  }
}
