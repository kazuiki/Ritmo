# YouTube Kids API Setup Guide

This guide will help you set up YouTube Data API v3 for your Ritmo app to fetch kid-friendly videos.

## Prerequisites

- Google Cloud Console account
- YouTube Data API v3 enabled
- API Key with proper restrictions

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable YouTube Data API v3

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "YouTube Data API v3"
3. Click on it and press **Enable**

### 3. Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key
4. Click **Restrict Key** to secure it

### 4. Configure API Key Restrictions

#### Application Restrictions
- Select **Android apps** or **iOS apps** depending on your platform
- Add your app's package name and SHA-1 certificate fingerprint

#### API Restrictions
- Select **Restrict key**
- Choose **YouTube Data API v3** from the list

### 5. Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   YOUTUBE_API_KEY=your_actual_api_key_here
   ```

### 6. Update API Key in Code

Open `src/youtubeKidsService.ts` and replace the placeholder:

```typescript
private static readonly API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your actual API key
```

With your actual API key:

```typescript
private static readonly API_KEY = 'AIzaSyC...your_actual_key_here';
```

## API Usage Limits

- **Free Quota**: 10,000 units per day
- **Search operation**: 100 units per request
- **Video details**: 1 unit per video
- **Channel details**: 1 unit per channel

## Kid-Safe Content Features

The API service includes several safety features:

### 1. Safe Search
- `safeSearch=strict` parameter enabled
- Filters out inappropriate content

### 2. Curated Channels
Pre-approved kid-friendly channels:
- Ms Rachel - Toddler Learning
- Cocomelon
- Super Simple Songs
- Blippi
- Little Baby Bum
- Dave and Ava

### 3. Educational Category
- Uses `videoCategoryId=27` (Education)
- Prioritizes educational content

### 4. Content Filtering
- Searches include "kids safe" keywords
- Age-appropriate search terms only

## Testing the Integration

1. Start your app
2. Navigate to the Media tab
3. You should see videos loading from YouTube Kids API
4. Try searching for kid-friendly terms like:
   - "nursery rhymes"
   - "alphabet songs"
   - "counting songs"
   - "baby learning"

## Troubleshooting

### Common Issues

1. **API Key Error**
   - Verify API key is correct
   - Check if YouTube Data API v3 is enabled
   - Ensure API key restrictions are properly configured

2. **No Videos Loading**
   - Check internet connection
   - Verify API quota hasn't been exceeded
   - Check console logs for error messages

3. **Quota Exceeded**
   - Wait for quota reset (daily at midnight Pacific Time)
   - Consider implementing caching to reduce API calls
   - Optimize search queries

### Error Messages

- `403 Forbidden`: API key restrictions or quota exceeded
- `400 Bad Request`: Invalid parameters or malformed request
- `404 Not Found`: Invalid video/channel ID

## Best Practices

1. **Caching**: Implement local caching to reduce API calls
2. **Error Handling**: Always handle API failures gracefully
3. **Fallback Content**: Provide fallback videos when API fails
4. **Rate Limiting**: Implement debouncing for search queries
5. **Monitoring**: Track API usage to avoid quota limits

## Security Notes

- Never commit API keys to version control
- Use environment variables for API keys
- Implement proper API key restrictions
- Consider using backend proxy for additional security

## Support

For issues with the YouTube API integration:
1. Check the [YouTube Data API documentation](https://developers.google.com/youtube/v3)
2. Review Google Cloud Console logs
3. Test API calls using the [API Explorer](https://developers.google.com/youtube/v3/docs)
