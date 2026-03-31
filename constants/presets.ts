import { getGifSource } from "./gifSources";

export interface Preset {
  id: number;
  name: string;
  image: any; // React Native static require result
  imageUrl: string; // Path identifier for database storage
  hasBookGuide: boolean;
  hasMiniGame: boolean;
}

export const PRESETS: Preset[] = [
  { id: 1, name: "Brush My Teeth", image: getGifSource("brushing.gif"), imageUrl: "preset_1_brushing", hasBookGuide: true, hasMiniGame: true },
  { id: 2, name: "Let's Eat", image: getGifSource("eating.gif"), imageUrl: "preset_2_eating", hasBookGuide: true, hasMiniGame: true },
  { id: 3, name: "Bath Time", image: getGifSource("washing.gif"), imageUrl: "preset_3_washing", hasBookGuide: true, hasMiniGame: true },
  { id: 4, name: "Dress Up Time", image: getGifSource("putting_clothes.gif"), imageUrl: "preset_4_putting_clothes", hasBookGuide: true, hasMiniGame: false },
  { id: 5, name: "Go to School", image: getGifSource("going_to_school.gif"), imageUrl: "preset_5_going_to_school", hasBookGuide: true, hasMiniGame: true },
  { id: 6, name: "Wear Pajamas", image: getGifSource("putting_pajama.gif"), imageUrl: "preset_7_putting_pajama", hasBookGuide: true, hasMiniGame: false },
  { id: 7, name: "Go to Sleep", image: getGifSource("going_to_sleep.gif"), imageUrl: "preset_8_going_to_sleep", hasBookGuide: true, hasMiniGame: false },
  { id: 8, name: "Fix the Bed", image: getGifSource("fix_the_bed.gif"), imageUrl: "preset_9_fix_the_bed", hasBookGuide: true, hasMiniGame: false },
  { id: 9, name: "Hair Care Time", image: getGifSource("hair_care_time.gif"), imageUrl: "preset_10_hair_care_time", hasBookGuide: true, hasMiniGame: true },
  { id: 10, name: "Hand Blessing", image: getGifSource("hand_blessing.gif"), imageUrl: "preset_11_hand_blessing", hasBookGuide: true, hasMiniGame: false },
  { id: 11, name: "Play with Friends", image: getGifSource("play_with_friends.gif"), imageUrl: "preset_12_play_with_friends", hasBookGuide: true, hasMiniGame: false },
  { id: 12, name: "Sweep the Floor", image: getGifSource("sweep_the_floor.gif"), imageUrl: "preset_13_sweep_the_floor", hasBookGuide: true, hasMiniGame: false },
];

const PRESET_ALIAS_KEYS: Record<number, string[]> = {
  1: ["brush", "brushing", "brushmyteeth", "tooth"],
  2: ["eat", "eating", "letseat", "food"],
  3: ["bath", "washing", "shower"],
  4: ["dress", "clothes", "clothe", "puttingclothes", "dressup"],
  5: ["school", "goingtoschool", "gotoschool"],
  6: ["bedtimeprep", "pajama", "pajamas", "puttingpajama"],
  7: ["sleep", "goingtosleep", "bedtime"],
  8: ["fixthebed", "bed", "fixbed"],
  9: ["haircaretime", "haircare", "hair"],
  10: ["handblessing", "mano", "manopo"],
  11: ["playwithfriends", "play", "friends"],
  12: ["sweepthefloor", "sweep", "floor"],
};

function normalizePresetKey(value?: string | null): string {
  if (!value) return "";
  const trimmed = decodeURIComponent(String(value)).trim().toLowerCase();
  const lastSegment = trimmed.split("/").pop() ?? trimmed;
  const noQuery = lastSegment.split("?")[0].split("#")[0];
  const noExt = noQuery.replace(/\.(gif|png|jpg|jpeg|webp)$/i, "");
  return noExt.replace(/[^a-z0-9]/g, "");
}

function getPresetByAlias(candidate: string): Preset | undefined {
  if (!candidate) return undefined;

  return PRESETS.find((preset) => {
    const aliases = PRESET_ALIAS_KEYS[preset.id] ?? [];
    return aliases.some((alias) => candidate.includes(alias) || alias.includes(candidate));
  });
}

export const getPresetById = (id?: number | null): Preset | undefined => {
  if (!id) return undefined;
  return PRESETS.find(p => p.id === id);
};

export const getPresetByImageUrl = (imageUrl?: string | null): Preset | undefined => {
  if (!imageUrl) return undefined;
  const exact = PRESETS.find(p => p.imageUrl === imageUrl);
  if (exact) return exact;

  const normalizedInput = normalizePresetKey(imageUrl);
  if (!normalizedInput) return undefined;

  const normalizedMatch = PRESETS.find((preset) => {
    const normalizedPresetUrl = normalizePresetKey(preset.imageUrl);
    const normalizedPresetName = normalizePresetKey(preset.name);

    return (
      normalizedInput === normalizedPresetUrl ||
      normalizedInput === normalizedPresetName ||
      normalizedInput.includes(normalizedPresetUrl) ||
      normalizedPresetUrl.includes(normalizedInput)
    );
  });

  if (normalizedMatch) return normalizedMatch;
  return getPresetByAlias(normalizedInput);
};

export const getPresetByName = (name?: string | null): Preset | undefined => {
  if (!name) return undefined;
  const normalizedName = normalizePresetKey(name);
  if (!normalizedName) return undefined;

  const byName = PRESETS.find((preset) => {
    const normalizedPresetName = normalizePresetKey(preset.name);
    return (
      normalizedName === normalizedPresetName ||
      normalizedName.includes(normalizedPresetName) ||
      normalizedPresetName.includes(normalizedName)
    );
  });

  if (byName) return byName;
  return getPresetByAlias(normalizedName);
};

export const resolveRoutinePreset = (routine?: {
  presetId?: number | null;
  imageUrl?: string | null;
  name?: string | null;
} | null): Preset | undefined => {
  if (!routine) return undefined;
  return getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId) || getPresetByName(routine.name);
};
