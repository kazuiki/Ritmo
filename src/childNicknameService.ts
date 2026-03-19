import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const LOCAL_CHILD_NAME_KEY = "@ritmo_local_child_name";

/**
 * Fetch child nickname from local storage or Supabase
 * Priority: Local storage → Supabase user metadata → default "Kid"
 */
export async function getChildNickname(): Promise<string> {
  try {
    // 1. Try local storage first (fastest)
    const localName = await AsyncStorage.getItem(LOCAL_CHILD_NAME_KEY);
    if (localName?.trim()) {
      return localName.trim();
    }

    // 2. Try fetching from Supabase user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("Could not fetch user from Supabase");
      return "Kid";
    }

    const childName = (user.user_metadata?.child_name as string) || "Kid";
    
    // 3. Save to local storage for future use (sync to this device)
    if (childName !== "Kid") {
      await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, childName);
    }

    return childName;
  } catch (error) {
    console.error("Error fetching child nickname:", error);
    return "Kid";
  }
}

/**
 * Save child nickname to both local storage and Supabase
 */
export async function saveChildNickname(nickname: string): Promise<boolean> {
  try {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return false;

    // 1. Save to local storage
    await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, trimmedNickname);

    // 2. Update Supabase user metadata
    const { error } = await supabase.auth.updateUser({
      data: { child_name: trimmedNickname },
    });

    if (error) {
      console.error("Error saving to Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving child nickname:", error);
    return false;
  }
}
