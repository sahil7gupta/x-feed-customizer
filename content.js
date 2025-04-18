// X Feed Customizer - Content Script
console.log("X Feed Customizer Content Script Loading");

// Wait for the Chrome API to be available
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log("Chrome API detected, initializing extension");
  // Main controller for the X Feed Customizer
  const XFeedCustomizer = {
    // Settings from user preferences
    settings: null,
    
    // Cache for processed posts to avoid re-processing
    processedPosts: new Map(),
    
    // Flag to check if we're currently processing posts
    isProcessing: false,
    
    // API controllers
    apiController: {
      // OpenAI API endpoint
      openai: async function(text) {
        try {
          // Check if API key is available
          if (!XFeedCustomizer.settings.apiKey) {
            throw new Error('API key is missing');
          }
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${XFeedCustomizer.settings.apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: `You are a social media content classifier. Classify the following social media post into EXACTLY ONE of these categories: Technology, AI/ML, Science, Business, Startups, Crypto, Politics, World News, Health, Education, Art/Design, Gaming, Food, Travel, Entertainment. If the post appears to be engagement bait, memes, jokes, too short to classify, or doesn't fit into any specific category, classify it as Entertainment. Reply with ONLY the category name and nothing else.`
                },
                {
                  role: 'user',
                  content: text
                }
              ],
              temperature: 0.1,
              max_tokens: 10
            })
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          const result = data.choices[0].message.content.trim();
          console.log('Raw API response:', result);
          return result;
        } catch (error) {
          console.error('OpenAI API error:', error);
          return 'Error';
        }
      },
      
      // DeepSeek API endpoint
      deepseek: async function(text) {
        try {
          // Check if API key is available
          if (!XFeedCustomizer.settings.apiKey) {
            throw new Error('API key is missing');
          }
          
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${XFeedCustomizer.settings.apiKey}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: `You are a social media content classifier. Classify the following social media post into EXACTLY ONE of these categories: Technology, AI/ML, Science, Business, Startups, Crypto, Politics, World News, Health, Education, Art/Design, Gaming, Food, Travel, Entertainment. If the post appears to be engagement bait, memes, jokes, too short to classify, or doesn't fit into any specific category, classify it as Entertainment. Reply with ONLY the category name and nothing else.`
                },
                {
                  role: 'user',
                  content: text
                }
              ],
              temperature: 0.1,
              max_tokens: 10
            })
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          const result = data.choices[0].message.content.trim();
          console.log('Raw API response:', result);
          return result;
        } catch (error) {
          console.error('DeepSeek API error:', error);
          return 'Error';
        }
      }
    },
    
    // Initialize the extension
    init: async function() {
      console.log('X Feed Customizer initializing...');
      
      // Load settings from storage
      try {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['feedSettings'], resolve);
        });
        
        if (result.feedSettings) {
          this.settings = result.feedSettings;
          console.log('Loaded settings:', this.settings);
          
          // Log specific settings for debugging
          console.log('Extension enabled:', this.settings.enabled);
          console.log('Show indicators:', this.settings.showIndicators);
          console.log('API provider:', this.settings.apiProvider);
          console.log('API key present:', this.settings.apiKey ? 'Yes' : 'No');
          console.log('Topic filters:', this.settings.topics);
          
          // Check if entertainment is disabled
          console.log('Entertainment filter enabled:', 
            this.settings.topics.entertainment === true ? 'Yes' : 'No');
        } else {
          console.log('No settings found, extension will remain inactive.');
          return;
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        return;
      }
      
      // Set up mutation observer to detect new posts
      this.setupObserver();
      
      // Process existing posts on the page
      this.processExistingPosts();
    },
    
    // Set up mutation observer to detect new posts
    setupObserver: function() {
      console.log('Setting up mutation observer...');
      // Create a mutation observer to watch for new posts
      const observer = new MutationObserver(mutations => {
        if (this.isProcessing) {
          console.log('Still processing previous mutations, skipping this batch');
          return;
        }
        
        let shouldProcess = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            console.log('Detected page changes, will process new posts');
            shouldProcess = true;
            break;
          }
        }
        
        if (shouldProcess) {
          this.processNewPosts();
        }
      });
      
      // Start observing timeline changes
      let attempts = 0;
      const maxAttempts = 10;
      
      const observeInterval = setInterval(() => {
        attempts++;
        const timeline = this.getTimelineElement();
        
        if (timeline) {
          console.log('Found timeline element, setting up observer:', timeline);
          observer.observe(timeline, {
            childList: true,
            subtree: true
          });
          clearInterval(observeInterval);
          console.log('Observer set up successfully.');
          
          // Process existing posts immediately
          this.processExistingPosts();
        } else {
          console.log(`Timeline element not found, attempt ${attempts}/${maxAttempts}`);
          if (attempts >= maxAttempts) {
            console.log('Max attempts reached, trying to observe body instead');
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
            clearInterval(observeInterval);
          }
        }
      }, 1000);
    },
    
    // Get the timeline element
    getTimelineElement: function() {
      console.log('Looking for timeline element...');
      
      // Try different selectors that might contain the timeline
      const selectors = [
        '[data-testid="primaryColumn"]',
        'main[role="main"]',
        'div[aria-label*="Timeline"]',
        // Additional selectors to try
        '[data-testid="primaryColumn"] section',
        'div[data-testid="cellInnerDiv"]',
        'section[role="region"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('Found timeline element with selector:', selector);
          return element;
        }
      }
      
      // Last resort: find something that looks like a timeline
      const possibleTimelines = Array.from(document.querySelectorAll('section')).filter(
        el => el.querySelectorAll('article').length > 0
      );
      
      if (possibleTimelines.length > 0) {
        console.log('Found potential timeline element containing articles');
        return possibleTimelines[0];
      }
      
      console.log('Could not find timeline element');
      return null;
    },
    
    // Process all existing posts on the page
    processExistingPosts: async function() {
      if (!this.settings || !this.settings.enabled) return;
      
      console.log('Processing existing posts...');
      this.isProcessing = true;
      
      const posts = this.getPosts();
      for (const post of posts) {
        await this.processPost(post);
      }
      
      this.isProcessing = false;
      console.log(`Processed ${posts.length} existing posts.`);
    },
    
    // Process new posts that appeared on the page
    processNewPosts: async function() {
      if (!this.settings || !this.settings.enabled) return;
      
      this.isProcessing = true;
      
      const posts = this.getPosts();
      const newPosts = posts.filter(post => !this.processedPosts.has(this.getPostId(post)));
      
      if (newPosts.length > 0) {
        console.log(`Processing ${newPosts.length} new posts...`);
        for (const post of newPosts) {
          await this.processPost(post);
        }
      }
      
      this.isProcessing = false;
    },
    
    // Get all posts currently in the feed
    getPosts: function() {
      console.log('Looking for posts in the feed...');
      
      // Try different selectors for posts
      let posts = [];
      
      // Most common selector
      posts = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
      if (posts.length > 0) {
        console.log(`Found ${posts.length} posts with tweet selector`);
        return posts;
      }
      
      // Alternative selectors
      const selectors = [
        'article',
        'div[data-testid="cellInnerDiv"]',
        'div[data-testid="Tweet"]'
      ];
      
      for (const selector of selectors) {
        posts = Array.from(document.querySelectorAll(selector));
        if (posts.length > 0) {
          console.log(`Found ${posts.length} posts with selector: ${selector}`);
          return posts;
        }
      }
      
      console.log('No posts found in the feed');
      return [];
    },
    
    // Get a unique ID for a post
    getPostId: function(postElement) {
      // Try to extract a post ID from various attributes
      // First check for a data-testid with a tweet ID
      const timeElement = postElement.querySelector('time');
      if (timeElement) {
        const parentA = timeElement.closest('a');
        if (parentA && parentA.href) {
          const match = parentA.href.match(/\/status\/(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      
      // Fallback to using other attributes as an ID
      return postElement.getAttribute('data-testid') || 
             Math.random().toString(36).substring(2, 15);
    },
    
    // Process a single post
    processPost: async function(postElement) {
      if (!this.settings || !this.settings.enabled) return;
      
      const postId = this.getPostId(postElement);
      console.log('------------------------------------');
      console.log('Processing post ID:', postId);
      
      // Skip if already processed
      if (this.processedPosts.has(postId)) {
        console.log('Post already processed:', postId);
        return;
      }
      
      // Extract text content from the post
      const text = this.extractPostText(postElement);
      console.log('POST TEXT:', text);
      
      // For debugging purposes, don't hide any posts initially
      this.processedPosts.set(postId, 'Debug');
      this.showPost(postElement);
      
      // If post has no text, mark as Entertainment but don't hide (for debugging)
      if (!text || text.trim().length < 10) {
        const category = 'Entertainment';
        this.processedPosts.set(postId, category);
        console.log('POST CATEGORY:', category, ' (short/no text)');
        
        // Add visual indicator but don't hide
        if (this.settings.showIndicators) {
          this.addTopicIndicator(postElement, category);
        }
        return;
      }
      
      // Classify post text using the selected API
      let category;
      try {
        console.log('Calling API to classify post...');
        
        if (this.settings.apiProvider === 'openai') {
          category = await this.apiController.openai(text);
          console.log('OpenAI API returned category:', category);
        } else if (this.settings.apiProvider === 'deepseek') {
          category = await this.apiController.deepseek(text);
          console.log('DeepSeek API returned category:', category);
        } else {
          category = 'Error';
          console.log('No valid API provider selected, defaulting to Error');
        }
        
        // Normalize category name to match our topic IDs
        category = this.normalizeCategory(category);
        console.log('POST CATEGORY:', category, ' (from API)');
        
        // Store the classification result
        this.processedPosts.set(postId, category);
        
        // Apply filtering based on user preferences
        const topicId = this.categoryToTopicId(category);
        console.log('Checking if topic is enabled in user preferences:', topicId, 'enabled:', this.settings.topics[topicId]);
        
        if (this.settings.topics[topicId] === false) {
          console.log('HIDING post - category not in user preferences:', category, 'topicId:', topicId);
          this.hidePost(postElement);
        } else {
          console.log('SHOWING post - category is in user preferences:', category, 'topicId:', topicId);
          this.showPost(postElement);
          // Add visual indicator for the category if enabled
          if (this.settings.showIndicators) {
            this.addTopicIndicator(postElement, category);
          }
        }
        
      } catch (error) {
        console.error('Error classifying post:', error);
        category = 'Error';
        this.processedPosts.set(postId, category);
        
        // On error, show the post and add an error indicator if enabled
        this.showPost(postElement);
        if (this.settings.showIndicators) {
          this.addTopicIndicator(postElement, 'Error');
        }
        
        // Check for API key issues and log specific message
        if (error.message && (error.message.includes('401') || error.message.includes('authorization'))) {
          console.error('API authorization failed. Please check your API key in the extension settings.');
        }
      }
    },
    
    // Extract text content from a post
    extractPostText: function(postElement) {
      const textElement = postElement.querySelector('[data-testid="tweetText"]');
      if (textElement) {
        return textElement.textContent;
      }
      
      // Try alternative selectors
      const alternativeSelectors = [
        'p', 
        'div[lang]',
        'div[data-testid="postText"]'
      ];
      
      for (const selector of alternativeSelectors) {
        const elements = postElement.querySelectorAll(selector);
        if (elements.length > 0) {
          // Get the longest text content from matching elements
          let longestText = '';
          elements.forEach(el => {
            if (el.textContent.length > longestText.length) {
              longestText = el.textContent;
            }
          });
          
          if (longestText) {
            return longestText;
          }
        }
      }
      
      // If no text found with selectors, return empty string
      return '';
    },
    
    // Normalize category name to match our internal format
    normalizeCategory: function(category) {
      category = category.trim();
      
      // Map of possible API responses to our standard categories
      const categoryMap = {
        'technology': 'Technology',
        'tech': 'Technology',
        'ai': 'AI/ML',
        'ai/ml': 'AI/ML',
        'artificial intelligence': 'AI/ML',
        'machine learning': 'AI/ML',
        'science': 'Science',
        'business': 'Business',
        'finance': 'Business',
        'startups': 'Startups',
        'startup': 'Startups',
        'crypto': 'Crypto',
        'cryptocurrency': 'Crypto',
        'web3': 'Crypto',
        'blockchain': 'Crypto',
        'politics': 'Politics',
        'political': 'Politics',
        'news': 'World News',
        'world news': 'World News',
        'health': 'Health',
        'healthcare': 'Health',
        'wellness': 'Health',
        'education': 'Education',
        'learning': 'Education',
        'art': 'Art/Design',
        'design': 'Art/Design',
        'art/design': 'Art/Design',
        'gaming': 'Gaming',
        'games': 'Gaming',
        'food': 'Food',
        'cooking': 'Food',
        'travel': 'Travel',
        'entertainment': 'Entertainment',
        'meme': 'Entertainment',
        'joke': 'Entertainment',
        'error': 'Error'
      };
      
      // Convert to lowercase for case-insensitive matching
      const normalizedCategory = category.toLowerCase();
      
      // Return the mapped category or default to Entertainment
      return categoryMap[normalizedCategory] || 'Entertainment';
    },
    
    // Convert category name to topic ID
    categoryToTopicId: function(category) {
      // Map normalized categories to topic IDs
      const topicMap = {
        'Technology': 'technology',
        'AI/ML': 'ai-ml',
        'Science': 'science',
        'Business': 'business',
        'Startups': 'startups',
        'Crypto': 'crypto',
        'Politics': 'politics',
        'World News': 'world-news',
        'Health': 'health',
        'Education': 'education',
        'Art/Design': 'art-design',
        'Gaming': 'gaming',
        'Food': 'food',
        'Travel': 'travel',
        'Entertainment': 'entertainment',
        'Error': 'entertainment' // Default to entertainment on error
      };
      
      return topicMap[category] || 'entertainment';
    },
    
    // Add a visual indicator for the post category
    addTopicIndicator: function(postElement, category) {
      // Remove any existing indicator first
      const existingIndicator = postElement.querySelector('.xfc-topic-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // Create the indicator element
      const indicator = document.createElement('div');
      indicator.className = 'xfc-topic-indicator';
      indicator.textContent = category;
      
      // Style the indicator based on category
      indicator.style.fontSize = '11px';
      indicator.style.fontWeight = 'bold';
      indicator.style.padding = '2px 6px';
      indicator.style.borderRadius = '10px';
      indicator.style.display = 'inline-block';
      indicator.style.marginLeft = '8px';
      indicator.style.position = 'relative';
      indicator.style.top = '-1px';
      
      // Set color based on category
      const colors = {
        'Technology': '#00a8fc',
        'AI/ML': '#7b61ff',
        'Science': '#00b894',
        'Business': '#f39c12',
        'Startups': '#e74c3c',
        'Crypto': '#2ecc71',
        'Politics': '#e67e22',
        'World News': '#3498db',
        'Health': '#27ae60',
        'Education': '#9b59b6',
        'Art/Design': '#fd79a8',
        'Gaming': '#6c5ce7',
        'Food': '#fdcb6e',
        'Travel': '#00cec9',
        'Entertainment': '#d63031',
        'Error': '#95a5a6'
      };
      
      const color = colors[category] || '#95a5a6';
      indicator.style.backgroundColor = color;
      indicator.style.color = 'white';
      
      // Find a good place to insert the indicator
      const targetLocation = postElement.querySelector('[data-testid="User-Name"]');
      if (targetLocation) {
        // Insert after username
        targetLocation.parentNode.appendChild(indicator);
      } else {
        // Fallback: insert at the top of the post
        const firstChild = postElement.querySelector('div');
        if (firstChild) {
          firstChild.prepend(indicator);
        }
      }
    },
    
    // Hide a post that doesn't match the user's preferences
    hidePost: function(postElement) {
      console.log('Applying display:none to post element');
      postElement.style.display = 'none';
      
      // Also add a class for additional hiding (in case direct style doesn't work)
      postElement.classList.add('xfc-hidden-post');
      
      // For more complex hiding approaches, try hiding parent containers
      const parentCell = postElement.closest('[data-testid="cellInnerDiv"]');
      if (parentCell) {
        console.log('Also hiding parent cell');
        parentCell.style.display = 'none';
      }
    },
    
    // Show a post that matches the user's preferences
    showPost: function(postElement) {
      postElement.style.display = '';
    }
  };

  // Initialize the extension when the page is fully loaded and we're on the home page
  function initializeIfHomePage() {
    console.log('Checking if we are on home page. Current path:', window.location.pathname);
    // X sometimes uses different paths for home
    const homePaths = ['/', '/home', '/for-you', '/following'];
    
    if (homePaths.includes(window.location.pathname)) {
      console.log('X Feed Customizer: Detected home page, initializing...');
      XFeedCustomizer.init();
    } else {
      console.log('X Feed Customizer: Not on home page, skipping initialization. Path:', window.location.pathname);
    }
  }

  // Set up message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
      console.log('Received new settings:', message.settings);
      XFeedCustomizer.settings = message.settings;
      
      // Reprocess all posts with new settings
      XFeedCustomizer.processedPosts.clear();
      XFeedCustomizer.processExistingPosts();
      
      sendResponse({success: true});
    }
    return true;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIfHomePage);
  } else {
    initializeIfHomePage();
  }
} else {
  console.error("Chrome API not available. Extension will not work.");
}