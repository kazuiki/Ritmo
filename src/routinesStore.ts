import AsyncStorage from '@react-native-async-storage/async-storage';

const k = (uid: string, name: string) => `@ritmo:${name}:${uid}`;

export async function loadCachedRoutines(uid: string): Promise<{ routines: any[] | null; completedOrder: number[] | null; }>{
  try {
    const [r, o] = await Promise.all([
      AsyncStorage.getItem(k(uid, 'routines')),
      AsyncStorage.getItem(k(uid, 'completed_order')),
    ]);
    return {
      routines: r ? JSON.parse(r) : null,
      completedOrder: o ? JSON.parse(o) : null,
    };
  } catch {
    return { routines: null, completedOrder: null };
  }
}

export async function saveCachedRoutines(
  uid: string,
  data: { routines?: any[]; completedOrder?: number[] }
) {
  const ops: Promise<any>[] = [];
  if (data.routines) ops.push(AsyncStorage.setItem(k(uid, 'routines'), JSON.stringify(data.routines)));
  if (data.completedOrder) ops.push(AsyncStorage.setItem(k(uid, 'completed_order'), JSON.stringify(data.completedOrder)));
  await Promise.all(ops);
}
