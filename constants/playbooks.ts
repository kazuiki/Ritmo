export interface PlaybookStep {
  label: string;
  gif: any; // React Native static require
}

export interface Playbook {
  title: string;
  steps: PlaybookStep[]; // 4 steps
}

// Map presetId -> Playbook
export const PLAYBOOKS: Record<number, Playbook> = {
  1: {
    title: 'Brush My Teeth',
    steps: [
      { label: 'Get your toothbrush and toothpaste', gif: require('../assets/gifs/brushStep1.gif') },
      { label: 'Put some toothpaste into the toothbrush', gif: require('../assets/gifs/brushStep2.gif') },
      { label: 'Brush your teeth', gif: require('../assets/gifs/brushStep3.gif') },
      { label: 'Wash your mouth', gif: require('../assets/gifs/brushStep4.gif') },
    ],
  },
  2: {
    title: "Let's Eat",
    steps: [
      { label: 'Food has been prepared', gif: require('../assets/gifs/eatStep1.gif') },
      { label: 'Scoop, Chew, Yum!', gif: require('../assets/gifs/eatStep2.gif') },
      { label: 'Sip, Slurp, Ahh!', gif: require('../assets/gifs/eatStep3.gif') },
      { label: 'Bowl cleared', gif: require('../assets/gifs/eatStep4.gif') },
    ],
  },
  3: {
    title: 'Bath Time',
    steps: [
      { label: 'Prepare for bath', gif: require('../assets/gifs/bathStep1.gif') },
      { label: 'Call a parent', gif: require('../assets/gifs/bathStep2.gif') },
      { label: 'Take a bath', gif: require('../assets/gifs/bathStep3.gif') },
      { label: 'Put Clothes', gif: require('../assets/gifs/bathStep4.gif') },
    ],
  },
};

export function getPlaybookForPreset(presetId?: number | null): Playbook | undefined {
  if (!presetId) return undefined;
  return PLAYBOOKS[presetId];
}
