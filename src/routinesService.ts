import { supabase } from "./supabaseClient";

export type RoutineInsert = {
  name: string;
  description?: string | null;
  is_active?: boolean;
  time: string; // e.g. "01:00 am"
  imageUrl?: string | null;
};

export type Routine = {
  id: number;
  routine_ud?: string | null; // keep optional since schema mentions it
  name: string;
  description: string | null;
  is_active: boolean;
  time: string;
  imageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RoutineProgress = {
  id: number;
  user_id: string;
  routine_id: number;
  day_date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at: string | null; // ISO timestamp
  created_at?: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
}

function toDateOnly(input?: Date | string): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  // assume already YYYY-MM-DD
  return input.slice(0, 10);
}

export async function createRoutine(values: RoutineInsert): Promise<Routine> {
  const payload = {
    name: values.name,
    description: values.description ?? null,
    is_active: values.is_active ?? true,
    time: values.time,
    imageUrl: values.imageUrl ?? null,
  };
  const { data, error } = await supabase
    .from("routines")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function createRoutineForCurrentUser(values: RoutineInsert): Promise<Routine> {
  // Currently `routines` has no explicit user_id; link is tracked via progress table.
  const routine = await createRoutine(values);
  try {
    // Create a non-completed progress row for today so it shows up in user scope if needed
    await ensureProgressRow({ routineId: routine.id, completed: false });
  } catch (_) {
    // ignore linking failure; routine still created
  }
  return routine;
}

export async function ensureProgressRow(params: {
  routineId: number;
  dayDate?: string | Date;
  completed?: boolean;
}): Promise<RoutineProgress> {
  const userId = await getCurrentUserId();
  const day = toDateOnly(params.dayDate);
  const completed = !!params.completed;

  console.log('=== ensureProgressRow called ===');
  console.log('Current user ID:', userId);
  console.log('Routine ID:', params.routineId);
  console.log('Day date:', day);
  console.log('Completed:', completed);

  // First, verify the routine exists
  const { data: routineExists, error: routineErr } = await supabase
    .from("routines")
    .select("id")
    .eq("id", params.routineId)
    .single();
  
  if (routineErr || !routineExists) {
    console.error('Routine does not exist:', routineErr);
    throw new Error(`Routine with id ${params.routineId} does not exist`);
  }
  console.log('Routine exists with id:', routineExists.id);

  // Try to find existing row for (user, routine, date)
  const { data: existing, error: selErr } = await supabase
    .from("user_routine_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("routine_id", params.routineId)
    .eq("day_date", day)
    .maybeSingle();
  
  console.log('Existing row query result:', existing);
  
  if (selErr && selErr.code !== "PGRST116") {
    console.error('Error finding existing row:', selErr);
    throw selErr; // ignore not-found
  }

  if (existing) {
    console.log(`Updating existing progress row ${existing.id} for routine ${params.routineId}, user ${userId}, date ${day}`);
    console.log(`Setting completed=${completed}, completed_at=${completed ? new Date().toISOString() : null}`);
    console.log('Existing row before update:', existing);
    
    // Perform the update with multiple conditions to ensure RLS policy match
    const updatePayload = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };
    console.log('Update payload:', updatePayload);
    
    const { data: updateData, error: updateError, count } = await supabase
      .from("user_routine_progress")
      .update(updatePayload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*");
    
    console.log('Update response - data:', updateData, 'count:', count, 'error:', updateError);
    
    if (updateError) {
      console.error('Error updating progress row:', updateError);
      throw updateError;
    }
    
    // Check if update actually modified any rows
    const updatedRow = Array.isArray(updateData) && updateData.length > 0 ? updateData[0] : updateData;
    
    if (!updatedRow) {
      console.error('WARNING: Update query executed but no rows were returned!');
      console.error('This typically indicates an RLS policy is blocking the update.');
      console.error('Check your Supabase RLS policies for user_routine_progress table.');
      
      // Fetch the row to see if it was actually updated
      const { data: fetchedData, error: fetchError } = await supabase
        .from("user_routine_progress")
        .select("*")
        .eq("id", existing.id)
        .single();
      
      console.log('Fetched row after update attempt:', fetchedData);
      
      if (fetchedData && fetchedData.completed === completed) {
        console.log('Row was actually updated despite no data returned!');
        return fetchedData as RoutineProgress;
      }
      
      console.error('Row was NOT updated. RLS policy is blocking the update.');
      throw new Error('Update blocked by RLS policy. Please check your database policies.');
    }
    
    console.log('Successfully updated row:', updatedRow);
    return updatedRow as RoutineProgress;
  }

  // No existing row, create new one
  console.log(`Creating new progress row for routine ${params.routineId}, user ${userId}, date ${day}`);
  console.log(`Setting completed=${completed}, completed_at=${completed ? new Date().toISOString() : null}`);
  
  const insertPayload = {
    user_id: userId,
    routine_id: params.routineId,
    day_date: day,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };
  
  console.log('Insert payload:', insertPayload);
  
  const { data, error } = await supabase
    .from("user_routine_progress")
    .insert(insertPayload)
    .select("*")
    .single();
    
  if (error) {
    console.error('Error inserting progress row:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    throw error;
  }
  
  if (!data) {
    console.error('Insert succeeded but returned no data - checking if row exists...');
    
    // Try to fetch the row we just inserted
    const { data: fetchedData, error: fetchError } = await supabase
      .from("user_routine_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("routine_id", params.routineId)
      .eq("day_date", day)
      .single();
    
    if (fetchedData) {
      console.log('Found the inserted row:', fetchedData);
      return fetchedData as RoutineProgress;
    }
    
    console.error('Could not fetch inserted row:', fetchError);
    throw new Error('Insert returned no data - possible RLS policy issue');
  }
  
  console.log('Successfully inserted row:', data);
  return data as RoutineProgress;
}

export async function setRoutineCompleted(params: {
  routineId: number;
  dayDate?: string | Date;
  completed: boolean;
}): Promise<RoutineProgress> {
  return ensureProgressRow(params);
}

export async function getUserProgressForRange(params: {
  routineId?: number;
  from: string | Date;
  to: string | Date;
}): Promise<RoutineProgress[]> {
  const userId = await getCurrentUserId();
  const from = toDateOnly(params.from);
  const to = toDateOnly(params.to);

  let q = supabase
    .from("user_routine_progress")
    .select("*")
    .eq("user_id", userId)
    .gte("day_date", from)
    .lte("day_date", to)
    .order("day_date", { ascending: true });

  if (params.routineId) q = q.eq("routine_id", params.routineId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RoutineProgress[];
}

export async function getRoutinesForCurrentUser(): Promise<Routine[]> {
  const userId = await getCurrentUserId();
  const { data: links, error: linkErr } = await supabase
    .from("user_routine_progress")
    .select("routine_id")
    .eq("user_id", userId);
  if (linkErr) throw linkErr;
  const ids = Array.from(new Set((links ?? []).map((r: any) => r.routine_id))).filter(
    (v) => typeof v === "number"
  );
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .in("id", ids)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Routine[];
}

export async function updateRoutine(
  id: number,
  patch: Partial<Pick<Routine, "name" | "description" | "is_active" | "time" | "imageUrl">>
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Routine;
}

// Unlink a routine from the current user by removing all progress rows for it.
export async function unlinkRoutineForCurrentUser(routineId: number): Promise<number> {
  const userId = await getCurrentUserId();
  const { error, count } = await supabase
    .from("user_routine_progress")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("routine_id", routineId);
  if (error) throw error;
  return count ?? 0;
}
