import { getGifSource } from "./gifSources";
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
  // Wear Pajamas (pajama)
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
  // Sweep the Floor
  'sweepStep1.mp3': require('../assets/voiceover/sweepStep1.mp3'),
  'sweepStep2.mp3': require('../assets/voiceover/sweepStep2.mp3'),
  'sweepStep3.mp3': require('../assets/voiceover/sweepStep3.mp3'),
  'sweepStep4.mp3': require('../assets/voiceover/sweepStep4.mp3'),
  // Hair Care Time
  'hairStep1.mp3': require('../assets/voiceover/hairStep1.mp3'),
  'hairStep2.mp3': require('../assets/voiceover/hairStep2.mp3'),
  'hairStep3.mp3': require('../assets/voiceover/hairStep3.mp3'),
  'hairStep4.mp3': require('../assets/voiceover/hairStep4.mp3'),
  // Fix the Bed
  'bedStep1.mp3': require('../assets/voiceover/bedStep1.mp3'),
  'bedStep2.mp3': require('../assets/voiceover/bedStep2.mp3'),
  'bedStep3.mp3': require('../assets/voiceover/bedStep3.mp3'),
  'bedStep4.mp3': require('../assets/voiceover/bedStep4.mp3'),
  // Hand Blessing
  'manoStep1.mp3': require('../assets/voiceover/manoStep1.mp3'),
  'manoStep2.mp3': require('../assets/voiceover/manoStep2.mp3'),
  'manoStep3.mp3': require('../assets/voiceover/manoStep3.mp3'),
  'manoStep4.mp3': require('../assets/voiceover/manoStep4.mp3'),
  // Play with Friends
  'playStep1.mp3': require('../assets/voiceover/playStep1.mp3'),
  'playStep2.mp3': require('../assets/voiceover/playStep2.mp3'),
  'playStep3.mp3': require('../assets/voiceover/playStep3.mp3'),
  'playStep4.mp3': require('../assets/voiceover/playStep4.mp3'),
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
        gif: getGifSource('brushStep1.gif'), 
        audio: getAudioIfExists('brushStep1.mp3')
      },
      { 
        label: 'Put some toothpaste onto the toothbrush', 
        gif: getGifSource('brushStep2.gif'), 
        audio: getAudioIfExists('brushStep2.mp3')
      },
      { 
        label: 'Brush your teeth', 
        gif: getGifSource('brushStep3.gif'), 
        audio: getAudioIfExists('brushStep3.mp3')
      },
      { 
        label: 'Wash your mouth', 
        gif: getGifSource('brushStep4.gif'), 
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
        gif: getGifSource('eatStep1.gif'),
        audio: getAudioIfExists('eatStep1.mp3')
      },
      { 
        label: 'Scoop, Chew, Yum!', 
        gif: getGifSource('eatStep2.gif'),
        audio: getAudioIfExists('eatStep2.mp3')
      },
      { 
        label: 'Sip, Slurp, Ahh!', 
        gif: getGifSource('eatStep3.gif'),
        audio: getAudioIfExists('eatStep3.mp3')
      },
      { 
        label: 'Bowl cleared', 
        gif: getGifSource('eatStep4.gif'),
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
        gif: getGifSource('bathStep1.gif'),
        audio: getAudioIfExists('bathStep1.mp3')
      },
      { 
        label: 'Call a parent', 
        gif: getGifSource('bathStep2.gif'),
        audio: getAudioIfExists('bathStep2.mp3')
      },
      { 
        label: 'Take a bath', 
        gif: getGifSource('bathStep3.gif'),
        audio: getAudioIfExists('bathStep3.mp3')
      },
      { 
        label: 'Put Clothes', 
        gif: getGifSource('bathStep4.gif'),
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
        gif: getGifSource('clothesStep1.gif'), 
        audio: getAudioIfExists('clotheStep1.mp3')
      },
      { 
        label: 'Put the shirt over your head and arms', 
        gif: getGifSource('clothesStep2.gif'), 
        audio: getAudioIfExists('clotheStep2.mp3')
      },
      { 
        label: 'Step into pants, pull them up, and fasten', 
        gif: getGifSource('clothesStep3.gif'), 
        audio: getAudioIfExists('clotheStep3.mp3')
      },
      { 
        label: 'Put on socks and shoes then tie laces', 
        gif: getGifSource('clothesStep4.gif'), 
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
        gif: getGifSource('schoolStep1.gif'),
        audio: getAudioIfExists('schoolStep1.mp3')
      },
      { 
        label: 'Check your bag', 
        gif: getGifSource('schoolStep2.gif'),
        audio: getAudioIfExists('schoolStep2.mp3')
      },
      { 
        label: 'Pack your food and water', 
        gif: getGifSource('schoolStep3.gif'),
        audio: getAudioIfExists('schoolStep3.mp3')
      },
      { 
        label: 'Ready to go', 
        gif: getGifSource('schoolStep4.gif'),
        audio: getAudioIfExists('schoolStep4.mp3')
      },
    ],
  },
  6: {
    title: 'Wear Pajamas',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      { 
        label: 'Prepare to change into pajamas', 
        gif: getGifSource('pajamaStep1.gif'), 
        audio: getAudioIfExists('pajamaStep1.mp3')
      },
      { 
        label: 'Pick up the pajama shirt and put it on', 
        gif: getGifSource('pajamaStep2.gif'), 
        audio: getAudioIfExists('pajamaStep2.mp3')
      },
      { 
        label: 'Grab pajama pants and pull them on', 
        gif: getGifSource('pajamaStep3.gif'), 
        audio: getAudioIfExists('pajamaStep3.mp3')
      },
      { 
        label: 'You are now fully dressed and ready for bedtime', 
        gif: getGifSource('pajamaStep4.gif'), 
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
        gif: getGifSource('sleepStep1.gif'), 
        audio: getAudioIfExists('sleepStep1.mp3')
      },
      { 
        label: 'Sip some warm milk like a cozy bear', 
        gif: getGifSource('sleepStep2.gif'), 
        audio: getAudioIfExists('sleepStep2.mp3')
      },
      { 
        label: 'Turn off the light and say goodnight to the stars', 
        gif: getGifSource('sleepStep3.gif'), 
        audio: getAudioIfExists('sleepStep3.mp3')
      },
      { 
        label: 'Close your eyes and drift into dreamland', 
        gif: getGifSource('sleepStep4.gif'), 
        audio: getAudioIfExists('sleepStep4.mp3')
      },
    ],
  },
  8: {
    title: 'Fix the Bed',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      {
        label: 'Clear off all your toys and pillows',
        gif: getGifSource('bedStep1.gif'),
        audio: getAudioIfExists('bedStep1.mp3'),
      },
      {
        label: 'Pull your sheets and blankets up to the top',
        gif: getGifSource('bedStep2.gif'),
        audio: getAudioIfExists('bedStep2.mp3'),
      },
      {
        label: 'Tuck the blankets under the bottom of the bed',
        gif: getGifSource('bedStep3.gif'),
        audio: getAudioIfExists('bedStep3.mp3'),
      },
      {
        label: 'Put your pillows and favorite toys back and smile',
        gif: getGifSource('bedStep4.gif'),
        audio: getAudioIfExists('bedStep4.mp3'),
      },
    ],
  },
  9: {
    title: 'Hair Care Time',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      {
        label: 'Sit properly and get the comb',
        gif: getGifSource('hairStep1.gif'),
        audio: getAudioIfExists('hairStep1.mp3'),
      },
      {
        label: 'Comb your hair from top to bottom',
        gif: getGifSource('hairStep2.gif'),
        audio: getAudioIfExists('hairStep2.mp3'),
      },
      {
        label: 'Use your hands to smooth and fix your hair',
        gif: getGifSource('hairStep3.gif'),
        audio: getAudioIfExists('hairStep3.mp3'),
      },
      {
        label: 'Look in the mirror and smile',
        gif: getGifSource('hairStep4.gif'),
        audio: getAudioIfExists('hairStep4.mp3'),
      },
    ],
  },
  10: {
    title: 'Hand Blessing',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      {
        label: 'Approach the elder respectfully and gently hold their hand',
        gif: getGifSource('manoStep1.gif'),
        audio: getAudioIfExists('manoStep1.mp3'),
      },
      {
        label: "Bring the elder's hand to your forehead",
        gif: getGifSource('manoStep2.gif'),
        audio: getAudioIfExists('manoStep2.mp3'),
      },
      {
        label: 'Say â€œMano po.â€',
        gif: getGifSource('manoStep3.gif'),
        audio: getAudioIfExists('manoStep3.mp3'),
      },
      {
        label: 'Smile after showing respect',
        gif: getGifSource('manoStep4.gif'),
        audio: getAudioIfExists('manoStep4.mp3'),
      },
    ],
  },
  11: {
    title: 'Play with Friends',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      {
        label: 'Say hello to your friend with a smile',
        gif: getGifSource('playStep1.gif'),
        audio: getAudioIfExists('playStep1.mp3'),
      },
      {
        label: 'Invite your friend to play by showing a toy or waving',
        gif: getGifSource('playStep2.gif'),
        audio: getAudioIfExists('playStep2.mp3'),
      },
      {
        label: 'Play with your friend using a simple toy like a ball or blocks',
        gif: getGifSource('playStep3.gif'),
        audio: getAudioIfExists('playStep3.mp3'),
      },
      {
        label: 'Say thank you to your friend after playing',
        gif: getGifSource('playStep4.gif'),
        audio: getAudioIfExists('playStep4.mp3'),
      },
    ],
  },
  12: {
    title: 'Sweep the Floor',
    timer: {
      duration: 60,
      visible: true,
      position: 'top-right',
    },
    steps: [
      {
        label: 'Get the broom and dustpan',
        gif: getGifSource('sweepStep1.gif'),
        audio: getAudioIfExists('sweepStep1.mp3'),
      },
      {
        label: 'Look around and find the dust, dirt, and small pieces on the floor',
        gif: getGifSource('sweepStep2.gif'),
        audio: getAudioIfExists('sweepStep2.mp3'),
      },
      {
        label: 'Sweep the dirt using the broom and dustpan',
        gif: getGifSource('sweepStep3.gif'),
        audio: getAudioIfExists('sweepStep3.mp3'),
      },
      {
        label: 'Then put the swept dirt in the trashcan',
        gif: getGifSource('sweepStep4.gif'),
        audio: getAudioIfExists('sweepStep4.mp3'),
      },
    ],
  },
};

export function getPlaybookForPreset(presetId?: number | null): Playbook | undefined {
  if (!presetId) return undefined;
  return PLAYBOOKS[presetId];
}
