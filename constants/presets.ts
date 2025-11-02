export interface Preset {
  id: number;
  name: string;
  image: any; // React Native static require result
}

export const PRESETS: Preset[] = [
  { id: 1, name: "Brush My Teeth", image: require("../assets/images/brushing.gif") },
  { id: 2, name: "Let's Eat", image: require("../assets/images/eating.gif") },
  { id: 3, name: "Bath Time", image: require("../assets/images/washing.gif") },
  { id: 4, name: "Dress Up Time", image: require("../assets/images/putting clothes.gif") },
  { id: 5, name: "Go to School", image: require("../assets/images/going to school.gif") },
  { id: 6, name: "Go to Home", image: require("../assets/images/going home.gif") },
  { id: 7, name: "Bedtime Prep", image: require("../assets/images/putting pajama.gif") },
  { id: 8, name: "Go to Sleep", image: require("../assets/images/going to sleep.gif") },
];

export const getPresetById = (id?: number | null): Preset | undefined => {
  if (!id) return undefined;
  return PRESETS.find(p => p.id === id);
};
