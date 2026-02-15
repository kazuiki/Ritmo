import { supabase } from "./supabaseClient";

export type BlockedWord = {
  id: number;
  user_id: string;
  word: string;
  created_at: string;
  updated_at: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
}

export async function getBlockedWords(): Promise<string[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("blocked_words")
      .select("word")
      .eq("user_id", userId)
      .order("word", { ascending: true });
    
    if (error) throw error;
    return (data || []).map(row => row.word);
  } catch (err) {
    console.warn("Failed to load blocked words from database:", err);
    return [];
  }
}

export async function addBlockedWord(word: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const normalizedWord = word.toLowerCase().trim();
    
    const { error } = await supabase
      .from("blocked_words")
      .insert({ 
        user_id: userId, 
        word: normalizedWord 
      });
    
    if (error) throw error;
  } catch (err) {
    console.error("Failed to add blocked word:", err);
    throw err;
  }
}

export async function removeBlockedWord(word: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from("blocked_words")
      .delete()
      .eq("user_id", userId)
      .eq("word", word);
    
    if (error) throw error;
  } catch (err) {
    console.error("Failed to remove blocked word:", err);
    throw err;
  }
}

export async function clearBlockedWords(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from("blocked_words")
      .delete()
      .eq("user_id", userId);
    
    if (error) throw error;
  } catch (err) {
    console.error("Failed to clear blocked words:", err);
    throw err;
  }
}

export function subscribeToBlockedWords(
  callback: (words: string[]) => void
): (() => void) {
  let channel: any;

  const setupSubscription = async () => {
    try {
      const userId = await getCurrentUserId();
      console.log("[BlockedWords] Setting up real-time subscription for user:", userId);

      const channelName = `blocked_words_${userId}`;
      
      channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      });

      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "blocked_words",
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            console.log("[BlockedWords] Change detected:", payload.eventType);
            try {
              const words = await getBlockedWords();
              console.log("[BlockedWords] Updated list:", words);
              callback(words);
            } catch (err) {
              console.warn("[BlockedWords] Failed to refresh:", err);
            }
          }
        )
        .subscribe((status) => {
          console.log("[BlockedWords] Subscription status:", status);
        });
    } catch (err) {
      console.error("[BlockedWords] Setup failed:", err);
    }
  };

  setupSubscription();

  return () => {
    if (channel) {
      console.log("[BlockedWords] Unsubscribing");
      supabase.removeChannel(channel);
    }
  };
}
