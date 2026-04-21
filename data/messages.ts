export type Message = {
  from: "me" | "them";
  text: string;
  at: string;
};

export type Conversation = {
  id: string;
  name: string;
  handle: string;
  kind: "personal" | "circle";
  location: string;
  hue: number;
  last: string;
  at: string;
  unread?: number;
  online?: boolean;
  typing?: boolean;
  archived?: boolean;
  messages: Message[];
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    name: "Leyla Mammadova",
    handle: "leyla",
    kind: "personal",
    location: "Berlin, Germany",
    hue: 210,
    last: "Count me in — bringing cleats.",
    at: "2m",
    unread: 2,
    online: true,
    typing: true,
    messages: [
      { from: "them", text: "Heyy — are you around this weekend?", at: "14:02" },
      { from: "me", text: "Yep! What's the plan?", at: "14:03" },
      {
        from: "them",
        text: "Berlin circle is organizing a pickup football game at Tempelhof Saturday 2pm. Rashad and Elvin are in too.",
        at: "14:04",
      },
      { from: "me", text: "Count me in. Should I bring anything?", at: "14:05" },
      { from: "them", text: "Just cleats. Water + snacks covered.", at: "14:06" },
      {
        from: "them",
        text: "Also — do you know anyone who plays keeper? Nobody wants it 😅",
        at: "14:07",
      },
    ],
  },
  {
    id: "c2",
    name: "Azerbaijanis in Berlin",
    handle: "azeberlin",
    kind: "circle",
    location: "Berlin, Germany",
    hue: 180,
    last: "Novruz planning thread is live.",
    at: "18m",
    unread: 1,
    messages: [
      {
        from: "them",
        text: "Opened a planning thread for Novruz Night 🌸 everyone pitch in",
        at: "13:40",
      },
      { from: "me", text: "On it — dropping the venue shortlist tonight.", at: "13:52" },
    ],
  },
  {
    id: "c3",
    name: "Rashad Aliyev",
    handle: "rashad",
    kind: "personal",
    location: "London, UK",
    hue: 60,
    last: "thanks for the intro 🙏",
    at: "1h",
    online: false,
    messages: [
      { from: "them", text: "thanks for the intro 🙏", at: "12:10" },
      { from: "me", text: "of course — she'll be a great fit", at: "12:12" },
    ],
  },
  {
    id: "c4",
    name: "Nigar Huseynova",
    handle: "nigar",
    kind: "personal",
    location: "New York, USA",
    hue: 320,
    last: "sharing the deck now",
    at: "3h",
    online: true,
    messages: [
      { from: "them", text: "sharing the deck now", at: "11:00" },
      { from: "them", text: "let me know what you think before friday", at: "11:01" },
    ],
  },
  {
    id: "c5",
    name: "Elvin Kazimov",
    handle: "elvin",
    kind: "personal",
    location: "Istanbul, Türkiye",
    hue: 150,
    last: "Novruz planning thread on the circle",
    at: "5h",
    messages: [
      { from: "them", text: "Novruz planning thread on the circle — join?", at: "09:20" },
    ],
  },
  {
    id: "c6",
    name: "Aysel Jabbarova",
    handle: "aysel",
    kind: "personal",
    location: "Dubai, UAE",
    hue: 20,
    last: "hafta sonu çay içirik?",
    at: "1d",
    messages: [
      { from: "them", text: "hafta sonu çay içirik?", at: "yesterday" },
    ],
  },
  {
    id: "c7",
    name: "Tea and Domino Lovers of Fairfax",
    handle: "teadominofx",
    kind: "circle",
    location: "Fairfax, VA",
    hue: 40,
    last: "Tural won. Again. Same time next week.",
    at: "2d",
    archived: true,
    messages: [
      { from: "them", text: "Tural won. Again. Same time next week.", at: "2d ago" },
    ],
  },
];

export const REQUESTS: Conversation[] = [
  {
    id: "r1",
    name: "Farid Mustafayev",
    handle: "farid",
    kind: "personal",
    location: "Toronto, Canada",
    hue: 280,
    last: "Hi! Saw your post about the Berlin meetup…",
    at: "2h",
    messages: [
      {
        from: "them",
        text: "Hi! Saw your post about the Berlin meetup — I'm moving there in May. Any tips?",
        at: "10:44",
      },
    ],
  },
  {
    id: "r2",
    name: "Sabina Nasirova",
    handle: "sabina",
    kind: "personal",
    location: "Paris, France",
    hue: 340,
    last: "Quick question about your scholarship post",
    at: "1d",
    messages: [
      { from: "them", text: "Quick question about your scholarship post 🙂", at: "yesterday" },
    ],
  },
];
