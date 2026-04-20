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

  private static readonly ALLOWED_CHANNEL_IDS = [
    'UCG2CL6EUjG8TVT1Tpl9nJdg', // Ms Rachel
    'UC5PYHgAzJ1wLEidB58SK6Xw', // Blippi
    'UCJkWoS4RsldA1coEIot5yDA', // Mother Goose Club
    'UCvlE5gTbOvjiolFlEm-c_Ow', // Vlad and Niki
    'UCy_DlTwLI812Lh-OIKYrwrQ', // Adi Connection
  ];

  // Get popular kids channels
  private static readonly KIDS_CHANNELS: string[] = this.ALLOWED_CHANNEL_IDS;

  private static readonly EXCLUDED_CHANNEL_IDS = [
    'UCbCmjCuTUZos6Inko4u57UQ', // Cocomelon
  ];

  private static readonly EXCLUDED_CHANNEL_KEYWORDS = [
    'cocomelon',
  ];

  private static readonly KIDS_SEARCH_TERMS = [
    'Ms Rachel daily routine for kids',
    'Blippi daily routine for kids',
    'Mother Goose Club daily routine for kids',
    'Vlad and Niki daily routine for kids',
    'Adi Connection daily routine for kids'
  ];

  static async searchKidsVideos(query: string = '', maxResults: number = 20, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      const baseQuery = query.trim();
      const searchQuery = baseQuery || this.getRandomKidsSearchTerm();
      const clampedResults = Math.min(Math.max(maxResults, 1), 25);
      const perChannelResults = Math.max(4, Math.ceil(clampedResults / this.ALLOWED_CHANNEL_IDS.length) + 2);
      const randomizedOrder = this.getRandomSearchOrder();

      const channelResults = await Promise.all(
        this.ALLOWED_CHANNEL_IDS.map(channelId =>
          this.searchVideosForChannel(channelId, searchQuery, perChannelResults, randomizedOrder).catch(() => [])
        )
      );

      const dedupedById = new Map<string, YouTubeVideo>();
      channelResults.forEach(videoList => {
        videoList.forEach(video => {
          if (!dedupedById.has(video.id)) {
            dedupedById.set(video.id, video);
          }
        });
      });

      const shuffled = this.shuffleVideos(Array.from(dedupedById.values()));
      const limitedVideos = shuffled.slice(0, Math.min(maxVideosPerCategory, clampedResults));
      console.log(`[${searchQuery}] Combined whitelist search videos: ${limitedVideos.length}`);
      return limitedVideos.length > 0 ? limitedVideos : this.getFallbackVideos();
    } catch (error) {
      console.error('Error fetching YouTube Kids videos:', error);
      return this.getFallbackVideos(); // Return fallback videos on error
    }
  }

  private static async searchVideosForChannel(
    channelId: string,
    query: string,
    maxResults: number,
    order: 'relevance' | 'date' | 'viewCount'
  ): Promise<YouTubeVideo[]> {
    if (this.isExcludedChannel(channelId)) {
      return [];
    }

    const clampedResults = Math.min(Math.max(maxResults, 1), 25);
    const normalizedQuery = query.trim();
    const channelQuery = normalizedQuery ? `${normalizedQuery} daily routine` : 'daily routine for kids';

    const searchUrl = `${this.BASE_URL}/search?` +
      `part=snippet&` +
      `channelId=${channelId}&` +
      `q=${encodeURIComponent(channelQuery)}&` +
      `type=video&` +
      `videoCategoryId=1&` +
      `safeSearch=strict&` +
      `maxResults=${clampedResults}&` +
      `order=${order}&` +
      `relevanceLanguage=en&` +
      `regionCode=PH&` +
      `key=${this.API_KEY}`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${channelId}] Search API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: YouTubeSearchResponse = await response.json();
    if (!data.items || data.items.length === 0) {
      return [];
    }

    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const videoDetails = await this.getVideoDetails(videoIds);

    return data.items
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
  }

  static async getVideosByChannel(channelId: string, maxResults: number = 10, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      if (this.isExcludedChannel(channelId)) {
        console.log(`[Channel ${channelId}] Skipped because channel is not in allowed whitelist`);
        return [];
      }

      const clampedResults = Math.min(Math.max(maxResults, 1), 25);
      const searchUrl = `${this.BASE_URL}/search?` +
        `part=snippet&` +
        `channelId=${channelId}&` +
        `q=${encodeURIComponent('daily routine for kids')}&` +
        `type=video&` +
        `safeSearch=strict&` +
        `maxResults=${clampedResults}&` +
        `order=${this.getRandomSearchOrder()}&` +
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
    if (!this.ALLOWED_CHANNEL_IDS.includes(channelId)) {
      return true;
    }

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
    return this.isExcludedChannel(channelId, channelTitle);
  }

  private static getRandomSearchOrder(): 'relevance' | 'date' | 'viewCount' {
    const orders: Array<'relevance' | 'date' | 'viewCount'> = ['relevance', 'date', 'viewCount'];
    const randomIndex = Math.floor(Math.random() * orders.length);
    return orders[randomIndex];
  }

  private static shuffleVideos<T>(videos: T[]): T[] {
    const clonedVideos = [...videos];
    for (let index = clonedVideos.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [clonedVideos[index], clonedVideos[randomIndex]] = [clonedVideos[randomIndex], clonedVideos[index]];
    }
    return clonedVideos;
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

