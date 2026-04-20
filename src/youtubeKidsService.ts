interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  views: string;
  publishedAt: string;
  youtubeId: string;
  thumbnail: string;
  channelIcon: string;
  description: string;
  duration: string;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
      description: string;
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    statistics: {
      viewCount: string;
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

interface YouTubeChannelResponse {
  items: Array<{
    snippet: {
      thumbnails: {
        default: {
          url: string;
        };
      };
    };
  }>;
}

class YouTubeKidsService {
  private static readonly API_KEY = 'AIzaSyB9QXtNdg8XbBoy5N2SegPszoz8Zf4KbPc'; 
  private static readonly BASE_URL = 'https://www.googleapis.com/youtube/v3';
  private static readonly MAX_PAGES_PER_REQUEST = 1;
  
  // Cache for videos to avoid repeated API calls
  private static videoCache: YouTubeVideo[] = [];
  private static lastCacheTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Only these creators are allowed to appear in Media.
  private static readonly KIDS_CHANNELS: string[] = [];

  private static readonly ALLOWED_CREATOR_KEYWORDS = [
    'ms rachel',
    'blippi',
    'mother goose club',
    'vlad and niki',
    'adi connection',
    'adiconnection',
  ];

  private static readonly EXCLUDED_CHANNEL_IDS = [
    'UCbCmjCuTUZos6Inko4u57UQ', // Cocomelon
  ];

  private static readonly EXCLUDED_CHANNEL_KEYWORDS = [
    'cocomelon',
  ];

  private static readonly KIDS_SEARCH_TERMS = [
    'Ms. Rachel',
    'Blippi',
    'Mother Goose Club',
    'Vlad and Niki',
    'AdiConnection'
  ];

  static async searchKidsVideos(query: string = '', maxResults: number = 20, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      // If no query provided, use random kids search term
      const searchQuery = query || this.getRandomKidsSearchTerm();
      const clampedResults = Math.min(Math.max(maxResults, 1), 25);
      const searchUrl = `${this.BASE_URL}/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `type=video&` +
        `videoCategoryId=1&` +
        `safeSearch=strict&` +
        `maxResults=${clampedResults}&` +
        `order=relevance&` +
        `relevanceLanguage=en&` +
        `regionCode=PH&` +
        `key=${this.API_KEY}`;

      console.log(`[${searchQuery}] Single-page search (max ${clampedResults})...`);

      const response = await fetch(searchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`YouTube API error: ${response.status} - ${response.statusText}`);
        console.error('Error response:', errorText);
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data: YouTubeSearchResponse = await response.json();
      console.log(`[${searchQuery}] Page 1:`, data.items?.length || 0, 'items');

      if (!data.items || data.items.length === 0) {
        console.log(`[${searchQuery}] No videos found on first page`);
        return this.getFallbackVideos();
      }

      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const videoDetails = await this.getVideoDetails(videoIds);

      const videos: YouTubeVideo[] = data.items
        .filter(item => !this.isExcludedVideo(
          item.snippet.channelId,
          item.snippet.channelTitle,
          item.snippet.title,
          item.snippet.description
        ))
        .map(item => {
          const videoDetail = videoDetails[item.id.videoId];
          return {
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            views: this.formatViewCount(videoDetail?.viewCount || '0'),
            publishedAt: this.formatPublishedDate(item.snippet.publishedAt),
            youtubeId: item.id.videoId,
            thumbnail: item.snippet.thumbnails.high.url,
            channelIcon: 'https://via.placeholder.com/88x88',
            description: item.snippet.description,
            duration: this.formatDuration(videoDetail?.duration || 'PT0S')
          };
        });

      const limitedVideos = videos.slice(0, maxVideosPerCategory);
      console.log(`[${searchQuery}] Single-page final videos: ${limitedVideos.length}`);
      return limitedVideos.length > 0 ? limitedVideos : this.getFallbackVideos();
    } catch (error) {
      console.error('Error fetching YouTube Kids videos:', error);
      return this.getFallbackVideos(); // Return fallback videos on error
    }
  }

  static async getVideosByChannel(channelId: string, maxResults: number = 10, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      if (this.isExcludedChannel(channelId)) {
        console.log(`[Channel ${channelId}] Skipped because channel is excluded`);
        return [];
      }

      const clampedResults = Math.min(Math.max(maxResults, 1), 25);
      const searchUrl = `${this.BASE_URL}/search?` +
        `part=snippet&` +
        `channelId=${channelId}&` +
        `type=video&` +
        `safeSearch=strict&` +
        `maxResults=${clampedResults}&` +
        `order=date&` +
        `key=${this.API_KEY}`;

      console.log(`[Channel ${channelId}] Single-page fetch (max ${clampedResults})...`);

      const response = await fetch(searchUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Channel ${channelId}] YouTube API error: ${response.status} - ${errorText}`);
        return [];
      }

      const data: YouTubeSearchResponse = await response.json();
      console.log(`[Channel ${channelId}] Page 1 response:`, data.items?.length || 0, 'items');

      if (!data.items || data.items.length === 0) {
        console.log(`[Channel ${channelId}] No videos on first page`);
        return [];
      }

      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const videoDetails = await this.getVideoDetails(videoIds);

      const videos: YouTubeVideo[] = data.items
        .filter(item => !this.isExcludedVideo(
          item.snippet.channelId,
          item.snippet.channelTitle,
          item.snippet.title,
          item.snippet.description
        ))
        .map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          views: this.formatViewCount(videoDetails[item.id.videoId]?.viewCount || '0'),
          publishedAt: this.formatPublishedDate(item.snippet.publishedAt),
          youtubeId: item.id.videoId,
          thumbnail: item.snippet.thumbnails.high.url,
          channelIcon: 'https://via.placeholder.com/88x88',
          description: item.snippet.description,
          duration: this.formatDuration(videoDetails[item.id.videoId]?.duration || 'PT0S')
        }));

      const limitedVideos = videos.slice(0, maxVideosPerCategory);
      console.log(`[Channel ${channelId}] Single-page final videos: ${limitedVideos.length}`);
      return limitedVideos;
    } catch (error) {
      console.error(`[Channel ${channelId}] Error fetching channel videos:`, error);
      return [];
    }
  }

  private static async getVideoDetails(videoIds: string): Promise<Record<string, { viewCount: string; duration: string }>> {
    try {
      if (!videoIds) {
        return {};
      }

      const details: Record<string, { viewCount: string; duration: string }> = {};
      const videoIdArray = videoIds.split(',');
      
      // Split into batches of 20 to avoid hitting API limits
      const batchSize = 20;
      for (let i = 0; i < videoIdArray.length; i += batchSize) {
        const batch = videoIdArray.slice(i, i + batchSize);
        
        const detailsUrl = `${this.BASE_URL}/videos?` +
          `part=statistics,contentDetails&` +
          `id=${batch.join(',')}&` +
          `key=${this.API_KEY}`;

        const response = await fetch(detailsUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Video details API error: ${response.status}`, errorText);
          continue; // Skip this batch and continue
        }

        const data: YouTubeVideoDetailsResponse = await response.json();

        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item, index) => {
            const videoId = batch[index];
            if (item && item.statistics && item.contentDetails && videoId) {
              details[videoId] = {
                viewCount: item.statistics.viewCount || '0',
                duration: item.contentDetails.duration || 'PT0S'
              };
            }
          });
        }
      }

      return details;
    } catch (error) {
      console.error('Error fetching video details:', error);
      return {};
    }
  }

  private static getRandomKidsSearchTerm(): string {
    const randomIndex = Math.floor(Math.random() * this.KIDS_SEARCH_TERMS.length);
    return this.KIDS_SEARCH_TERMS[randomIndex];
  }

  private static isExcludedChannel(channelId: string, channelTitle: string = ''): boolean {
    if (this.EXCLUDED_CHANNEL_IDS.includes(channelId)) {
      return true;
    }

    const normalizedTitle = channelTitle.toLowerCase();
    return this.EXCLUDED_CHANNEL_KEYWORDS.some(keyword => normalizedTitle.includes(keyword));
  }

  private static isExcludedVideo(
    channelId: string,
    channelTitle: string = '',
    videoTitle: string = '',
    videoDescription: string = ''
  ): boolean {
    if (this.isExcludedChannel(channelId, channelTitle)) {
      return true;
    }

    const normalizedCombined = `${channelTitle} ${videoTitle} ${videoDescription}`.toLowerCase();
    const hasAllowedCreator = this.ALLOWED_CREATOR_KEYWORDS.some(keyword =>
      normalizedCombined.includes(keyword)
    );

    return !hasAllowedCreator;
  }

  private static formatViewCount(viewCount: string): string {
    const count = parseInt(viewCount);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  }

  private static formatPublishedDate(publishedAt: string): string {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffTime = Math.abs(now.getTime() - published.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  private static formatDuration(duration: string): string {
    // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Fallback videos in case API fails
  private static getFallbackVideos(): YouTubeVideo[] {
    return [];
  }

  // Synchronous fallback for instant UI display
  static getFallbackVideosSync(): YouTubeVideo[] {
    return this.getFallbackVideos();
  }

  // Get popular kids channels
  static getKidsChannels() {
    return this.KIDS_CHANNELS;
  }

  // Get random videos from kids channels
  static async getRandomKidsVideos(maxResults: number = 15): Promise<YouTubeVideo[]> {
    console.log('=== getRandomKidsVideos called ===');
    
    try {
      // ALWAYS return fallback videos first to ensure something shows
      console.log('Returning fallback videos immediately');
      const fallbackVideos = this.getFallbackVideos();
      
      // Cache the fallback videos
      this.videoCache = fallbackVideos;
      this.lastCacheTime = Date.now();
      
      return fallbackVideos;
  
    } catch (error) {
      console.error('Error in getRandomKidsVideos:', error);
      return this.getFallbackVideos();
    }
  }
}

export { YouTubeKidsService, YouTubeVideo };

