// Cache DOM elements
const extensionToggle = document.getElementById('extension-toggle');
const indicatorToggle = document.getElementById('indicator-toggle');
const applyBtn = document.getElementById('apply-btn');
const resetBtn = document.getElementById('reset-btn');
const apiKeyInput = document.getElementById('api-key');
const apiProviders = document.querySelectorAll('input[name="api-provider"]');
const classificationMethods = document.querySelectorAll('input[name="classification-method"]');
const apiSection = document.querySelector('.api-section');

// Topic checkboxes - creating a mapping for easier access
const topicCheckboxes = {};
const topicIds = [
  'technology', 'ai-ml', 'science', 'business', 'startups', 
  'crypto', 'politics', 'world-news', 'health', 'education', 
  'art-design', 'gaming', 'food', 'travel', 'entertainment'
];

// Populate the topicCheckboxes object
topicIds.forEach(id => {
  topicCheckboxes[id] = document.getElementById(`topic-${id}`);
});

// Default settings
const defaultSettings = {
  enabled: true,
  showIndicators: true,
  classificationMethod: 'keywords',
  apiProvider: 'openai',
  apiKey: '',
  topics: {
    'technology': true,
    'ai-ml': true,
    'science': true,
    'business': true,
    'startups': true,
    'crypto': true,
    'politics': true,
    'world-news': true,
    'health': true,
    'education': true,
    'art-design': true,
    'gaming': true,
    'food': true,
    'travel': true,
    'entertainment': false
  }
};

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get(['feedSettings'], function(result) {
    const settings = result.feedSettings || defaultSettings;
    
    // Apply settings to UI
    extensionToggle.checked = settings.enabled;
    indicatorToggle.checked = settings.showIndicators !== undefined ? settings.showIndicators : true;
    apiKeyInput.value = settings.apiKey || '';
    
    // Set classification method radio
    const classMethod = settings.classificationMethod || 'keywords';
    document.querySelector(`input[name="classification-method"][value="${classMethod}"]`).checked = true;
    
    // Show/hide API section based on classification method
    apiSection.style.display = classMethod === 'api' ? 'block' : 'none';
    
    // Set API provider radio
    document.querySelector(`input[name="api-provider"][value="${settings.apiProvider}"]`).checked = true;
    
    // Set topic checkboxes
    for (const [topicId, checkbox] of Object.entries(topicCheckboxes)) {
      checkbox.checked = settings.topics[topicId];
    }
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    enabled: extensionToggle.checked,
    showIndicators: indicatorToggle.checked,
    classificationMethod: document.querySelector('input[name="classification-method"]:checked').value,
    apiProvider: document.querySelector('input[name="api-provider"]:checked').value,
    apiKey: apiKeyInput.value,
    topics: {}
  };
  
  // Get topic preferences
  for (const [topicId, checkbox] of Object.entries(topicCheckboxes)) {
    settings.topics[topicId] = checkbox.checked;
  }
  
  // Save to storage
  chrome.storage.local.set({feedSettings: settings}, function() {
    // Check for any error
    if (chrome.runtime.lastError) {
      showFeedback('Error saving settings: ' + chrome.runtime.lastError.message, true);
      return;
    }
    
    // Update status to user
    showFeedback('Settings saved!');
    
    // Notify content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: settings
          }, function(response) {
            if (chrome.runtime.lastError) {
              showFeedback('Note: Content script not ready. Refresh the page.', true);
            } else if (response && response.success) {
              showFeedback('Settings applied to current page!');
            }
          });
        } catch (error) {
          showFeedback('Error communicating with page: ' + error.message, true);
        }
      } else {
        showFeedback('Not on X/Twitter. Settings saved for later use.');
      }
    });
  });
}

// Reset to default settings
function resetSettings() {
  // Apply default settings to UI
  extensionToggle.checked = defaultSettings.enabled;
  apiKeyInput.value = defaultSettings.apiKey;
  
  // Set API provider radio
  document.querySelector(`input[name="api-provider"][value="${defaultSettings.apiProvider}"]`).checked = true;
  
  // Set topic checkboxes
  for (const [topicId, isEnabled] of Object.entries(defaultSettings.topics)) {
    topicCheckboxes[topicId].checked = isEnabled;
  }
  
  // Save default settings
  saveSettings();
}

// Show feedback to user
function showFeedback(message, isError = false) {
  // Create feedback element if it doesn't exist
  let feedback = document.querySelector('.feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.style.position = 'fixed';
    feedback.style.bottom = '16px';
    feedback.style.left = '50%';
    feedback.style.transform = 'translateX(-50%)';
    feedback.style.padding = '8px 16px';
    feedback.style.borderRadius = '20px';
    feedback.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    feedback.style.zIndex = '1000';
    document.body.appendChild(feedback);
  }
  
  // Update message and styling
  feedback.textContent = message;
  
  if (isError) {
    feedback.style.backgroundColor = '#e74c3c';
  } else {
    feedback.style.backgroundColor = '#1d9bf0';
  }
  feedback.style.color = 'white';
  
  // Show feedback
  feedback.style.opacity = '1';
  
  // Hide after 3 seconds
  setTimeout(() => {
    feedback.style.opacity = '0';
    feedback.style.transition = 'opacity 0.5s';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
applyBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);