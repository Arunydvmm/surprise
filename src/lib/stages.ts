export const STAGE_TYPES = ["ask", "intro", "balloons", "camera", "memories", "letters", "finale"] as const;
export type StageType = typeof STAGE_TYPES[number];
export type Stage = { id: string; type: StageType; title: string; subtitle: string; button_text: string; items: string[]; enabled: boolean; sort_order: number; options?: Record<string, string> };
export const EFFECTS = ["hearts", "confetti"] as const;
export const defaultStages: Stage[] = [
  { id: "d-ask", type: "ask", title: "Hey! I made something for you 💗", subtitle: "Want to see it?", button_text: "Yes, show me!", items: ["Please? 🥺", "Pretty please? 🥹"], enabled: true, sort_order: -1, options: { noText: "No" } },
  { id: "d0", type: "intro", title: "A little place for our memories", subtitle: "For the laughs, the chaos, and all the little moments.", button_text: "Open your surprise", items: [], enabled: true, sort_order: 0 },
  { id: "d1", type: "memories", title: "Our favourite memories", subtitle: "", button_text: "Continue", items: [], enabled: true, sort_order: 1 },
  { id: "d2", type: "finale", title: "One last thing", subtitle: "", button_text: "Replay", items: [], enabled: true, sort_order: 2 }
];
