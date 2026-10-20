// Starter data. It is copied into the database the first time the app runs (only into EMPTY tables),
// and after that everything is managed from /admin. Nothing here is read at runtime.
import type { Theme } from "@/lib/themes";

export const defaultThemes: Theme[] = [
  { id: "blush", name: "Blush Pink", emoji: "🌸", roseink: "#4c2638", berry: "#b84e73", petal: "#f7c6d4", blush: "#fff0f4", cream: "#fffaf5", bg: "#fffaf7", font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: "romantic", name: "Romantic Red", emoji: "❤️", roseink: "#3a1520", berry: "#c0283f", petal: "#f5b5bf", blush: "#ffecee", cream: "#fff7f6", bg: "#fff6f5", font: 'Georgia, "Times New Roman", serif' },
  { id: "lavender", name: "Lavender Dream", emoji: "💜", roseink: "#33274f", berry: "#7c5cbf", petal: "#d9ccf5", blush: "#f3eeff", cream: "#faf7ff", bg: "#faf8ff", font: 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif' },
  { id: "ocean", name: "Ocean Breeze", emoji: "🌊", roseink: "#18364a", berry: "#2b7a9b", petal: "#bfe3f0", blush: "#eaf7fc", cream: "#f6fcff", bg: "#f5fbfe", font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: "peach", name: "Sunset Peach", emoji: "🍑", roseink: "#4a2a1d", berry: "#d9653b", petal: "#ffd2b8", blush: "#fff0e6", cream: "#fffaf4", bg: "#fff8f2", font: 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif' },
  { id: "mint", name: "Mint Garden", emoji: "🌿", roseink: "#1f3a2e", berry: "#3f9a73", petal: "#c4ecd8", blush: "#eafaf2", cream: "#f6fffa", bg: "#f5fdf9", font: 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif' }
];

export type SeedStage = { type: string; title: string; subtitle: string; button_text: string; items: string[]; options?: Record<string, string> };
export type SeedOccasion = { slug: string; name: string; emoji: string; description: string; theme_id: string; effects: string[]; defaults: { friend_nickname: string; welcome_title: string; welcome_message: string; final_letter: string }; stages: SeedStage[] };

/** Used only if an admin deletes every occasion and someone still creates a surprise. */
export const fallbackStages: SeedStage[] = [
  { type: "intro", title: "Hey {name}, this is for you", subtitle: "I made something special.", button_text: "Open your surprise", items: [] },
  { type: "memories", title: "Our favourite memories", subtitle: "A few moments I never want to forget.", button_text: "Continue", items: [] },
  { type: "finale", title: "One last thing", subtitle: "", button_text: "Replay", items: [] }
];
export const fallbackDefaults = { friend_nickname: "{name}", welcome_title: "A little something for you", welcome_message: "I made this just for you.", final_letter: "Thank you for being you, {name}. 💗" };

function build(o: { ask: boolean; intro: string; sub: string; emoji: string; balloons: string[]; letters: string[]; finale: string }): SeedStage[] {
  const s: SeedStage[] = [];
  if (o.ask) s.push({ type: "ask", title: "Hey {name}! I made something for you 💗", subtitle: "Want to see it?", button_text: "Yes, show me!", items: ["Please? 🥺", "Pretty please? 🥹", "Okay, just one peek? 😿"], options: { noText: "No" } });
  s.push({ type: "intro", title: o.intro, subtitle: o.sub, button_text: "Open your surprise", items: [] });
  s.push({ type: "balloons", title: "Pop the balloons", subtitle: "Each one holds a little message for you.", button_text: "Continue", items: o.balloons, options: { emoji: o.emoji, popEmoji: "✨", doneMessage: "You popped them all! 💗" } });
  s.push({ type: "camera", title: "Capture a moment just for you", subtitle: "Tap the camera to print a memory", button_text: "Continue", items: [], options: { tapHint: "Tap the camera 📸" } });
  s.push({ type: "memories", title: "Our favourite memories", subtitle: "A few moments I never want to forget.", button_text: "Continue", items: [] });
  s.push({ type: "letters", title: "A little note for you", subtitle: "Pick an envelope to read what is inside.", button_text: "Continue", items: o.letters });
  s.push({ type: "finale", title: o.finale, subtitle: "", button_text: "Replay", items: [] });
  return s;
}

const R = [
  { slug: "birthday", name: "Birthday", emoji: "🎂", description: "A birthday surprise with balloons, photos and a letter.", theme_id: "peach", intro: "Happy Birthday, {name}! 🎂", sub: "Today is all about you. I put a few things together.", emoji2: "🎈", ask: true, balloons: ["You deserve the biggest cake", "Another year of being awesome", "Make a wish, it is your day", "Cheers to you, always"], letters: ["Some people make every birthday better just by being around. You are one of them.", "I hope this year is kinder, louder and happier than the last.", "Thank you for being you. Now go eat cake."], finale: "Make a wish ✨", letter: "Happy birthday, {name}! I hope today is full of cake, laughter and people who love you. Here is to another year of you being exactly you. 🎂" },
  { slug: "anniversary", name: "Anniversary", emoji: "💞", description: "Celebrate your years together.", theme_id: "romantic", intro: "Happy Anniversary, {name} 💞", sub: "Every year with you is my favourite chapter.", emoji2: "❤️", ask: true, balloons: ["Still choosing you", "Every day feels like home", "Thank you for loving me", "Here is to forever"], letters: ["From the first hello to today, you have made everything feel lighter.", "I love the little things: your laugh, your silence, your hand in mine.", "I would choose this life with you again, every single time."], finale: "To us 🥂", letter: "{name}, thank you for every moment we have shared. I love you more with each passing year. Happy anniversary. 💞" },
  { slug: "friendship", name: "Friendship", emoji: "💗", description: "A scrapbook for a best friend.", theme_id: "blush", intro: "Hey {name}, this is for you 💗", sub: "For the laughs, the chaos and all the little moments.", emoji2: "🎈", ask: true, balloons: ["You make ordinary days fun", "Thanks for always listening", "You are my safe place", "Best friends, always"], letters: ["Some people light up a room without trying. You do that every day.", "Thank you for every late-night talk and every silly laugh.", "I am always cheering for you, no matter what."], finale: "One last thing", letter: "Life is a little brighter with a friend like you in it, {name}. Thanks for being your wonderfully weird self. Best friends, always. 💗" },
  { slug: "love", name: "Love and proposal", emoji: "💌", description: "A love letter you can open together.", theme_id: "romantic", intro: "{name}, I have something to tell you 💌", sub: "Read slowly. It is all true.", emoji2: "💗", ask: true, balloons: ["You are my favourite person", "My heart is yours", "I am so lucky", "Always and forever"], letters: ["I did not know how much I could love someone until you.", "You make me want to be better in small ways every day.", "So here is my heart, and a question for you."], finale: "Will you? 💍", letter: "{name}, you are the best thing that ever happened to me. I love you more than I know how to say. 💌" },
  { slug: "wedding", name: "Wedding", emoji: "💍", description: "For the newlyweds.", theme_id: "lavender", intro: "Congratulations, {name}! 💍", sub: "Wishing you a lifetime of love and laughter.", emoji2: "🕊️", ask: false, balloons: ["Two hearts, one story", "Love looks good on you", "Cheers to the newlyweds", "A beautiful beginning"], letters: ["Watching you two together makes the world feel a little kinder.", "May every day be as happy as this one.", "Thank you for letting us be part of your story."], finale: "Happily ever after", letter: "{name}, congratulations on your wedding. May your home be full of love, laughter and good food. 💍" },
  { slug: "valentine", name: "Valentine's Day", emoji: "❤️", description: "A sweet Valentine's surprise.", theme_id: "romantic", intro: "Be mine, {name}? ❤️", sub: "A little Valentine just for you.", emoji2: "❤️", ask: true, balloons: ["You are my favourite hello", "My heart skips for you", "You make everything sweeter", "Forever my Valentine"], letters: ["Roses are red is old news. You are my favourite person.", "Thank you for making ordinary days feel special.", "Every love song makes sense when I think of you."], finale: "Happy Valentine's Day", letter: "{name}, you are my favourite person in the world. Happy Valentine's Day. ❤️" },
  { slug: "farewell", name: "Farewell", emoji: "👋", description: "Say goodbye with a smile.", theme_id: "ocean", intro: "We will miss you, {name} 👋", sub: "A few memories to take with you.", emoji2: "🎈", ask: false, balloons: ["You made this place better", "Thank you for everything", "We will keep in touch", "The best is yet to come"], letters: ["It will not feel the same without you.", "Thank you for the help, the jokes and the good times.", "Go and do great things. We will be cheering."], finale: "Until we meet again", letter: "{name}, thank you for everything. Wherever you go next, you will do wonderfully. Stay in touch! 👋" },
  { slug: "congratulations", name: "Congratulations", emoji: "🎓", description: "Celebrate a big win.", theme_id: "mint", intro: "Congratulations, {name}! 🎓", sub: "You did it, and we are so proud.", emoji2: "🎉", ask: false, balloons: ["All that hard work paid off", "Proud of you", "What a milestone", "On to the next adventure"], letters: ["You worked hard for this and it shows.", "Nobody deserves this more than you.", "Enjoy this moment. You earned every bit of it."], finale: "You did it!", letter: "{name}, congratulations on this achievement. We are so proud of you. The best is still ahead. 🎓" },
  { slug: "thank-you", name: "Thank you", emoji: "🙏", description: "Say thanks properly.", theme_id: "mint", intro: "Thank you, {name} 🙏", sub: "A small way of saying a big thing.", emoji2: "💐", ask: false, balloons: ["You helped more than you know", "Thank you for your kindness", "I am grateful for you", "You matter"], letters: ["I do not say it enough, but thank you.", "Your support meant more than you realise.", "I hope this makes you smile."], finale: "With gratitude", letter: "{name}, thank you for everything you have done. I am truly grateful for you. 🙏" },
  { slug: "get-well", name: "Get well soon", emoji: "🌷", description: "Cheer someone up.", theme_id: "mint", intro: "Get well soon, {name} 🌷", sub: "Sending you a little sunshine.", emoji2: "🌷", ask: false, balloons: ["Rest up, you have got this", "Thinking of you", "Better days are coming", "Sending hugs"], letters: ["Take all the time you need to feel better.", "We are all thinking of you.", "Come back soon. It is not the same without you."], finale: "Feel better soon", letter: "{name}, we are thinking of you and hoping you feel better very soon. Take care. 🌷" },
  { slug: "baby-shower", name: "Baby shower", emoji: "🍼", description: "Celebrate a new arrival.", theme_id: "ocean", intro: "Welcome, little one! 🍼", sub: "Congratulations, {name}, on the new arrival.", emoji2: "🍼", ask: false, balloons: ["A tiny new adventure", "So much love is coming", "Tiny toes, big love", "Cannot wait to meet them"], letters: ["You are going to be wonderful.", "Your family is about to get even better.", "We are here for you, every step."], finale: "Welcome to the world", letter: "{name}, congratulations. Wishing you and your little one health, joy and plenty of sleep. 🍼" },
  { slug: "parents", name: "Mother's or Father's Day", emoji: "🫶", description: "Honour a parent.", theme_id: "peach", intro: "Thank you, {name} 🫶", sub: "For everything you have done for me.", emoji2: "🌻", ask: false, balloons: ["You taught me so much", "Thank you for your love", "Always there for me", "Best parent ever"], letters: ["I can never repay what you have done for me.", "Everything good in me started with you.", "I love you more than words can say."], finale: "With love", letter: "{name}, thank you for your love, patience and sacrifices. I love you. 🫶" },
  { slug: "diwali", name: "Diwali", emoji: "🪔", description: "A festival of lights greeting.", theme_id: "peach", intro: "Happy Diwali, {name}! 🪔", sub: "May this festival of lights brighten your life.", emoji2: "🪔", ask: false, balloons: ["May your home glow with joy", "Sweets and sparkle for you", "Light over darkness", "Prosperity and peace"], letters: ["Wishing you a Diwali full of light and laughter.", "May the lamps bring you happiness all year.", "Enjoy the sweets and the sparkle."], finale: "Shubh Deepavali", letter: "{name}, wishing you and your family a very happy and prosperous Diwali. 🪔" },
  { slug: "eid", name: "Eid", emoji: "🌙", description: "An Eid greeting.", theme_id: "mint", intro: "Eid Mubarak, {name}! 🌙", sub: "Wishing you joy, peace and blessings.", emoji2: "🌙", ask: false, balloons: ["Eid Mubarak", "May your prayers be answered", "Peace and happiness", "Blessings to you"], letters: ["May this Eid bring you closer to the people you love.", "Wishing you a day full of joy and good food.", "Thank you for being part of my life."], finale: "Eid Mubarak", letter: "{name}, Eid Mubarak. May Allah bless you and your family with peace and happiness. 🌙" },
  { slug: "rakhi", name: "Raksha Bandhan", emoji: "🧿", description: "For brothers and sisters.", theme_id: "peach", intro: "Happy Raksha Bandhan, {name}! 🧿", sub: "For the one who always has my back.", emoji2: "🎁", ask: false, balloons: ["Partner in crime", "My protector", "Always there for me", "Best sibling ever"], letters: ["Thank you for every fight we survived together.", "You are always there, even when I do not say it.", "I am lucky to have you."], finale: "Always by your side", letter: "{name}, happy Raksha Bandhan. Thank you for being the best sibling I could ask for. 🧿" },
  { slug: "christmas", name: "Christmas", emoji: "🎄", description: "A Christmas greeting.", theme_id: "romantic", intro: "Merry Christmas, {name}! 🎄", sub: "Wishing you warmth and joy.", emoji2: "🎄", ask: false, balloons: ["Joy to you", "Cosy nights ahead", "Sweet treats and cheer", "Peace and love"], letters: ["May your Christmas be full of warmth and good company.", "Thank you for making this year better.", "Wishing you a very merry holiday."], finale: "Merry Christmas", letter: "{name}, merry Christmas. I hope your day is full of love, laughter and good food. 🎄" },
  { slug: "new-year", name: "New Year", emoji: "🎆", description: "Start the year with a smile.", theme_id: "ocean", intro: "Happy New Year, {name}! 🎆", sub: "Here is to a brand new chapter.", emoji2: "🎆", ask: false, balloons: ["New year, new energy", "Bigger dreams ahead", "Cheers to us", "Make it count"], letters: ["Thank you for being part of my year.", "May the next one be kinder and brighter.", "I cannot wait to see what you do next."], finale: "Cheers to the new year", letter: "{name}, happy New Year. May it bring you happiness, health and everything you are hoping for. 🎆" },
  { slug: "custom", name: "Something else", emoji: "🎁", description: "Any other moment you want to celebrate.", theme_id: "blush", intro: "Hey {name}, this is for you 🎁", sub: "I made this just for you.", emoji2: "🎈", ask: false, balloons: ["Thinking of you", "You are special", "This is for you", "Thank you for being you"], letters: ["I wanted to make something that would make you smile.", "Thank you for being in my life.", "I hope you enjoy this."], finale: "One last thing", letter: "{name}, I hope this made you smile. Thank you for being you. 🎁" },
]

export const defaultOccasions: SeedOccasion[] = R.map(r => ({
  slug: r.slug, name: r.name, emoji: r.emoji, description: r.description, theme_id: r.theme_id, effects: ["hearts", "confetti"],
  defaults: { friend_nickname: "{name}", welcome_title: r.intro, welcome_message: r.sub, final_letter: r.letter },
  stages: build({ ask: r.ask, intro: r.intro, sub: r.sub, emoji: r.emoji2, balloons: r.balloons, letters: r.letters, finale: r.finale })
}));

export const defaultPlatformSettings: Record<string, string> = {
  brand_name: "Surprise4U",
  landing_hero_title: "Make a surprise they will never forget",
  landing_hero_subtitle: "Turn your photos, memories and a few kind words into a private, animated website. Share one link and a password with the person you made it for.",
  landing_cta_text: "Continue with Google",
  landing_steps: JSON.stringify([
    { title: "Sign in with Google", text: "No new password to remember. Your account is ready in one tap." },
    { title: "Pick an occasion and add your memories", text: "Choose a ready-made template, then add photos, stories, music and letters." },
    { title: "Share the link and password", text: "Send them your private link. They open it with the password you set." }
  ]),
  landing_features: JSON.stringify([
    { emoji: "🔒", title: "Private by default", text: "Every surprise has its own link and its own password. Nobody else can open it." },
    { emoji: "📸", title: "Photos and stories", text: "Add memories with captions, dates and as many photos as you like." },
    { emoji: "🎵", title: "Music and letters", text: "Set a song and write notes they open one at a time." },
    { emoji: "🎨", title: "Themes for every mood", text: "Pick colours and fonts that match the occasion." }
  ]),
  landing_faq: JSON.stringify([
    { q: "Does the person I send it to need an account?", a: "No. They open your link, type the password you gave them, and watch the surprise." },
    { q: "Who can see my photos?", a: "Only people who have both your link and your password. You can change the password or unpublish at any time." },
    { q: "Can I edit it after sharing?", a: "Yes. Changes show up the next time they open the link." },
    { q: "Is it free?", a: "You can create surprises for free within the limits shown in your dashboard." }
  ]),
  demo_url: "",
  contact_email: "",
  default_theme_id: "blush",
  max_surprises_per_user: "5",
  max_storage_mb: "100"
};
