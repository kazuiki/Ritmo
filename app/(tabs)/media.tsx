import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import type { YouTubeVideo } from "../../src/youtubeKidsService";
import { YouTubeKidsService } from "../../src/youtubeKidsService";

type PlayerState =
  | "unstarted"
  | "playing"
  | "paused"
  | "ended"
  | "buffering"
  | "cued";

export default function Media() {
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  // Clear all parental lock authentication when navigating to MEDIA
  useFocusEffect(
    React.useCallback(() => {
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  // Load initial videos
  useEffect(() => {
    loadVideos();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (search.trim()) {
        searchVideos(search.trim());
      } else {
        loadVideos();
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [search]);

  const loadVideos = async () => {
    console.log('=== loadVideos called ===');
    try {
      setError(null);
      console.log('Calling YouTubeKidsService.getRandomKidsVideos...');
      const fetchedVideos = await YouTubeKidsService.getRandomKidsVideos(20);
      console.log('Fetched videos:', fetchedVideos);
      console.log('Number of videos:', fetchedVideos.length);
      setVideos(fetchedVideos);
      console.log('Videos set in state');
    } catch (err) {
      console.error('Error in loadVideos:', err);
      setError('Failed to load videos. Please check your internet connection.');
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const searchVideos = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await YouTubeKidsService.searchKidsVideos(query, 15);
      setVideos(searchResults);
    } catch (err) {
      setError('Failed to search videos. Please try again.');
      console.error('Error searching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSearch(""); // Clear search when refreshing
    await loadVideos();
    setRefreshing(false);
  };

  const filteredVideos = videos;

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/ritmoNameLogo.png")}
          style={styles.brandLogo}
        />
      </View>

      {/* 🔍 Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* 📺 Video List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5A8F8A" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {(() => {
          console.log('Render check:', { loading, error: !!error, videosLength: filteredVideos.length, videos: filteredVideos });
          return null;
        })()}
        {!loading && !error && filteredVideos.map((video) => (
          <View key={video.id} style={styles.videoContainer}>
            {playingId === video.id ? (
              <YoutubePlayer
                height={200}
                play={true}
                videoId={video.youtubeId}
                onChangeState={(event: PlayerState) => {
                  if (event === "ended") setPlayingId(null);
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setPlayingId(video.id)}>
                <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                <View style={styles.playButton}>
                  <Ionicons name="play-circle" size={64} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {/* 📝 Video Description */}
            <View style={styles.videoInfo}>
              <Image source={{ uri: video.channelIcon }} style={styles.channelIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.videoMeta}>
                  {video.channel} • {video.views} • {video.publishedAt}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={18} color="#666" />
            </View>
          </View>
        ))}

        {!loading && !error && filteredVideos.length === 0 && (
          <Text style={styles.noResults}>No videos found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  brandLogo: {
    width: 120,
    height: 30,
    resizeMode: "contain",
    marginLeft: -22,
    marginTop: -20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#000",
  },
  videoContainer: {
    backgroundColor: "#fafafa",
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    backgroundColor: "#ccc",
  },
  playButton: {
    position: "absolute",
    top: "35%",
    left: "38%",
    opacity: 0.9,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  videoMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  noResults: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontFamily: "ITIM",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontFamily: "ITIM",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#5A8F8A",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
  },
});
