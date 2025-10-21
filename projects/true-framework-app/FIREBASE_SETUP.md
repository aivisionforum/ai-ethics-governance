# Firebase Setup Guide for TRUE Framework

This guide will help you set up Firebase Realtime Database to persist your TRUE Framework evaluations across devices and browser sessions.

## Why Firebase?

- **Free Tier**: 1GB storage, 10GB/month transfer
- **Real-time Sync**: Changes sync instantly across all connected devices
- **No Backend Required**: Works directly with GitHub Pages
- **Simple Setup**: No server configuration needed

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "true-framework-data")
4. Disable Google Analytics (not needed for this use case)
5. Click "Create project"

### 2. Enable Realtime Database

1. In your Firebase project, click "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose your database location (select closest to you)
4. Start in "test mode" for now (you can secure it later)
5. Click "Enable"

### 3. Get Your Configuration

1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the "</>" (Web) icon
5. Register your app with a nickname (e.g., "TRUE Framework")
6. Copy the configuration object that appears

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Configure in TRUE Framework

1. Open the TRUE Framework application
2. Scroll to "Data Persistence Options" section
3. Click "Setup Firebase" button
4. Enter the configuration values from step 3:
   - API Key
   - Auth Domain
   - Database URL
   - Project ID
   - App ID (optional)
5. Click "Connect"

### 5. Enable Sync

Once connected, click "Enable Sync" to start syncing your evaluations to Firebase.

## Security Rules (Recommended)

After testing, secure your database with these rules:

1. Go to Firebase Console → Realtime Database → Rules
2. Replace the rules with:

```json
{
  "rules": {
    "true_framework_evaluations": {
      ".read": true,
      ".write": true,
      ".validate": "newData.hasChildren(['evaluations', 'lastUpdated', 'version'])"
    }
  }
}
```

For production with authentication:
```json
{
  "rules": {
    "users": {
      "$uid": {
        "true_framework_evaluations": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

## Features

### What Gets Synced
- All model evaluations
- Scores and evidence
- Notes and modifications
- Timestamps and metadata

### How It Works
- **Auto-sync**: Changes sync automatically when enabled
- **Real-time**: Updates appear instantly on all connected devices
- **Conflict Resolution**: Last write wins
- **Offline Support**: Works offline, syncs when reconnected

## Troubleshooting

### "Not configured" Status
- Make sure all required fields are filled correctly
- Check that the Database URL includes "https://"
- Verify your Firebase project is active

### "Connection error" Status
- Check your internet connection
- Verify Firebase project hasn't exceeded quotas
- Ensure database rules allow read/write

### Data Not Syncing
- Make sure sync is enabled (button shows "Disable Sync")
- Check browser console for errors
- Verify Firebase configuration is correct

## Privacy & Data

- Your data is stored in your own Firebase project
- You have full control over your data
- Can delete all data at any time
- No data is shared with TRUE Framework developers

## Costs

Firebase Realtime Database free tier includes:
- 1 GB stored data
- 10 GB/month downloaded
- 100 simultaneous connections

This is more than sufficient for typical TRUE Framework usage.

## Support

For Firebase-specific issues, see [Firebase Documentation](https://firebase.google.com/docs/database/web/start)

For TRUE Framework issues, open an issue on GitHub.