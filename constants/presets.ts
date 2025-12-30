export interface Preset {
  id: number;
  name: string;
  image: any; // React Native static require result
  imageUrl: string; // Path identifier for database storage
  hasBookGuide: boolean;
  hasMiniGame: boolean;
}

export const PRESETS: Preset[] = [
  { id: 1, name: "Brush My Teeth", image: require("../assets/gifs/brushing.gif"), imageUrl: "preset_1_brushing", hasBookGuide: true, hasMiniGame: true },
  { id: 2, name: "Let's Eat", image: require("../assets/gifs/eating.gif"), imageUrl: "preset_2_eating", hasBookGuide: true, hasMiniGame: true },
  { id: 3, name: "Bath Time", image: require("../assets/gifs/washing.gif"), imageUrl: "preset_3_washing", hasBookGuide: true, hasMiniGame: true },
  { id: 4, name: "Dress Up Time", image: require("../assets/gifs/putting clothes.gif"), imageUrl: "preset_4_putting_clothes", hasBookGuide: true, hasMiniGame: false },
  { id: 5, name: "Go to School", image: require("../assets/gifs/going to school.gif"), imageUrl: "preset_5_going_to_school", hasBookGuide: true, hasMiniGame: true },
  { id: 6, name: "Bedtime Prep", image: require("../assets/gifs/putting pajama.gif"), imageUrl: "preset_7_putting_pajama", hasBookGuide: true, hasMiniGame: false },
  { id: 7, name: "Go to Sleep", image: require("../assets/gifs/going to sleep.gif"), imageUrl: "preset_8_going_to_sleep", hasBookGuide: true, hasMiniGame: false },
];

export const getPresetById = (id?: number | null): Preset | undefined => {
  if (!id) return undefined;
  return PRESETS.find(p => p.id === id);
};

export const getPresetByImageUrl = (imageUrl?: string | null): Preset | undefined => {
  if (!imageUrl) return undefined;
  return PRESETS.find(p => p.imageUrl === imageUrl);
};
