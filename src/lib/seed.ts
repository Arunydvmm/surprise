// Default content created the first time the app connects to an empty database.
export const defaultSettings: Record<string, string> = {
  friend_nickname: "Bestie",
  welcome_title: "A little place for our memories",
  welcome_message: "For the laughs, the chaos, and all the little moments that became special.",
  final_letter: "Life is a little brighter with a friend like you in it. Thanks for being your wonderfully weird self. Best friends, always. 💗"
};

type Seed = { type: string; title: string; subtitle: string; button_text: string; items: string[]; options?: Record<string, string>; sort_order: number };

export const seedStages: Seed[] = [
  { type: "ask", title: "Hey! I made something for you 💗", subtitle: "Want to see it?", button_text: "Yes, show me!", items: ["Please? 🥺", "Pretty please? 🥹", "I worked really hard on it…", "Okay okay, just one peek? 😿"], options: { noText: "No" }, sort_order: -1 },
  { type: "intro", title: "A little place for our memories", subtitle: "For the laughs, the chaos, and all the little moments.", button_text: "Open your surprise", items: [], sort_order: 0 },
  { type: "balloons", title: "Pop the balloons", subtitle: "Each one holds a little message for you.", button_text: "Continue", items: ["You make ordinary days fun", "Thanks for always listening", "You are my safe place", "Best friends, always"], sort_order: 1 },
  { type: "camera", title: "Capture a moment just for you", subtitle: "Tap the camera to print a memory", button_text: "Continue", items: [], options: { tapHint: "Tap the camera 📸" }, sort_order: 2 },
  { type: "memories", title: "Our favourite memories", subtitle: "A few moments I never want to forget.", button_text: "Continue", items: [], sort_order: 3 },
  { type: "letters", title: "A little note for you", subtitle: "Pick an envelope to read what is inside.", button_text: "Continue", items: ["Some people light up a room without trying. You do that every day.", "Thank you for every late-night talk and every silly laugh.", "I am always cheering for you, no matter what."], sort_order: 4 },
  { type: "finale", title: "One last thing", subtitle: "", button_text: "Replay", items: [], sort_order: 5 }
];
