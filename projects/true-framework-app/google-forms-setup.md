# Google Forms Integration Setup Guide

This guide explains how to set up Google Forms as a persistence backend for the TRUE Framework evaluator.

## Step 1: Create a Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new blank form
3. Title it "TRUE Framework Evaluations"

## Step 2: Add Form Fields

Add the following fields to your form:

### Required Fields

1. **Model Name** (Short answer)
   - Question: "Model Name"
   - Required: Yes

2. **Model URL** (Short answer)
   - Question: "Model URL"
   - Validation: URL

3. **Total Score** (Short answer)
   - Question: "Total Score"
   - Validation: Number between 0-30

4. **Tier** (Multiple choice)
   - Options: Platinum, Gold, Silver, Bronze

5. **Transparent Score** (Short answer)
   - Question: "Transparent Score (0-10)"
   - Validation: Number

6. **Reproducible Score** (Short answer)
   - Question: "Reproducible Score (0-10)"
   - Validation: Number

7. **Understandable Score** (Short answer)
   - Question: "Understandable Score (0-6)"
   - Validation: Number

8. **Executable Score** (Short answer)
   - Question: "Executable Score (0-4)"
   - Validation: Number

### Optional Fields

9. **Detailed Scores** (Paragraph)
   - Question: "Detailed Scores (JSON)"

10. **Evidence URLs** (Paragraph)
    - Question: "Evidence URLs (JSON)"

11. **Notes** (Paragraph)
    - Question: "Evaluation Notes"

12. **Evaluator** (Short answer)
    - Question: "Evaluator Name/ID"

13. **Modified** (Multiple choice)
    - Options: Yes, No

## Step 3: Get Form Entry IDs

1. Click the three dots menu → "Get pre-filled link"
2. Fill each field with test data
3. Click "Get link" and copy it
4. The URL will contain entry IDs like:
   ```
   https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.1234567890=test
   ```
5. Note down each entry ID

## Step 4: Configure Response Destination

1. Go to Responses tab
2. Click spreadsheet icon
3. Create a new spreadsheet or select existing
4. Name it "TRUE Framework Evaluations Data"

## Step 5: Get Form Submission URL

Your submission URL format:
```
https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse
```

Replace `YOUR_FORM_ID` with your actual form ID from the URL.

## Step 6: Update App Configuration

1. In `app.js`, locate the `submitToGoogleForms` function
2. Replace the entry IDs with your actual ones:

```javascript
async submitToGoogleForms(evaluation) {
    const config = JSON.parse(localStorage.getItem('true_gforms_config'));
    if (!config) return;
    
    const formData = new FormData();
    formData.append('entry.YOUR_ENTRY_ID_1', evaluation.modelName);
    formData.append('entry.YOUR_ENTRY_ID_2', evaluation.modelUrl);
    formData.append('entry.YOUR_ENTRY_ID_3', evaluation.totalScore);
    formData.append('entry.YOUR_ENTRY_ID_4', evaluation.tier);
    // ... add all your entry IDs
    
    try {
        await fetch(config.url, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });
    } catch (error) {
        console.error('Failed to submit to Google Forms:', error);
    }
}
```

## Step 7: Test the Integration

1. Open the TRUE Framework app
2. Click "Setup" under Google Forms Integration
3. Enter your form submission URL
4. Create a test evaluation
5. Check your Google Sheets for the submission

## Alternative: Using Google Apps Script

For more advanced integration, create a Google Apps Script web app:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    new Date(),
    data.modelName,
    data.modelUrl,
    data.totalScore,
    data.tier,
    JSON.stringify(data.scores),
    data.notes || '',
    data.modified ? 'Yes' : 'No'
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    'result': 'success',
    'row': sheet.getLastRow()
  })).setMimeType(ContentService.MimeType.JSON);
}
```

Deploy as web app and use the URL in your application.

## CORS Workaround

Since Google Forms doesn't support CORS, the app uses `mode: 'no-cors'`. This means:
- Submissions work but responses aren't readable
- Consider the Apps Script approach for full API functionality
- Or use a proxy service like CORS Anywhere

## Data Access

Access your evaluation data:
1. Open your linked Google Sheet
2. Use Google Sheets API for programmatic access
3. Create charts and analytics dashboards
4. Export as CSV for further analysis

## Security Notes

- Form responses are public if you share the form link
- Use Google Apps Script for authenticated submissions
- Consider adding reCAPTCHA for public deployments
- Regularly backup your Google Sheets data