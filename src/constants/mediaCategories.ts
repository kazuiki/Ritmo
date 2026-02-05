export type MediaCategory = {
  id: string;
  label: string;
  query: string;
  backupQuery: string;
  channelId: string | null;
};

export const KIDS_CATEGORIES: MediaCategory[] = [
  {
    id: "nursery",
    label: "🎵 Nursery Rhymes",
    query: "nursery rhymes for kids",
    backupQuery: "nursery rhymes children songs",
    channelId: null
  },
  {
    id: "cocomelon",
    label: "🎈 Cocomelon",
    query: "cocomelon nursery rhymes babies songs",
    backupQuery: "cocomelon toddler learning videos",
    channelId: "UCY1kMZp36IQSyNx_9h3xtsQ"
  },
  {
    id: "counting",
    label: "🔢 Counting Songs",
    query: "counting songs learning numbers kids",
    backupQuery: "number songs for toddlers children",
    channelId: null
  },
  {
    id: "alphabet",
    label: "🔤 ABC Songs",
    query: "alphabet songs ABC learning for kids",
    backupQuery: "letter songs for children learning",
    channelId: null
  },
  {
    id: "colors",
    label: "🌈 Colors & Shapes",
    query: "colors and shapes learning for kids",
    backupQuery: "color shape learning videos children",
    channelId: null
  },
  {
    id: "animals",
    label: "🐶 Animal Songs",
    query: "animal songs for kids learning",
    backupQuery: "animals for kids educational videos",
    channelId: null
  },
  {
    id: "cartoons",
    label: "🎬 Cartoons",
    query: "kids cartoons youtube animations",
    backupQuery: "cartoon videos for children",
    channelId: null
  },
  {
    id: "bluey",
    label: "💙 Bluey",
    query: "bluey episodes cartoon for kids",
    backupQuery: "bluey full episodes children show",
    channelId: "UCqwZ0D-j64xnJEJZeZ7e5rw"
  },
  {
    id: "peppa",
    label: "🐷 Peppa Pig",
    query: "peppa pig episodes cartoon",
    backupQuery: "peppa pig full episodes for kids",
    channelId: "UCXb__pNKuCYjL1b5r7-WtDw"
  },
  {
    id: "paw",
    label: "🐾 Paw Patrol",
    query: "paw patrol rescue episodes",
    backupQuery: "paw patrol full episodes children",
    channelId: "UCXjj1GIWZvDRAJYmddVxLDQ"
  },
  {
    id: "disney",
    label: "✨ Disney",
    query: "disney junior shows for kids",
    backupQuery: "disney children videos cartoons",
    channelId: "UCIxJVwG_c1Jdm6HNGjqz3LQ"
  }
];
