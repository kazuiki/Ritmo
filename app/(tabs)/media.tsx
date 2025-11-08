import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";

type PlayerState =
  | "unstarted"
  | "playing"
  | "paused"
  | "ended"
  | "buffering"
  | "cued";

export default function Media() {
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

  // Clear all parental lock authentication when navigating to MEDIA
  useFocusEffect(
    React.useCallback(() => {
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  const videos = [
    {
      id: 1,
      title: "Baby Learning With Ms Rachel - First Words, Songs",
      channel: "Ms Rachel - Toddler Learning",
      views: "3.2M views",
      time: "2 weeks ago",
      youtubeId: "hTqtGJwsJVE",
      thumbnail: "https://i.ytimg.com/vi/hTqtGJwsJVE/hqdefault.jpg",
      channelIcon:
        "https://yt3.ggpht.com/ytc/AKedOLR3-yTrDr1lF_8aQ2Y7Y5YjYHqjN6qz7R43O1OeFw=s88-c-k-c0x00ffffff-no-rj",
    },
    {
      id: 2,
      title: "Baby's First Words with Ms Rachel - Videos for Babies",
      channel: "Ms Rachel - Toddler Learning",
      views: "2.1M views",
      time: "1 month ago",
      youtubeId: "zwL2o4jZxbc",
      thumbnail: "https://i.ytimg.com/vi/zwL2o4jZxbc/hqdefault.jpg",
      channelIcon:
        "https://yt3.ggpht.com/ytc/AKedOLR3-yTrDr1lF_8aQ2Y7Y5YjYHqjN6qz7R43O1OeFw=s88-c-k-c0x00ffffff-no-rj",
    },
    {
      id: 3,
      title: "Baby Sign Language Basics and Baby First Words - Ms Rachel",
      channel: "Ms Rachel - Toddler Learning",
      views: "1.8M views",
      time: "2 months ago",
      youtubeId: "glDJI7UKfbw",
      thumbnail: "https://i.ytimg.com/vi/glDJI7UKfbw/hqdefault.jpg",
      channelIcon:
        "https://yt3.ggpht.com/ytc/AKedOLR3-yTrDr1lF_8aQ2Y7Y5YjYHqjN6qz7R43O1OeFw=s88-c-k-c0x00ffffff-no-rj",
    },
  ];

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {filteredVideos.map((video) => (
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
                  {video.channel} • {video.views} • {video.time}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={18} color="#666" />
            </View>
          </View>
        ))}

        {filteredVideos.length === 0 && (
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
});
