# Deployment Guide for GitHub Pages

This guide explains how to deploy the Responsible AI Infographic to GitHub Pages.

## Prerequisites

- A Google Gemini API key
- Repository access to https://github.com/csheargm/morai_infographics

## GitHub Pages Setup

### 1. Configure GitHub Secret for API Key

To keep your API key secure, you need to add it as a GitHub secret:

1. Go to your repository: https://github.com/csheargm/morai_infographics
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add the following secret:
   - **Name**: `VITE_API_KEY`
   - **Value**: Your Google Gemini API key (e.g., `AIzaSy...`)
6. Click **Add secret**

### 2. Enable GitHub Pages

1. Go to **Settings** tab in your repository
2. In the left sidebar, click **Pages**
3. Under **Source**, select:
   - Source: **GitHub Actions**
4. Save the changes

### 3. Deploy

The deployment will happen automatically when you push to the `main` branch. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:

1. Install dependencies
2. Build the project with your API key injected as an environment variable
3. Deploy the built files to GitHub Pages

You can also manually trigger deployment:
1. Go to **Actions** tab
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** button

### 4. Access Your Site

Once deployed, your site will be available at:
```
https://csheargm.github.io/morai_infographics/
```

## Local Development

For local development, create a `.env` file in the project root:

```env
VITE_API_KEY=your_google_api_key_here
```

**Important**: Never commit the `.env` file to the repository. It's already in `.gitignore`.

## Troubleshooting

### Build Fails

- Check that the `VITE_API_KEY` secret is correctly set in GitHub
- Check the Actions tab for detailed error logs

### API Key Not Working

- Verify the API key has the correct permissions for Gemini API
- Ensure billing is enabled for your Google Cloud project
- Check the API key hasn't expired or been revoked

### Site Not Updating

- Check the Actions tab to ensure the deployment workflow completed successfully
- GitHub Pages can take a few minutes to update after deployment
- Try clearing your browser cache
