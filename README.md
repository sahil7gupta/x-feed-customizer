# X Feed Customizer

A Chrome extension that helps you filter your X (formerly Twitter) feed based on content topics.

## Features

- **Topic-Based Filtering**: Show only posts from topics you're interested in
- **Visual Topic Indicators**: See what category each post belongs to with color-coded labels
- **Flexible Classification**: Choose between keyword-based classification (offline, no API key needed) or LLM-powered classification (higher accuracy)
- **Customizable Settings**: Enable/disable specific topics to create your ideal feed
- **Lightweight**: Minimal impact on browsing performance

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon to open the settings panel
2. Enable/disable topics you want to see in your feed
3. Choose between keyword-based or LLM-based classification (LLM requires an API key)
4. Click "Apply" to save your settings
5. Browse X with a cleaner, more focused feed

## Classification Methods

### Keyword-Based (Default)
- Works completely offline
- No API key required
- Moderate accuracy
- Zero cost

### LLM-Based (Optional)
- Requires an OpenAI or DeepSeek API key
- Higher accuracy for topic classification
- Handles nuanced content better
- Incurs API usage costs

## Available Topics

- Technology
- AI/ML
- Science
- Business
- Startups
- Crypto
- Politics
- World News
- Health
- Education
- Art/Design
- Gaming
- Food
- Travel
- Entertainment

## Known Issues

- Topic labels may not appear when scrolling quickly through the feed
- Some content may not be filtered correctly even when the topic is unselected
- X's frequent DOM updates can occasionally break the extension

## Privacy

This extension:
- Does not collect any personal data
- Does not track your browsing history
- When using keyword classification, no data leaves your browser
- When using LLM classification, post text is sent to the selected API provider

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
