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
  
  // Cache for videos to avoid repeated API calls
  private static videoCache: YouTubeVideo[] = [];
  private static lastCacheTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Kid-friendly channels and search terms
  private static readonly KIDS_CHANNELS = [
    'UCBXVGODxUHmsEsGgUFQgqQw', // Ms Rachel
    'UCbCmjCuTUZos6Inko4u57UQ', // Cocomelon
    'UCGwA4GJE-_XoKnrdyqfi6fQ', // Super Simple Songs
    'UCPlwHry6Ew6-8zTtXnBuNwg', // Blippi
    'UCKAqou7V9FWgPBC3vafy_ew', // Little Baby Bum
    'UCbFWrz_2m_sDJ3hSHKWJUMw', // Dave and Ava
  ];

  private static readonly KIDS_SEARCH_TERMS = [
    'kids songs',
    'nursery rhymes',
    'children learning',
    'baby songs',
    'educational videos for kids',
    'toddler learning',
    'kids cartoons',
    'alphabet songs',
    'counting songs',
    'kids music'
  ];

  static async searchKidsVideos(query: string = '', maxResults: number = 20, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      // If no query provided, use random kids search term
      const searchQuery = query || this.getRandomKidsSearchTerm();
      
      const allVideos: YouTubeVideo[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;

      // Fetch videos with balanced limit
      while (allVideos.length < maxVideosPerCategory) {
        const searchUrl = `${this.BASE_URL}/search?` +
          `part=snippet&` +
          `q=${encodeURIComponent(searchQuery)}&` +
          `type=video&` +
          `videoCategoryId=1&` +
          `safeSearch=strict&` +
          `maxResults=50&` +
          `order=relevance&` +
          `relevanceLanguage=en&` +
          `regionCode=PH&` +
          `${nextPageToken ? `pageToken=${nextPageToken}&` : ''}` +
          `key=${this.API_KEY}`;

        console.log(`[${searchQuery}] Searching page ${pageCount + 1}...`);

        const response = await fetch(searchUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`YouTube API error: ${response.status} - ${response.statusText}`);
          console.error('Error response:', errorText);
          if (pageCount === 0) throw new Error(`YouTube API error: ${response.status}`);
          break;
        }

        const data: YouTubeSearchResponse = await response.json();
        console.log(`[${searchQuery}] Page ${pageCount + 1}:`, data.items?.length || 0, 'items');
        
        if (!data.items || data.items.length === 0) {
          console.log(`[${searchQuery}] No more videos found`);
          break;
        }

        // Get video IDs for additional details
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        
        // Fetch video statistics and duration
        const videoDetails = await this.getVideoDetails(videoIds);

        // Transform data to match your existing video structure
        const videos: YouTubeVideo[] = data.items.map((item, index) => {
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

        allVideos.push(...videos);
        console.log(`[${searchQuery}] Page ${pageCount + 1}: Found ${videos.length} videos, Total: ${allVideos.length}`);

        // Check if we've reached our limit
        if (allVideos.length >= maxVideosPerCategory) {
          console.log(`[${searchQuery}] Reached limit of ${maxVideosPerCategory} videos`);
          break;
        }

        // Check if there's a next page
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) {
          console.log(`[${searchQuery}] No more pages available`);
          break;
        }

        pageCount++;
      }

      console.log(`[${searchQuery}] Total videos: ${allVideos.length}`);
      return allVideos.slice(0, maxVideosPerCategory).length > 0 ? allVideos.slice(0, maxVideosPerCategory) : this.getFallbackVideos();
    } catch (error) {
      console.error('Error fetching YouTube Kids videos:', error);
      return this.getFallbackVideos(); // Return fallback videos on error
    }
  }

  static async getVideosByChannel(channelId: string, maxResults: number = 10, maxVideosPerCategory: number = 150): Promise<YouTubeVideo[]> {
    try {
      const allVideos: YouTubeVideo[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;

      // Fetch videos from channel with balanced limit
      while (allVideos.length < maxVideosPerCategory) {
        const searchUrl = `${this.BASE_URL}/search?` +
          `part=snippet&` +
          `channelId=${channelId}&` +
          `type=video&` +
          `safeSearch=strict&` +
          `maxResults=50&` +
          `order=date&` +
          `${nextPageToken ? `pageToken=${nextPageToken}&` : ''}` +
          `key=${this.API_KEY}`;

        console.log(`[Channel ${channelId}] Fetching page ${pageCount + 1}...`);

        const response = await fetch(searchUrl);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Channel ${channelId}] YouTube API error: ${response.status} - ${errorText}`);
          if (pageCount === 0) {
            console.error(`[Channel ${channelId}] Failed on first page, channel might be restricted`);
            return [];
          }
          break;
        }

        const data: YouTubeSearchResponse = await response.json();
        console.log(`[Channel ${channelId}] Page ${pageCount + 1} response:`, data.items?.length || 0, 'items');
        
        if (!data.items || data.items.length === 0) {
          console.log(`[Channel ${channelId}] No more videos`);
          break;
        }

        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const videoDetails = await this.getVideoDetails(videoIds);

        const videos: YouTubeVideo[] = data.items.map(item => ({
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

        allVideos.push(...videos);
        console.log(`[Channel ${channelId}] Page ${pageCount + 1}: ${videos.length} videos, Total: ${allVideos.length}`);

        // Check if we've reached our limit
        if (allVideos.length >= maxVideosPerCategory) {
          console.log(`[Channel ${channelId}] Reached limit of ${maxVideosPerCategory} videos`);
          break;
        }

        // Check if there's a next page
        nextPageToken = data.nextPageToken;
        if (!nextPageToken) {
          console.log(`[Channel ${channelId}] No more pages available`);
          break;
        }

        pageCount++;
      }

      console.log(`[Channel ${channelId}] Total videos: ${allVideos.length}`);
      return allVideos.slice(0, maxVideosPerCategory);
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
    return [
      {
        id: '1',
        title: "Baby Learning With Ms Rachel - First Words, Songs",
        channel: "Ms Rachel - Toddler Learning",
        channelId: "UCBXVGODxUHmsEsGgUFQgqQw",
        views: "3.2M views",
        publishedAt: "2 weeks ago",
        youtubeId: "hTqtGJwsJVE",
        thumbnail: "https://i.ytimg.com/vi/hTqtGJwsJVE/hqdefault.jpg",
        channelIcon: "https://yt3.ggpht.com/ytc/AKedOLR3-yTrDr1lF_8aQ2Y7Y5YjYHqjN6qz7R43O1OeFw=s88-c-k-c0x00ffffff-no-rj",
        description: "Educational content for babies and toddlers",
        duration: "30:15"
      },
      {
        id: '2',
        title: "Baby's First Words with Ms Rachel - Videos for Babies",
        channel: "Ms Rachel - Toddler Learning",
        channelId: "UCBXVGODxUHmsEsGgUFQgqQw",
        views: "2.1M views",
        publishedAt: "1 month ago",
        youtubeId: "zwL2o4jZxbc",
        thumbnail: "https://i.ytimg.com/vi/zwL2o4jZxbc/hqdefault.jpg",
        channelIcon: "https://yt3.ggpht.com/ytc/AKedOLR3-yTrDr1lF_8aQ2Y7Y5YjYHqjN6qz7R43O1OeFw=s88-c-k-c0x00ffffff-no-rj",
        description: "First words learning for babies",
        duration: "25:42"
      },
      {
        id: '3',
        title: "ABC Song for Children | Alphabet Song | Nursery Rhymes",
        channel: "Super Simple Songs",
        channelId: "UCGwA4GJE-_XoKnrdyqfi6fQ",
        views: "1.8M views",
        publishedAt: "3 weeks ago",
        youtubeId: "_UR-l3QI2nE",
        thumbnail: "https://i.ytimg.com/vi/_UR-l3QI2nE/hqdefault.jpg",
        channelIcon: "https://yt3.ggpht.com/ytc/AKedOLSKx4VgYmQqQjl7QGIoZKKedOLSKx4VgYmQqQjl7QGIoZKK=s88-c-k-c0x00ffffff-no-rj",
        description: "Learn the alphabet with this fun ABC song",
        duration: "3:45"
      },
      {
        id: '4',
        title: "Wheels on the Bus | Kids Songs | Nursery Rhymes",
        channel: "Cocomelon",
        channelId: "UCbCmjCuTUZos6Inko4u57UQ",
        views: "5.2M views",
        publishedAt: "1 week ago",
        youtubeId: "e_04ZrNroTo",
        thumbnail: "https://i.ytimg.com/vi/e_04ZrNroTo/hqdefault.jpg",
        channelIcon: "https://yt3.ggpht.com/ytc/AKedOLSKx4VgYmQqQjl7QGIoZKKedOLSKx4VgYmQqQjl7QGIoZKK=s88-c-k-c0x00ffffff-no-rj",
        description: "Classic nursery rhyme for kids",
        duration: "4:12"
      }
    ];
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

