export interface PlaybookStep {
  label: string;
  gif: any; // React Native static require
  audio?: any; // Matching voiceover mp3 require - ONLY include if file exists
}

export interface Playbook {
  title: string;
  steps: PlaybookStep[]; // 4 steps
  timer?: {
    duration: number; // in seconds
    visible: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}

// Static map of available voiceover files. Metro requires static require paths.
// Only include files that actually exist in ../assets/voiceover.
const VOICEOVERS: Record<string, any> = {
  // Brush My Teeth
  'brushStep1.mp3': require('../assets/voiceover/brushStep1.mp3'),
  'brushStep2.mp3': require('../assets/voiceover/brushStep2.mp3'),
  'brushStep3.mp3': require('../assets/voiceover/brushStep3.mp3'),
  'brushStep4.mp3': require('../assets/voiceover/brushStep4.mp3'),
  // Let's Eat
  'eatStep1.mp3': require('../assets/voiceover/eatStep1.mp3'),
  'eatStep2.mp3': require('../assets/voiceover/eatStep2.mp3'),
  'eatStep3.mp3': require('../assets/voiceover/eatStep3.mp3'),
  'eatStep4.mp3': require('../assets/voiceover/eatStep4.mp3'),
  // Bath Time
  'bathStep1.mp3': require('../assets/voiceover/bathStep1.mp3'),
  'bathStep2.mp3': require('../assets/voiceover/bathStep2.mp3'),
  'bathStep3.mp3': require('../assets/voiceover/bathStep3.mp3'),
  'bathStep4.mp3': require('../assets/voiceover/bathStep4.mp3'),
  // Dress Up Time (clothe)
  'clotheStep1.mp3': require('../assets/voiceover/clotheStep1.mp3'),
  'clotheStep2.mp3': require('../assets/voiceover/clotheStep2.mp3'),
  'clotheStep3.mp3': require('../assets/voiceover/clotheStep3.mp3'),
  'clotheStep4.mp3': require('../assets/voiceover/clotheStep4.mp3'),
  // Bedtime Prep (pajama)
  'pajamaStep1.mp3': require('../assets/voiceover/pajamaStep1.mp3'),
  'pajamaStep2.mp3': require('../assets/voiceover/pajamaStep2.mp3'),
  'pajamaStep3.mp3': require('../assets/voiceover/pajamaStep3.mp3'),
  'pajamaStep4.mp3': require('../assets/voiceover/pajamaStep4.mp3'),
  // Go to Sleep
  'sleepStep1.mp3': require('../assets/voiceover/sleepStep1.mp3'),
  'sleepStep2.mp3': require('../assets/voiceover/sleepStep2.mp3'),
  'sleepStep3.mp3': require('../assets/voiceover/sleepStep3.mp3'),
  'sleepStep4.mp3': require('../assets/voiceover/sleepStep4.mp3'),
  // Go to School
  'schoolStep1.mp3': require('../assets/voiceover/schoolStep1.mp3'),
  'schoolStep2.mp3': require('../assets/voiceover/schoolStep2.mp3'),
  'schoolStep3.mp3': require('../assets/voiceover/schoolStep3.mp3'),
  'schoolStep4.mp3': require('../assets/voiceover/schoolStep4.mp3'),
};

// Helper to return audio module if mapped; otherwise undefined
const getAudioIfExists = (filename: string) => VOICEOVERS[filename];

// Map presetId -> Playbook
export const PLAYBOOKS: Record<number, Playbook> = {
  1: {
    title: 'Brush My Teeth',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Get your toothbrush and toothpaste', 
        gif: require('../assets/gifs/brushStep1.gif'), 
        audio: getAudioIfExists('brushStep1.mp3')
      },
      { 
        label: 'Put some toothpaste onto the toothbrush', 
        gif: require('../assets/gifs/brushStep2.gif'), 
        audio: getAudioIfExists('brushStep2.mp3')
      },
      { 
        label: 'Brush your teeth', 
        gif: require('../assets/gifs/brushStep3.gif'), 
        audio: getAudioIfExists('brushStep3.mp3')
      },
      { 
        label: 'Wash your mouth', 
        gif: require('../assets/gifs/brushStep4.gif'), 
        audio: getAudioIfExists('brushStep4.mp3')
      },
    ],
  },
  2: {
    title: "Let's Eat",
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Food has been prepared', 
        gif: require('../assets/gifs/eatStep1.gif'),
        audio: getAudioIfExists('eatStep1.mp3')
      },
      { 
        label: 'Scoop, Chew, Yum!', 
        gif: require('../assets/gifs/eatStep2.gif'),
        audio: getAudioIfExists('eatStep2.mp3')
      },
      { 
        label: 'Sip, Slurp, Ahh!', 
        gif: require('../assets/gifs/eatStep3.gif'),
        audio: getAudioIfExists('eatStep3.mp3')
      },
      { 
        label: 'Bowl cleared', 
        gif: require('../assets/gifs/eatStep4.gif'),
        audio: getAudioIfExists('eatStep4.mp3')
      },
    ],
  },
  3: {
    title: 'Bath Time',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Prepare for bath', 
        gif: require('../assets/gifs/bathStep1.gif'),
        audio: getAudioIfExists('bathStep1.mp3')
      },
      { 
        label: 'Call a parent', 
        gif: require('../assets/gifs/bathStep2.gif'),
        audio: getAudioIfExists('bathStep2.mp3')
      },
      { 
        label: 'Take a bath', 
        gif: require('../assets/gifs/bathStep3.gif'),
        audio: getAudioIfExists('bathStep3.mp3')
      },
      { 
        label: 'Put Clothes', 
        gif: require('../assets/gifs/bathStep4.gif'),
        audio: getAudioIfExists('bathStep4.mp3')
      },
    ],
  },
  4: {
    title: 'Dress Up Time',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Put on clean underwear and undershirt', 
        gif: require('../assets/gifs/clothesStep1.gif'), 
        audio: getAudioIfExists('clotheStep1.mp3')
      },
      { 
        label: 'Put the shirt over your head and arms', 
        gif: require('../assets/gifs/clothesStep2.gif'), 
        audio: getAudioIfExists('clotheStep2.mp3')
      },
      { 
        label: 'Step into pants, pull them up, and fasten', 
        gif: require('../assets/gifs/clothesStep3.gif'), 
        audio: getAudioIfExists('clotheStep3.mp3')
      },
      { 
        label: 'Put on socks and shoes then tie laces', 
        gif: require('../assets/gifs/clothesStep4.gif'), 
        audio: getAudioIfExists('clotheStep4.mp3')
      },
    ],
  },
  5: {
    title: 'Go to School',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Get dressed and freshen up', 
        gif: require('../assets/gifs/schoolStep1.gif'),
        audio: getAudioIfExists('schoolStep1.mp3')
      },
      { 
        label: 'Check your bag', 
        gif: require('../assets/gifs/schoolStep2.gif'),
        audio: getAudioIfExists('schoolStep2.mp3')
      },
      { 
        label: 'Pack your food and water', 
        gif: require('../assets/gifs/schoolStep3.gif'),
        audio: getAudioIfExists('schoolStep3.mp3')
      },
      { 
        label: 'Ready to go', 
        gif: require('../assets/gifs/schoolStep4.gif'),
        audio: getAudioIfExists('schoolStep4.mp3')
      },
    ],
  },
  6: {
    title: 'Bedtime Prep',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Prepare to change into pajamas', 
        gif: require('../assets/gifs/pajamaStep1.gif'), 
        audio: getAudioIfExists('pajamaStep1.mp3')
      },
      { 
        label: 'Pick up the pajama shirt and put it on', 
        gif: require('../assets/gifs/pajamaStep2.gif'), 
        audio: getAudioIfExists('pajamaStep2.mp3')
      },
      { 
        label: 'Grab pajama pants and pull them on', 
        gif: require('../assets/gifs/pajamaStep3.gif'), 
        audio: getAudioIfExists('pajamaStep3.mp3')
      },
      { 
        label: 'You are now fully dressed and ready for bedtime', 
        gif: require('../assets/gifs/pajamaStep4.gif'), 
        audio: getAudioIfExists('pajamaStep4.mp3')
      },
    ],
  },
  7: {
    title: 'Go to Sleep',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Get comfy in bed with a fun book', 
        gif: require('../assets/gifs/sleepStep1.gif'), 
        audio: getAudioIfExists('sleepStep1.mp3')
      },
      { 
        label: 'Sip some warm milk like a cozy bear', 
        gif: require('../assets/gifs/sleepStep2.gif'), 
        audio: getAudioIfExists('sleepStep2.mp3')
      },
      { 
        label: 'Turn off the light and say goodnight to the stars', 
        gif: require('../assets/gifs/sleepStep3.gif'), 
        audio: getAudioIfExists('sleepStep3.mp3')
      },
      { 
        label: 'Close your eyes and drift into dreamland', 
        gif: require('../assets/gifs/sleepStep4.gif'), 
        audio: getAudioIfExists('sleepStep4.mp3')
      },
    ],
  },
};

export function getPlaybookForPreset(presetId?: number | null): Playbook | undefined {
  if (!presetId) return undefined;
  return PLAYBOOKS[presetId];
}