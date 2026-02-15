import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const PAGES = [
  {
    id: 1,
    title: "Welcome to Ritmo!",
    description: "Your account has been successfully created.\n\nLet's get started on your child's journey to developing their daily RITMO.",
    image: require("../assets/ritmo-logo.png"),
    buttonLabel: "",
    showButton: false,
  },
  {
    id: 2,
    title: "Ritmo for Autism",
    description: "Made to empower children of\nAutism Spectrum to develop\ntheir daily RITMO.",
    image: require("../assets/ritmo-logo.png"),
    buttonLabel: "What is Ritmo?",
    showButton: true,
  },
  {
    id: 3,
    title: "How Ritmo Works",
    description: "Track your child daily and weekly\nroutines to support progress.",
    image: require("../assets/images/BoyQ.png"),
    buttonLabel: "How Ritmo works?",
    showButton: true,
  },
  {
    id: 4,
    title: "Ritmo is Fun",
    description: "Enhance child engagement with\ninteractive games and audio-visual\nbook guides.",
    images: [
      require("../assets/images/Book.png"),
      require("../assets/images/Game.png"),
    ],
    buttonLabel: "Ritmo is Fun",
    showButton: true,
  },
  {
    id: 5,
    title: "Ritmo with Parents",
    description: "Parents are advised to guide and\nsupervise children when using Ritmo.",
    image: require("../assets/images/Parents.png"),
    buttonLabel: "Ritmo Parent",
    showButton: true,
  },
  {
    id: 6,
    title: "Ritmo with Therapist",
    description: "Ritmo provides therapists with\nPDF reports detailing the child's\nprogress.",
    image: require("../assets/images/Therapist.png"),
    buttonLabel: "Ritmo Therapist",
    showButton: true,
  },
];

export default function InstructionPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoSource, setCurrentVideoSource] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const videoRef = useRef<Video>(null);
  const dotAnimations = useRef(PAGES.map(() => new Animated.Value(10))).current;
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  useEffect(() => {
    // Initialize first dot as active
    dotAnimations[0].setValue(30);
  }, []);

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({ x: nextPage * width, animated: true });
    } else if (currentPage === PAGES.length - 1) {
      // Last page (Therapist), navigate to child-nickname
      router.push("/auth/child-nickname");
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      scrollViewRef.current?.scrollTo({ x: prevPage * width, animated: true });
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage) {
      setCurrentPage(page);
      // Animate dots with smoother transition
      dotAnimations.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: index === page ? 30 : 10,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const handleVideoButton = (videoNumber: number) => {
    const videoSources = [
      require("../assets/Tutorials/1.mp4"),
      require("../assets/Tutorials/2.mp4"),
      require("../assets/Tutorials/3.mp4"),
      require("../assets/Tutorials/4.mp4"),
      require("../assets/Tutorials/5.mp4"),
    ];
    setCurrentVideoSource(videoSources[videoNumber - 1]);
    setVideoModalVisible(true);
  };

  const handleCloseVideo = () => {
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    setVideoModalVisible(false);
    setCurrentVideoSource(null);
  };

  const renderPage = (page: typeof PAGES[0]) => {
    return (
      <View
        key={page.id}
        style={[
          styles.pageContainer,
          { paddingBottom: Math.max(height * 0.18, 140) + insets.bottom }
        ]}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          {page.images ? (
            <View style={styles.multiImageContainer}>
              {page.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={img}
                  style={styles.smallImage}
                  resizeMode="contain"
                />
              ))}
            </View>
          ) : page.image ? (
            <Image source={page.image} style={styles.mainImage} resizeMode="contain" />
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{page.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{page.description}</Text>

        {/* Video Button (anchored for consistent alignment) */}
        {page.showButton && (
          <View
            style={[
              styles.videoButtonWrapper,
              { bottom: Math.max(height * 0.18, 120) + insets.bottom }
            ]}
          >
            <TouchableOpacity 
              style={styles.videoButton} 
              onPress={() => handleVideoButton(page.id - 1)}
            >
              <Image
                source={require("../assets/images/WhitePlay.png")}
                style={styles.playIcon}
                resizeMode="contain"
              />
              <Text style={styles.videoButtonText}>{page.buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#E8FFFA' }} edges={['top', 'left', 'right', 'bottom']}>
      <ImageBackground
        source={require("../assets/background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.container}>
        {/* Header with Back and Next */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          {currentPage > 0 && (
            <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
              <Text style={styles.headerButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {currentPage === 0 && <View style={styles.headerButton} />}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNext}
          >
            <Text style={styles.headerButtonText}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Pages */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {PAGES.map((page) => renderPage(page))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={[styles.pagination, { bottom: Math.max(16, insets.bottom + 12) }]}>
          {PAGES.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotAnimations[index],
                  opacity: index === currentPage ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleCloseVideo}
          >
            <Text style={styles.modalCloseText}>Skip</Text>
          </TouchableOpacity>
          <View style={styles.videoModalContainer}>
            {currentVideoSource && (
              <Video
                ref={videoRef}
                source={currentVideoSource}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    handleCloseVideo();
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 50,
    paddingHorizontal: 0,
    zIndex: 10,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButtonDisabled: {
    opacity: 0.3,
  },
  headerButtonText: {
    fontSize: 22,
    color: "#2A3B4D",
    fontFamily: "Fredoka_600SemiBold",
    textDecorationLine: "underline",
  },
  headerButtonTextDisabled: {
    color: "#999",
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: width,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 120,
    paddingBottom: 170,
    position: "relative",
  },
  imageContainer: {
    height: height * 0.35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mainImage: {
    width: width * 0.65,
    height: height * 0.35,
  },
  multiImageContainer: {
    flexDirection: "row",
    gap: 30,
    alignItems: "center",
  },
  smallImage: {
    width: width * 0.35,
    height: height * 0.25,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#2A3B4D",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "Fredoka_700Bold",
  },
  description: {
    fontSize: 18,
    color: "#2A3B4D",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 35,
    fontFamily: "Fredoka_600SemiBold",
  },
  videoButton: {
    backgroundColor: "#00A980",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  videoButtonWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 200,
    alignItems: "center",
  },
  playIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFFFFF",
  },
  videoButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_700Bold",
  },
  pagination: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2A3B4D",
  },
  dotInactive: {
    width: 10,
    opacity: 0.3,
  },
  dotActive: {
    width: 30,
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoModalContainer: {
    width: width,
    height: height * 0.85,
    backgroundColor: "#000",
    borderRadius: 0,
    overflow: "hidden",
    padding: 0,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
  },
  modalText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2A3B4D",
    marginBottom: 20,
    fontFamily: "Fredoka_700Bold",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#00A980",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  modalCloseText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
  },
});
