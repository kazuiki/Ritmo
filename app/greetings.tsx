// app/greeting.tsx
import {
  Fredoka_400Regular,
  Fredoka_600SemiBold,
  useFonts,
} from "@expo-google-fonts/fredoka";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../src/supabaseClient";

export default function Greeting() {
  const [name, setName] = useState<string>("Kid");
  const [isExiting, setIsExiting] = useState(false);
  const [isEvening, setIsEvening] = useState(false);

  // Check time: 6 AM - 5:59 PM = Good Day, 6 PM - 5:59 AM = Good Evening
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      const evening = hour >= 18 || hour < 6;
      console.log(`Current hour: ${hour}, Is Evening: ${evening}`);
      setIsEvening(evening);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const sunImages = [
    require("../assets/images/sun1.png"),
    require("../assets/images/sun2.png"),
    require("../assets/images/sun3.png"),
    require("../assets/images/sun4.png"),
  ];
  
  const moonImages = [
    require("../assets/images/moon1.png"),
    require("../assets/images/moon2.png"),
    require("../assets/images/moon3.png"),
  ];

  const [celestialIndex, setCelestialIndex] = useState(0);

  const translateY = useRef(new Animated.Value(600)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const fadeText = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  // Falling icons for Good Day
  const fallingIconsAnimations = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      translateY: new Animated.Value(-100 - Math.random() * 200),
      translateX: Math.random() * 400,
      icon: ["⭐", "🎵", "🎨", "✨", "💫", "🌟", "🎭", "🎪"][Math.floor(Math.random() * 8)],
      duration: 4000 + Math.random() * 3000,
      delay: Math.random() * 100, 
      size: 13 + Math.random() * 12,
    }))
  ).current;

  // Sparkling stars for Good Evening
  const sparklingStarsAnimations = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      opacity: new Animated.Value(Math.random()),
      top: Math.random() * 800,
      left: Math.random() * 400,
      size: 6 + Math.random() * 10, 
      duration: 1000 + Math.random() * 2000,
      delay: Math.random() * 100,
    }))
  ).current;

  // Shooting stars for Good Evening
  const shootingStarsAnimations = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      translateX: new Animated.Value(-200),
      translateY: new Animated.Value(-200 - Math.random() * 300),
      top: Math.random() * 700, 
      left: Math.random() * 300, 
      duration: 1500 + Math.random() * 1000,
      delay: Math.random() * 3000,
    }))
  ).current;

  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta = (data?.user?.user_metadata ?? {}) as any;
      setName(meta?.child_name ?? "Kid");
    })();
  }, []);

  useEffect(() => {
    Animated.timing(fadeText, {
      toValue: 1,
      duration: 600,
      delay: 400, 
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1200, 
        easing: Easing.bezier(0.22, 1, 0.36, 1), 
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.5,
        duration: 1200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const currentImages = isEvening ? moonImages : sunImages;
    const interval = setInterval(() => {
      setCelestialIndex((prev) => {
        const nextIndex = (prev + 1) % currentImages.length;
        return nextIndex;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isEvening]);

  // Reset celestial index when switching between day/evening
  useEffect(() => {
    setCelestialIndex(0);
  }, [isEvening]);

  // Falling icons animation for Good Day
  useEffect(() => {
    if (isEvening) return; // Only run for Good Day
    
    const animations = fallingIconsAnimations.map((icon) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(icon.delay),
          Animated.timing(icon.translateY, {
            toValue: 900,
            duration: icon.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(icon.translateY, {
            toValue: -100 - Math.random() * 200,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [isEvening]);

  // Sparkling stars animation for Good Evening
  useEffect(() => {
    if (!isEvening) return; // Only run for Good Evening
    
    const animations = sparklingStarsAnimations.map((star) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay),
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: star.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.2,
            duration: star.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [isEvening]);

  // Shooting stars animation for Good Evening
  useEffect(() => {
    if (!isEvening) return; // Only run for Good Evening
    
    const animations = shootingStarsAnimations.map((star) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay),
          Animated.parallel([
            Animated.timing(star.translateX, {
              toValue: 500,
              duration: star.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(star.translateY, {
              toValue: 800,
              duration: star.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(star.translateX, {
            toValue: -200,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(star.translateY, {
            toValue: -200 - Math.random() * 300,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [isEvening]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleExit();
    }, 15000); 
    return () => clearTimeout(timer);
  }, []);

  const handleExit = () => {
    if (isExiting) return; 
    setIsExiting(true);

    Animated.parallel([
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace("/(tabs)/home");
    });
  };


  const handleCelestialTap = () => {
    // When clicked, show moon2 (surprised) or sun2
    setCelestialIndex(1);
  };

  const currentImages = isEvening ? moonImages : sunImages;
  const currentBackground = isEvening 
    ? require("../assets/evening.png") 
    : require("../assets/Success.png");
  const greetingText = isEvening ? "Good Evening" : "Good Day";

  return (
    <Animated.View style={{ flex: 1, opacity: fadeOut }}>
      <ImageBackground
        source={currentBackground}
        style={styles.container}
      >
        {/* Good Day: Falling icons */}
        {!isEvening && fallingIconsAnimations.map((icon) => (
          <Animated.Text
            key={icon.id}
            style={[
              styles.fallingIcon,
              {
                left: icon.translateX,
                fontSize: icon.size,
                transform: [{ translateY: icon.translateY }],
              },
            ]}
          >
            {icon.icon}
          </Animated.Text>
        ))}

        {/* Good Evening: Sparkling stars */}
        {isEvening && sparklingStarsAnimations.map((star) => (
          <Animated.Text
            key={star.id}
            style={[
              styles.sparklingStar,
              {
                top: star.top,
                left: star.left,
                fontSize: star.size,
                opacity: star.opacity,
              },
            ]}
          >
            ✨
          </Animated.Text>
        ))}

        {/* Good Evening: Shooting stars */}
        {isEvening && shootingStarsAnimations.map((star) => (
          <Animated.View
            key={star.id}
            style={[
              styles.shootingStar,
              {
                top: star.top,
                left: star.left, // Add left positioning
                transform: [
                  { translateX: star.translateX },
                  { translateY: star.translateY },
                ],
              },
            ]}
          >
            <Text style={styles.shootingStarText}>💫</Text>
          </Animated.View>
        ))}

        <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleCelestialTap}>
            <Image 
              source={currentImages[celestialIndex]} 
              style={styles.sun} 
              resizeMode="contain" 
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: fadeText, alignItems: "center", width: '100%', paddingHorizontal: 20 }}>
          <Text style={styles.greetingText}>{greetingText}</Text>
          <Text style={styles.nameText} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
          <Pressable onPress={handleExit}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: -60 },
  fallingIcon: { position: "absolute", top: 0, opacity: 0.7 },
  sparklingStar: { position: "absolute" },
  shootingStar: { position: "absolute" },
  shootingStarText: { fontSize: 16, opacity: 0.8 },
  sun: { width: 300, height: 300 },
  greetingText: { 
    fontFamily: "Fredoka_600SemiBold", 
    fontSize: 34, 
    marginTop: -20, 
    color: "#2A3B4D",
    textAlign: "center",
  },
  nameText: { 
    fontFamily: "Fredoka_600SemiBold", 
    fontSize: 46, 
    textDecorationLine: "underline", 
    marginVertical: 10, 
    color: "#1F3A7A",
    textAlign: "center",
    maxWidth: '90%',
  },
  nextText: { 
    marginTop: 80, 
    fontFamily: "Fredoka_400Regular", 
    fontSize: 22, 
    color: "#2A3B4D", 
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
