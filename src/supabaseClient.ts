// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vdrxkkluuxwwozyznexp.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcnhra2x1dXh3d296eXpuZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDk1MDUsImV4cCI6MjA3NzA4NTUwNX0.zIRMMu1VYV_lnwKsOuTUeDcvSDswR-KUa19PDEKA9nw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
