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
  private static readonly API_KEY = 'AIzaSyDFM3AlWOQ8rFowgV10ykOUECmKJuIWC7c'; 
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

  static async searchKidsVideos(query: string = '', maxResults: number = 20): Promise<YouTubeVideo[]> {
    try {
      // If no query provided, use random kids search term
      const searchQuery = query || this.getRandomKidsSearchTerm();
      
      const searchUrl = `${this.BASE_URL}/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `type=video&` +
        `safeSearch=strict&` +
        `maxResults=${maxResults}&` +
        `order=relevance&` +
        `key=${this.API_KEY}`;

      console.log('Searching with URL:', searchUrl); // Debug log

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error(`YouTube API error: ${response.status} - ${response.statusText}`);
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data: YouTubeSearchResponse = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (!data.items || data.items.length === 0) {
        console.log('No videos found, returning fallback videos');
        return this.getFallbackVideos();
      }

      // Get video IDs for additional details
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      
      // Fetch video statistics and duration
      const videoDetails = await this.getVideoDetails(videoIds);
      
      // Get unique channel IDs for channel icons
      const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))];
      const channelIcons = await this.getChannelIcons(channelIds);

      // Transform data to match your existing video structure
      const videos: YouTubeVideo[] = data.items.map((item, index) => {
        const videoDetail = videoDetails[item.id.videoId];
        const channelIcon = channelIcons[item.snippet.channelId];
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          views: this.formatViewCount(videoDetail?.viewCount || '0'),
          publishedAt: this.formatPublishedDate(item.snippet.publishedAt),
          youtubeId: item.id.videoId,
          thumbnail: item.snippet.thumbnails.high.url,
          channelIcon: channelIcon || 'https://via.placeholder.com/88x88',
          description: item.snippet.description,
          duration: this.formatDuration(videoDetail?.duration || 'PT0S')
        };
      });

      console.log(`Found ${videos.length} videos`); // Debug log
      return videos;
    } catch (error) {
      console.error('Error fetching YouTube Kids videos:', error);
      return this.getFallbackVideos(); // Return fallback videos on error
    }
  }

  static async getVideosByChannel(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    try {
      const searchUrl = `${this.BASE_URL}/search?` +
        `part=snippet&` +
        `channelId=${channelId}&` +
        `type=video&` +
        `safeSearch=strict&` +
        `maxResults=${maxResults}&` +
        `order=date&` +
        `key=${this.API_KEY}`;

      const response = await fetch(searchUrl);
      const data: YouTubeSearchResponse = await response.json();
      
      if (!data.items) return [];

      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const videoDetails = await this.getVideoDetails(videoIds);
      const channelIcons = await this.getChannelIcons([channelId]);

      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        views: this.formatViewCount(videoDetails[item.id.videoId]?.viewCount || '0'),
        publishedAt: this.formatPublishedDate(item.snippet.publishedAt),
        youtubeId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.high.url,
        channelIcon: channelIcons[channelId] || 'https://via.placeholder.com/88x88',
        description: item.snippet.description,
        duration: this.formatDuration(videoDetails[item.id.videoId]?.duration || 'PT0S')
      }));
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      return [];
    }
  }

  private static async getVideoDetails(videoIds: string): Promise<Record<string, { viewCount: string; duration: string }>> {
    try {
      if (!videoIds) {
        return {};
      }

      const detailsUrl = `${this.BASE_URL}/videos?` +
        `part=statistics,contentDetails&` +
        `id=${videoIds}&` +
        `key=${this.API_KEY}`;

      const response = await fetch(detailsUrl);
      
      if (!response.ok) {
        throw new Error(`Video details API error: ${response.status}`);
      }

      const data: YouTubeVideoDetailsResponse = await response.json();

      const details: Record<string, { viewCount: string; duration: string }> = {};
      
      if (data.items && Array.isArray(data.items)) {
        const videoIdArray = videoIds.split(',');
        data.items.forEach((item, index) => {
          const videoId = videoIdArray[index];
          if (item && item.statistics && item.contentDetails && videoId) {
            details[videoId] = {
              viewCount: item.statistics.viewCount || '0',
              duration: item.contentDetails.duration || 'PT0S'
            };
          }
        });
      }

      return details;
    } catch (error) {
      console.error('Error fetching video details:', error);
      return {};
    }
  }

  private static async getChannelIcons(channelIds: string[]): Promise<Record<string, string>> {
    try {
      if (!channelIds || channelIds.length === 0) {
        return {};
      }

      const channelUrl = `${this.BASE_URL}/channels?` +
        `part=snippet&` +
        `id=${channelIds.join(',')}&` +
        `key=${this.API_KEY}`;

      const response = await fetch(channelUrl);
      
      if (!response.ok) {
        throw new Error(`Channel API error: ${response.status}`);
      }

      const data: YouTubeChannelResponse = await response.json();

      const icons: Record<string, string> = {};
      
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item, index) => {
          const channelId = channelIds[index];
          if (item && item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.default) {
            icons[channelId] = item.snippet.thumbnails.default.url;
          }
        });
      }

      return icons;
    } catch (error) {
      console.error('Error fetching channel icons:', error);
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
      },
      {
        id: '5',
        title: "Learn Colors with Blippi | Educational Videos for Kids",
        channel: "Blippi",
        channelId: "UCPlwHry6Ew6-8zTtXnBuNwg",
        views: "2.8M views",
        publishedAt: "2 weeks ago",
        youtubeId: "KqS7t_tjDSc",
        thumbnail: "https://i.ytimg.com/vi/KqS7t_tjDSc/hqdefault.jpg",
        channelIcon: "https://yt3.ggpht.com/ytc/AKedOLSKx4VgYmQqQjl7QGIoZKKedOLSKx4VgYmQqQjl7QGIoZKK=s88-c-k-c0x00ffffff-no-rj",
        description: "Learn colors with Blippi in this fun educational video",
        duration: "15:30"
      }
    ];
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
      
      // TODO: Re-enable API calls later once basic functionality works
      /*
      // Check if we have cached videos that are still fresh
      const now = Date.now();
      if (this.videoCache.length > 0 && (now - this.lastCacheTime) < this.CACHE_DURATION) {
        console.log('Using cached videos');
        return this.videoCache.slice(0, maxResults);
      }

      console.log('Fetching fresh videos from API');
      
      // Try to get videos from a popular kids search term first
      const randomSearchTerm = this.getRandomKidsSearchTerm();
      console.log(`Searching for: ${randomSearchTerm}`);
      
      let videos = await this.searchKidsVideos(randomSearchTerm, maxResults);
      
      if (videos.length === 0) {
        // If search fails, try getting videos from a specific channel
        const randomChannel = this.KIDS_CHANNELS[Math.floor(Math.random() * this.KIDS_CHANNELS.length)];
        console.log(`Trying channel: ${randomChannel}`);
        videos = await this.getVideosByChannel(randomChannel, maxResults);
      }
      
      if (videos.length === 0) {
        console.log('API failed, using fallback videos');
        videos = this.getFallbackVideos();
      }
      
      // Cache the videos for future use
      if (videos.length > 0) {
        this.videoCache = videos;
        this.lastCacheTime = now;
        console.log(`Cached ${videos.length} videos`);
      }
      
      return videos;
      */
    } catch (error) {
      console.error('Error in getRandomKidsVideos:', error);
      return this.getFallbackVideos();
    }
  }
}

export { YouTubeKidsService, YouTubeVideo };

