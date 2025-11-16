# YouTube API Setup Guide

## Step 1: Get YouTube API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" at the topp
   - Click "NEW PROJECT"
   - Name it "Ritmo Kids Videos" or anything you prefer
   - Click "CREATE"

3. **Enable YouTube Data API v3**
   - In the left sidebar, go to **APIs & Services** > **Library**
   - Search for "YouTube Data API v3"
   - Click on it
   - Click **ENABLE**

4. **Create API Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **+ CREATE CREDENTIALS** at the top
   - Select **API Key**
   - Copy the generated API key

5. **Restrict Your API Key** (Important for security)
   - Click on the API key you just created
   - Under "API restrictions":
     - Select "Restrict key"
     - Check only "YouTube Data API v3"
   - Click **SAVE**

## Step 2: Add API Key to Your Project

1. Open the file: `src/youtubeService.ts`

2. Replace this line:
   ```typescript
   const YOUTUBE_API_KEY = 'YOUR_API_KEY_HERE';
   ```
   
   With your actual API key:
   ```typescript
   const YOUTUBE_API_KEY = 'AIzaSyD...your-actual-key...';
   ```

## Step 3: Test the Implementation

1. Run your app:
   ```bash
   npm start
   ```

2. Navigate to the Media tab
3. Videos should load automatically from YouTube

## API Usage Limits

- **Free Quota**: 10,000 units per day
- **Search query**: ~100 units
- **Video details**: ~1 unit per video
- **Channel details**: ~1 unit per channel

**Tips to save quota:**
- Cache video results locally using AsyncStorage
- Only refresh videos once per day or when user manually refreshes
- Limit search results to 10-20 videos per query

## Optional: Add Caching

To reduce API calls, you can cache video results:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In media.tsx
const loadVideos = async () => {
  try {
    setLoading(true);
    
    // Check cache first
    const cachedData = await AsyncStorage.getItem('@cached_videos');
    const cachedTime = await AsyncStorage.getItem('@cached_videos_time');
    
    if (cachedData && cachedTime) {
      const timeDiff = Date.now() - parseInt(cachedTime);
      const hoursSinceCache = timeDiff / (1000 * 60 * 60);
      
      // Use cache if less than 24 hours old
      if (hoursSinceCache < 24) {
        setVideos(JSON.parse(cachedData));
        setLoading(false);
        return;
      }
    }
    
    // Fetch fresh data
    const results = await searchKidsVideos("kids educational songs learning", 20);
    
    // Cache the results
    await AsyncStorage.setItem('@cached_videos', JSON.stringify(results));
    await AsyncStorage.setItem('@cached_videos_time', Date.now().toString());
    
    setVideos(results);
  } catch (err) {
    console.error("Error loading videos:", err);
    setError("Failed to load videos");
  } finally {
    setLoading(false);
  }
};
```

## Troubleshooting

### "API key not valid" error
- Make sure you copied the entire API key
- Check that YouTube Data API v3 is enabled
- Verify API restrictions allow YouTube Data API v3

### No videos loading
- Check your internet connection
- Check the console for error messages
- Verify the API key is correct in `youtubeService.ts`

### Quota exceeded
- Wait until the next day (resets at midnight Pacific Time)
- Implement caching to reduce API calls
- Consider upgrading to a paid plan if needed

## Alternative: Use Static Curated Videos

If you want to avoid API costs, you can create a curated list of video IDs:

```typescript
// In media.tsx
const CURATED_VIDEOS = [
  "hTqtGJwsJVE", // Ms Rachel - First Words
  "zwL2o4jZxbc", // Ms Rachel - Baby's First Words
  "glDJI7UKfbw", // Ms Rachel - Sign Language
  // Add more video IDs
];

// Then fetch details only for these specific videos
```

This way you control the content and reduce API calls significantly.
