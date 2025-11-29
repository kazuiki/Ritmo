import AsyncStorage from '@react-native-async-storage/async-storage';

const k = (uid: string, name: string) => `@ritmo:${name}:${uid}`;

export async function loadCachedRoutines(uid: string): Promise<{ routines: any[] | null; completedOrder: number[] | null; }>{
  try {
    const [r, o, t] = await Promise.all([
      AsyncStorage.getItem(k(uid, 'routines')),
      AsyncStorage.getItem(k(uid, 'completed_order')),
      AsyncStorage.getItem(k(uid, 'cache_date')),
    ]);
    
    // Check if cache is from today
    const today = new Date().toISOString().slice(0, 10);
    const cacheDate = t || '';
    
    // Only return cached data if it's from today
    if (cacheDate === today) {
      return {
        routines: r ? JSON.parse(r) : null,
        completedOrder: o ? JSON.parse(o) : null,
      };
    }
    
    // Cache is stale, return null to force fresh load
    return { routines: null, completedOrder: null };
  } catch {
    return { routines: null, completedOrder: null };
  }
}

export async function saveCachedRoutines(
  uid: string,
  data: { routines?: any[]; completedOrder?: number[] }
) {
  const ops: Promise<any>[] = [];
  const today = new Date().toISOString().slice(0, 10);
  
  if (data.routines) ops.push(AsyncStorage.setItem(k(uid, 'routines'), JSON.stringify(data.routines)));
  if (data.completedOrder) ops.push(AsyncStorage.setItem(k(uid, 'completed_order'), JSON.stringify(data.completedOrder)));
  ops.push(AsyncStorage.setItem(k(uid, 'cache_date'), today));
  
  await Promise.all(ops);
}

export async function clearCachedRoutines(uid: string) {
  try {
    await Promise.all([
      AsyncStorage.removeItem(k(uid, 'routines')),
      AsyncStorage.removeItem(k(uid, 'completed_order')),
      AsyncStorage.removeItem(k(uid, 'cache_date')),
    ]);
  } catch (error) {
    console.error('Failed to clear cached routines:', error);
  }
}
