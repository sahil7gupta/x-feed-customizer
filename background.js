// X Feed Customizer - Background Script

// Set up default settings when the extension is installed
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Default settings for the extension
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
    
    // Save default settings to storage
    chrome.storage.local.set({feedSettings: defaultSettings}, function() {
      console.log('Default settings saved.');
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'apiRequest' && message.provider && message.text) {
    // This could be used to proxy API requests if needed in the future
    // For now, we're handling API requests directly in the content script
    sendResponse({success: true, message: 'API requests are handled in content script'});
  }
  return true;
});