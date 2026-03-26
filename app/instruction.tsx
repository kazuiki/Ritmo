import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Asset } from "expo-asset";
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
  useWindowDimensions,
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const isLargeTablet = windowWidth >= 1024;
  const isCompactHeight = windowHeight < 780;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const contentMaxWidth = isLargeTablet
    ? Math.min(windowWidth * 0.82, 900)
    : isTablet
      ? Math.min(windowWidth * 0.86, 760)
      : Math.min(windowWidth * 0.92, 560);
  const imageSectionHeight = isTablet
    ? clamp(windowHeight * 0.34, 260, 430)
    : clamp(windowHeight * (isCompactHeight ? 0.27 : 0.32), 200, 340);
  const pageHorizontalPadding = isTablet ? (isLargeTablet ? 72 : 56) : windowWidth < 380 ? 24 : 36;
  const topReserved = insets.top + (isTablet ? 64 : 58);
  const bottomReserved = insets.bottom + (isTablet ? 68 : 62);
  const pageTopPadding = topReserved + (isCompactHeight ? 18 : 24);
  const pageBottomPadding = bottomReserved + (isCompactHeight ? 20 : 28);
  const titleFontSize = isLargeTablet ? 44 : isTablet ? 40 : clamp(windowWidth * 0.088, 30, 36);
  const titleMarginBottom = isTablet ? 16 : (isCompactHeight ? 10 : 12);
  const descriptionFontSize = isLargeTablet ? 24 : isTablet ? 21 : clamp(windowWidth * 0.046, 16, 19);
  const descriptionLineHeight = isLargeTablet ? 34 : isTablet ? 31 : clamp(descriptionFontSize * 1.5, 24, 29);
  const headerButtonFontSize = isTablet ? 26 : 22;
  const headerButtonMaxWidth = isTablet ? 120 : 80;
  const buttonFontSize = isTablet ? 18 : clamp(windowWidth * 0.043, 15, 17);
  const playIconSize = isTablet ? 22 : 20;
  const [currentPage, setCurrentPage] = useState(0);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoSource, setCurrentVideoSource] = useState<any>(null);
  const [videoSources, setVideoSources] = useState<any[]>([]);
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

  useEffect(() => {
    const preloadVideos = async () => {
      const modules = [
        require("../assets/Tutorials/1.mp4"),
        require("../assets/Tutorials/2.mp4"),
        require("../assets/Tutorials/3.mp4"),
        require("../assets/Tutorials/4.mp4"),
        require("../assets/Tutorials/5.mp4"),
      ];

      const resolved = await Promise.all(
        modules.map(async (moduleId) => {
          try {
            const asset = Asset.fromModule(moduleId);
            await asset.downloadAsync();
            if (asset.localUri) {
              return { uri: asset.localUri };
            }
          } catch {
            // Fall back to bundled module source.
          }
          return moduleId;
        })
      );

      setVideoSources(resolved);
    };

    preloadVideos();
  }, []);

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({ x: nextPage * windowWidth, animated: true });
    } else if (currentPage === PAGES.length - 1) {
      // Last page (Therapist), navigate to child-nickname
      router.push("/auth/child-nickname");
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      scrollViewRef.current?.scrollTo({ x: prevPage * windowWidth, animated: true });
    } else {
      if (router.canGoBack()) {
        router.back();
      }
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / windowWidth);
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
    const fallbackSources = [
      require("../assets/Tutorials/1.mp4"),
      require("../assets/Tutorials/2.mp4"),
      require("../assets/Tutorials/3.mp4"),
      require("../assets/Tutorials/4.mp4"),
      require("../assets/Tutorials/5.mp4"),
    ];
    setCurrentVideoSource(videoSources[videoNumber - 1] ?? fallbackSources[videoNumber - 1]);
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
    const mainImageWidth = isTablet
      ? Math.min(contentMaxWidth * 0.58, 420)
      : windowWidth * (windowWidth < 380 ? 0.62 : 0.66);
    const smallImageWidth = isTablet
      ? Math.min(contentMaxWidth * 0.28, 220)
      : windowWidth * (windowWidth < 380 ? 0.32 : 0.34);

    return (
      <View
        key={page.id}
        style={[
          styles.pageContainer,
          {
            width: windowWidth,
            paddingHorizontal: pageHorizontalPadding,
            paddingTop: pageTopPadding,
            paddingBottom: pageBottomPadding,
          }
        ]}
      >
        <View style={[styles.pageContent, { maxWidth: contentMaxWidth }]}>
        {/* Image Section */}
        <View style={[styles.imageContainer, { height: imageSectionHeight }]}>
          {page.images ? (
            <View style={styles.multiImageContainer}>
              {page.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={img}
                  style={[
                    styles.smallImage,
                    {
                      width: smallImageWidth,
                      height: imageSectionHeight * 0.72,
                    },
                  ]}
                  resizeMode="contain"
                />
              ))}
            </View>
          ) : page.image ? (
            <Image
              source={page.image}
              style={[
                styles.mainImage,
                {
                  width: mainImageWidth,
                  height: imageSectionHeight,
                },
              ]}
              resizeMode="contain"
            />
          ) : null}
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: titleFontSize, marginBottom: titleMarginBottom }]}>{page.title}</Text>

        {/* Description */}
        <Text
          style={[
            styles.description,
            {
              fontSize: descriptionFontSize,
              lineHeight: descriptionLineHeight,
              marginBottom: page.showButton ? (isTablet ? 30 : (isCompactHeight ? 20 : 24)) : 0,
            },
          ]}
        >
          {page.description}
        </Text>

        {/* Video Button */}
        {page.showButton && (
          <View style={styles.videoButtonWrapper}>
            <TouchableOpacity 
              style={[
                styles.videoButton,
                {
                  paddingVertical: isTablet ? 14 : 12,
                  paddingHorizontal: isTablet ? 30 : 24,
                  gap: isTablet ? 12 : 10,
                },
              ]}
              onPress={() => handleVideoButton(page.id - 1)}
            >
              <Image
                source={require("../assets/images/WhitePlay.png")}
                style={[styles.playIcon, { width: playIconSize, height: playIconSize }]}
                resizeMode="contain"
              />
              <Text style={[styles.videoButtonText, { fontSize: buttonFontSize }]}>{page.buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
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
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              paddingHorizontal: pageHorizontalPadding,
            },
          ]}
        >
          {currentPage > 0 && (
            <TouchableOpacity style={[styles.headerButton, { maxWidth: headerButtonMaxWidth }]} onPress={handleBack}>
              <Text 
                style={[styles.headerButtonText, { fontSize: headerButtonFontSize }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                allowFontScaling={false}
              >
                Back
              </Text>
            </TouchableOpacity>
          )}
          {currentPage === 0 && <View style={[styles.headerButton, { maxWidth: headerButtonMaxWidth }]} />}
          <TouchableOpacity
            style={[styles.headerButton, { maxWidth: headerButtonMaxWidth }]}
            onPress={handleNext}
          >
            <Text 
              style={[styles.headerButtonText, { fontSize: headerButtonFontSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              allowFontScaling={false}
            >
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
          <View
            style={[
              styles.videoModalContainer,
              { width: windowWidth, height: windowHeight * 0.85 },
            ]}
          >
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
    maxWidth: 80,
  },
  headerButtonDisabled: {
    opacity: 0.3,
  },
  headerButtonText: {
    fontSize: 22,
    color: "#2A3B4D",
    fontFamily: "Fredoka_600SemiBold",
    textDecorationLine: "underline",
    minWidth: 0,
  },
  headerButtonTextDisabled: {
    color: "#999",
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  pageContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
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
    width: "100%",
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
