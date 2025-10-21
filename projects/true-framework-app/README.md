# TRUE Framework - LLM Openness Evaluator

A web-based tool for evaluating the openness and reproducibility of open Large Language Models (LLMs) using the TRUE (Transparent, Reproducible, Understandable, Executable) framework.

## Live Demo

Visit: [https://csheargm.github.io/true_framework/](https://csheargm.github.io/true_framework/)

## Overview

The TRUE Framework provides a systematic scorecard approach to evaluate how "open" a model truly is—beyond just licensing. It scores models across four key dimensions with a maximum total score of 30 points.

### Scoring Dimensions

1. **Transparent (Max 10 pts)** - Critical components openly disclosed
2. **Reproducible (Max 10 pts)** - Feasibility to retrain the model
3. **Understandable (Max 6 pts)** - Well-documented for understanding
4. **Executable (Max 4 pts)** - Can run or fine-tune locally

### Tier Classification

- **Platinum (28–30)**: Fully open and reproducible
- **Gold (21–27)**: Strong openness, minor gaps
- **Silver (11–20)**: Some transparency, low reproducibility
- **Bronze (0–10)**: Minimal openness

## Features

- **Predefined Model Templates**: Quick evaluation of popular models (Mistral, LLaMA, Falcon, etc.)
- **Custom Model URL Input**: Evaluate any model by providing its repository URL
- **Auto-Analysis**: Attempts to automatically detect common openness indicators
- **Interactive Scoring**: Click-based evaluation with evidence tracking
- **Leaderboard**: Ranked list of evaluated models with filtering
- **Modification Tracking**: Edit previous evaluations with history tracking
- **Multiple Persistence Options**:
  - Local browser storage (default)
  - Google Forms integration (optional)
  - JSON export/import

## Usage

### Quick Start

1. Open the tool in your browser
2. Choose evaluation method:
   - Select a predefined model from the dropdown
   - Enter a custom GitHub/HuggingFace URL
3. Click "Start Evaluation"
4. Check criteria that the model meets
5. Add evidence URLs for validation
6. Save your evaluation

### Auto-Analysis

For custom URLs, click "Auto-Analyze Repository" to attempt automatic detection of:
- License files
- Model weights
- Training/inference code
- Documentation

### Data Persistence

#### Local Storage (Default)
- Evaluations automatically saved in browser
- Data persists across sessions
- Private to your device

#### Google Forms Integration
1. Create a Google Form with appropriate fields
2. Click "Setup" in persistence options
3. Enter your form's submission URL
4. Evaluations will be sent to your form

#### Export/Import
- Export all evaluations as JSON
- Import evaluations from JSON files
- Share evaluations across devices

## Deployment

### GitHub Pages

1. Fork this repository
2. Go to Settings → Pages
3. Set source to main branch, root folder
4. Your site will be available at: `https://[username].github.io/true_framework/`

### Local Development

Simply open `index.html` in a web browser. No build process required!

### Custom Domain

1. Add a CNAME file with your domain
2. Configure DNS settings
3. Enable HTTPS in GitHub Pages settings

## Persistence Backend Options

### Option 1: Google Forms (Recommended for Simple Setup)

Advantages:
- No coding required
- Free with Google account
- Automatic spreadsheet integration
- Built-in timestamp and validation

Setup:
1. Create a Google Form with fields matching the evaluation data
2. Get the form's prefilled URL
3. Extract entry IDs
4. Configure in the app

### Option 2: GitHub Actions + GitHub API

Create automated persistence using GitHub Actions:
- Store evaluations as JSON in repository
- Use GitHub API for updates
- Maintain version history

### Option 3: Firebase/Supabase

For more robust backend:
- Real-time synchronization
- User authentication
- Advanced querying
- Scalable storage

### Option 4: Custom API

Deploy a simple API using:
- Vercel/Netlify Functions
- AWS Lambda
- Google Cloud Functions

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Future Enhancements

- [ ] GitHub API integration for automatic repository analysis
- [ ] Batch evaluation mode
- [ ] Comparison view for multiple models
- [ ] Export to standardized report format
- [ ] Community voting on evaluations
- [ ] Historical score tracking
- [ ] API endpoint for programmatic access
- [ ] Integration with model registries

## License

MIT License - See LICENSE file for details

## Credits

Based on the TRUE Framework specification for evaluating open LLM reproducibility.

## Support

For issues or questions, please open an issue on GitHub.