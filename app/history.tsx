import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../src/supabaseClient";

export default function History() {
  const router = useRouter();
  const [childName, setChildName] = useState<string>("");
  const [showSort, setShowSort] = useState(false);
  const [renderButtons, setRenderButtons] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // default latest first
  const [ascAnim] = useState(new Animated.Value(0));
  const [descAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (showSort) {
      // Show buttons immediately when opening
      setRenderButtons(true);
      
      // Reset to 0 first, then animate
      ascAnim.setValue(0);
      descAnim.setValue(0);
      
      // Staggered appearance: Asc first, then Desc
      Animated.sequence([
        Animated.timing(ascAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(descAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderButtons) {
      // Only animate closing if buttons are rendered
      // Reset to 1 first before closing animation
      ascAnim.setValue(1);
      descAnim.setValue(1);
      
      // Staggered disappearance: Desc first, then Asc
      Animated.sequence([
        Animated.timing(descAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(ascAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide buttons after animation completes
        setRenderButtons(false);
      });
    }
  }, [showSort]);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const meta = (user.user_metadata ?? {}) as any;
          setChildName(meta?.child_name ?? "");
        }
      } catch (e) {
        // noop
      }
    };
    load();
  }, []);

  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);

  // Fetch user creation date - always use account creation as the base
  useEffect(() => {
    const fetchUserCreationDate = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.created_at) {
          // Always use account creation date to show all history since account was created
          setUserCreatedAt(new Date(user.created_at));
        }
      } catch (e) {
        console.error('Failed to fetch user creation date:', e);
      }
    };
    fetchUserCreationDate();
  }, []);

  // Compute week ranges from user creation date to current week
  const weeks = useMemo(() => {
    if (!userCreatedAt) return [];
    
    const result: { start: Date; end: Date }[] = [];
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = current.getDay(); // 0 Sun .. 6 Sat
    // Compute Monday of current week
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const currentMonday = new Date(current);
    currentMonday.setDate(current.getDate() + diffToMonday);
    
    // Compute Monday of the week when user was created
    const createdDate = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
    const createdDay = createdDate.getDay();
    const diffToCreatedMonday = createdDay === 0 ? -6 : 1 - createdDay;
    const firstMonday = new Date(createdDate);
    firstMonday.setDate(createdDate.getDate() + diffToCreatedMonday);
    
    // Generate all weeks from first Monday to current Monday
    let weekMonday = new Date(firstMonday);
    while (weekMonday <= currentMonday) {
      const start = new Date(weekMonday);
      const end = new Date(weekMonday);
      end.setDate(weekMonday.getDate() + 6);
      result.push({ start, end });
      weekMonday.setDate(weekMonday.getDate() + 7);
    }
    
    return result;
  }, [userCreatedAt]);

  const sortedWeeks = useMemo(() => {
    const copy = [...weeks];
    copy.sort((a, b) => (sortOrder === "asc" ? a.start.getTime() - b.start.getTime() : b.start.getTime() - a.start.getTime()));
    return copy;
  }, [weeks, sortOrder]);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  };

  const onPickSort = (order: "asc" | "desc") => {
    setSortOrder(order);
    setShowSort(false);
  };

  // Custom slide animation container (replicates playbook modal feel)
  const slideX = useMemo(() => new Animated.Value(400), []);
  useEffect(() => {
    // animate in on mount
    Animated.timing(slideX, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(slideX, { toValue: 400, duration: 300, useNativeDriver: true }).start(() => {
      router.back();
    });
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: slideX }] }}>
      <Image
        source={require("../assets/background.png")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Top bar: Back + Title + Sort */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backTextLink}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {sortedWeeks.map((w, idx) => {
          // Format as YYYY-MM-DD to avoid timezone issues
          const year = w.start.getFullYear();
          const month = String(w.start.getMonth() + 1).padStart(2, '0');
          const day = String(w.start.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          return (
            <TouchableOpacity
              key={`${dateStr}-${idx}`}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: "/history/[week]", params: { week: dateStr, start: dateStr } })}
              style={styles.card}
            >
            <View style={styles.cardLine}>
              <Text style={styles.cardLabelInline}>For:</Text>
              <Text style={styles.cardValueInline}>{childName || "—"}</Text>
            </View>
            <View style={styles.cardLine}>
              <Text style={styles.cardLabelInline}>Week of:</Text>
              <Text style={styles.cardValueInline}>{`${formatDate(w.start)} - ${formatDate(w.end)}`}</Text>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort button and dropdown overlay positioned above the list */}
      <View style={styles.dropdownOverlay}>
        <View style={styles.dropdownRow}>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSort((s) => !s)}>
            <Text style={styles.sortLabel}>Sort</Text>
            <Image source={require("../assets/images/sort.png")} style={styles.sortIcon} />
          </TouchableOpacity>
          {renderButtons && (
            <>
              <Animated.View style={{ opacity: ascAnim, transform: [{ translateY: ascAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => onPickSort("asc")}>
                  <Text style={styles.dropdownOptionLabel}>Asc</Text>
                  <Image source={require("../assets/images/asc.png")} style={styles.dropdownOptionIcon} />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ opacity: descAnim, transform: [{ translateY: descAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => onPickSort("desc")}>
                  <Text style={styles.dropdownOptionLabel}>Desc</Text>
                  <Image source={require("../assets/images/desc.png")} style={styles.dropdownOptionIcon} />
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </View>
      </View>

      {/* end sort dropdown */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingHorizontal: 16 },
  brandLogo: { width: 120, height: 30, resizeMode: "contain", marginLeft: -22, marginTop: -20 },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backTextLink: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
    alignSelf: "flex-start",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    marginBottom: 8,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#2A3B4D" },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    width: 100,
    height: 28,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  sortLabel: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  sortIcon: { width: 16, height: 16, resizeMode: "contain" },

  // Dropdown overlay positioned absolutely over the list
  dropdownOverlay: {
    position: 'absolute',
    top: 70,
    right: 16,
    zIndex: 10,
  },
  dropdownRow: {
    alignItems: 'flex-end',
    gap: 8,
  },
  dropdownOption: {
    width: 100,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  dropdownOptionLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  dropdownOptionIcon: { width: 16, height: 16, resizeMode: 'contain' },

  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cardLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 4,
  },
  cardLabel: { fontSize: 14, color: "#2A3B4D", marginBottom: 6, fontWeight: "700" },
  cardValue: { fontWeight: "500", color: "#2A3B4D" },
  cardLabelInline: { fontSize: 14, color: '#2A3B4D', fontWeight: '700' },
  cardValueInline: { fontSize: 14, color: '#2A3B4D', flexShrink: 1, flexWrap: 'wrap' },

  // old modal styles removed
});
