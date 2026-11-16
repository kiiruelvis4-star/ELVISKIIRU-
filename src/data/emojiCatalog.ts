// Comprehensive Keyboard-Style Emoji Catalog & Semantic Meaning Dictionary for Elsie AI
// Covers all standard keyboard categories, real conversational meanings, and school-safe AI etiquette.

export type EmojiCategoryId =
  | 'recent'
  | 'smileys'
  | 'gestures'
  | 'hearts'
  | 'nature'
  | 'food'
  | 'activities'
  | 'school'
  | 'travel';

export type EmojiTone =
  | 'joy'
  | 'warmth'
  | 'playful'
  | 'curious'
  | 'thinking'
  | 'vulnerable'
  | 'oops'
  | 'welcoming'
  | 'celebration'
  | 'affection'
  | 'school'
  | 'calm'
  | 'caution';

export interface EmojiEntry {
  emoji: string;
  name: string;
  keywords: string[];
  meaning: string;
  aiGuidance: string;
  tone: EmojiTone;
  category: Exclude<EmojiCategoryId, 'recent'>;
}

export const EMOJI_CATEGORIES: Array<{
  id: EmojiCategoryId;
  icon: string;
  label: string;
}> = [
  { id: 'recent', icon: '🕒', label: 'Recent' },
  { id: 'smileys', icon: '😀', label: 'Smileys' },
  { id: 'gestures', icon: '👋', label: 'Hands' },
  { id: 'hearts', icon: '❤️', label: 'Symbols' },
  { id: 'nature', icon: '🌹', label: 'Nature' },
  { id: 'food', icon: '🍎', label: 'Food' },
  { id: 'activities', icon: '⚽', label: 'Sports' },
  { id: 'school', icon: '📚', label: 'School' },
  { id: 'travel', icon: '🇰🇪', label: 'Places' },
];

export const DEFAULT_RECENT_EMOJIS: string[] = [
  '😂',
  '😊',
  '😉',
  '🥺',
  '👀',
  '🤦',
  '👐',
  '🤔',
  '🥰',
  '❤️',
  '😜',
  '🔥',
  '🙏',
  '✨',
  '📚',
  '🎓',
];

// Explicit semantic definitions for expressive emojis (including all user-highlighted examples)
export const FEATURED_EMOJI_ENTRIES: EmojiEntry[] = [
  // --- SMILEYS & EMOTION ---
  {
    emoji: '😂',
    name: 'Face with Tears of Joy',
    keywords: ['laugh', 'funny', 'haha', 'lol', 'joy', 'happy', 'comedy'],
    meaning: 'Laughing heartily at something funny or lighthearted',
    aiGuidance: 'Share the cheer warmly; never laugh at a learner who is struggling.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '🤣',
    name: 'Rolling on the Floor Laughing',
    keywords: ['rofl', 'hilarious', 'laugh', 'funny', 'haha'],
    meaning: 'Finding something super hilarious and joyful',
    aiGuidance: 'Respond with upbeat humor and friendly warmth.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '😊',
    name: 'Smiling Face with Smiling Eyes',
    keywords: ['smile', 'warm', 'kind', 'happy', 'friendly', 'polite'],
    meaning: 'Warm, friendly, polite, and content',
    aiGuidance: 'Greet warmly and keep a helpful, encouraging tone.',
    tone: 'warmth',
    category: 'smileys',
  },
  {
    emoji: '😉',
    name: 'Winking Face',
    keywords: ['wink', 'hint', 'playful', 'friendly', 'clever', 'secret'],
    meaning: 'Playful encouragement, clever hint, or friendly inside joke',
    aiGuidance: 'Keep it playful, positive, and respectful; never flirtatious.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '🥺',
    name: 'Pleading Face',
    keywords: ['plead', 'puppy eyes', 'please', 'sad', 'help', 'nervous', 'cute'],
    meaning: 'Feeling vulnerable, asking gently for help, or needing extra kindness',
    aiGuidance: 'Respond gently with reassurance, patience, and step-by-step support.',
    tone: 'vulnerable',
    category: 'smileys',
  },
  {
    emoji: '🥹',
    name: 'Face Holding Back Tears',
    keywords: ['touched', 'proud', 'emotional', 'grateful', 'moved'],
    meaning: 'Deeply touched, proud, or softly emotional',
    aiGuidance: 'Acknowledge feelings warmly and affirm their effort.',
    tone: 'warmth',
    category: 'smileys',
  },
  {
    emoji: '🤔',
    name: 'Thinking Face',
    keywords: ['think', 'wonder', 'question', 'curious', 'confused', 'hmm'],
    meaning: 'Puzzling over a question, reflecting, or wanting clarity',
    aiGuidance: 'Break down the explanation clearly and step-by-step.',
    tone: 'thinking',
    category: 'smileys',
  },
  {
    emoji: '🥰',
    name: 'Smiling Face with Hearts',
    keywords: ['love', 'appreciate', 'warm', 'care', 'grateful', 'proud'],
    meaning: 'Deep appreciation, warmth, pride, or affectionate gratitude',
    aiGuidance: 'Respond with respectful warmth and school-family appreciation.',
    tone: 'affection',
    category: 'smileys',
  },
  {
    emoji: '😜',
    name: 'Winking Face with Tongue',
    keywords: ['silly', 'playful', 'tease', 'fun', 'joke', 'goofy'],
    meaning: 'Lighthearted silliness, playful teasing, or fun energy',
    aiGuidance: 'Match with cheerful, age-appropriate fun while staying helpful.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '😛',
    name: 'Face with Tongue',
    keywords: ['playful', 'silly', 'joke', 'fun'],
    meaning: 'Playful, cheerful, or teasing lightly',
    aiGuidance: 'Keep responses lighthearted and encouraging.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '😝',
    name: 'Squinting Face with Tongue',
    keywords: ['haha', 'silly', 'playful', 'fun'],
    meaning: 'Big playful energy or silly excitement',
    aiGuidance: 'Keep a cheerful, friendly tone.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '🤪',
    name: 'Zany Face',
    keywords: ['crazy', 'wild', 'silly', 'funny', 'goofy'],
    meaning: 'Goofy, energetic, or playful mood',
    aiGuidance: 'Channel energy into curiosity or fun learning.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '😀',
    name: 'Grinning Face',
    keywords: ['happy', 'smile', 'cheerful', 'hello'],
    meaning: 'Bright happiness and cheerful energy',
    aiGuidance: 'Greet cheerfully and assist eagerly.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '😃',
    name: 'Grinning Face with Big Eyes',
    keywords: ['excited', 'happy', 'smile', 'great'],
    meaning: 'Enthusiastic and excited',
    aiGuidance: 'Match enthusiasm constructively.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '😄',
    name: 'Grinning Face with Smiling Eyes',
    keywords: ['happy', 'joy', 'laugh', 'glad'],
    meaning: 'Genuine happiness and upbeat mood',
    aiGuidance: 'Respond warmly and positively.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '😁',
    name: 'Beaming Face with Smiling Eyes',
    keywords: ['grin', 'proud', 'happy', 'cheese'],
    meaning: 'Big proud grin or excitement',
    aiGuidance: 'Celebrate their positive energy.',
    tone: 'joy',
    category: 'smileys',
  },
  {
    emoji: '😅',
    name: 'Grinning Face with Sweat',
    keywords: ['nervous', 'phew', 'awkward', 'oops', 'relief'],
    meaning: 'Nervous laugh, relief, or "phew, that was close!"',
    aiGuidance: 'Reassure calmly and take away pressure.',
    tone: 'oops',
    category: 'smileys',
  },
  {
    emoji: '😇',
    name: 'Smiling Face with Halo',
    keywords: ['innocent', 'good', 'angel', 'helpful', 'kind'],
    meaning: 'Sweet, innocent, or proud of doing the right thing',
    aiGuidance: 'Commend kindness and good character.',
    tone: 'warmth',
    category: 'smileys',
  },
  {
    emoji: '🙂',
    name: 'Slightly Smiling Face',
    keywords: ['smile', 'okay', 'calm', 'polite'],
    meaning: 'Calm, polite, or gently positive',
    aiGuidance: 'Keep a clear, polite, reassuring tone.',
    tone: 'calm',
    category: 'smileys',
  },
  {
    emoji: '🙃',
    name: 'Upside-Down Face',
    keywords: ['silly', 'irony', 'confused', 'oops'],
    meaning: 'Playful irony or feeling upside-down about a tricky problem',
    aiGuidance: 'Help turn confusion into clarity kindly.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '😌',
    name: 'Relieved Face',
    keywords: ['calm', 'peace', 'relief', 'relaxed'],
    meaning: 'Peaceful, relieved, and settled',
    aiGuidance: 'Keep a calm, steady pace.',
    tone: 'calm',
    category: 'smileys',
  },
  {
    emoji: '😍',
    name: 'Smiling Face with Heart-Eyes',
    keywords: ['love', 'amazing', 'adore', 'wow', 'favorite'],
    meaning: 'Loving or admiring a subject, achievement, or idea',
    aiGuidance: 'Celebrate what they admire while staying respectful and academic.',
    tone: 'affection',
    category: 'smileys',
  },
  {
    emoji: '🤩',
    name: 'Star-Struck',
    keywords: ['wow', 'amazed', 'star', 'awesome', 'excited'],
    meaning: 'Amazed, inspired, and super excited',
    aiGuidance: 'Encourage that curiosity and momentum.',
    tone: 'celebration',
    category: 'smileys',
  },
  {
    emoji: '🥳',
    name: 'Partying Face',
    keywords: ['party', 'celebrate', 'congrats', 'win', 'birthday'],
    meaning: 'Celebrating a win, milestone, or big success',
    aiGuidance: 'Celebrate their achievement warmly!',
    tone: 'celebration',
    category: 'smileys',
  },
  {
    emoji: '😎',
    name: 'Smiling Face with Sunglasses',
    keywords: ['cool', 'confident', 'boss', 'ready', 'chill'],
    meaning: 'Confident, cool, and ready to succeed',
    aiGuidance: 'Affirm confidence and keep momentum high.',
    tone: 'celebration',
    category: 'smileys',
  },
  {
    emoji: '🤓',
    name: 'Nerd Face',
    keywords: ['study', 'smart', 'geek', 'glasses', 'learn', 'brainy'],
    meaning: 'In study mode, nerdy excitement, or loving learning',
    aiGuidance: 'Dive into fun facts and clear academic depth.',
    tone: 'school',
    category: 'smileys',
  },
  {
    emoji: '🧐',
    name: 'Face with Monocle',
    keywords: ['inspect', 'curious', 'analyze', 'examine', 'detective'],
    meaning: 'Examining details carefully or investigating closely',
    aiGuidance: 'Provide precise, evidence-based details.',
    tone: 'curious',
    category: 'smileys',
  },
  {
    emoji: '🤨',
    name: 'Face with Raised Eyebrow',
    keywords: ['skeptical', 'doubt', 'question', 'really'],
    meaning: 'Doubtful, questioning, or wanting proof',
    aiGuidance: 'Clarify patiently with real facts from school records.',
    tone: 'thinking',
    category: 'smileys',
  },
  {
    emoji: '🤗',
    name: 'Hugging Face',
    keywords: ['hug', 'warm', 'welcome', 'care', 'support'],
    meaning: 'Warm hug, openness, and supportive kindness',
    aiGuidance: 'Mirror warm hospitality and encouragement.',
    tone: 'welcoming',
    category: 'smileys',
  },
  {
    emoji: '🤭',
    name: 'Face with Hand Over Mouth',
    keywords: ['giggle', 'oops', 'shy', 'secret'],
    meaning: 'Shy giggle or a small "oops" moment',
    aiGuidance: 'Respond gently and lightly.',
    tone: 'playful',
    category: 'smileys',
  },
  {
    emoji: '🫡',
    name: 'Saluting Face',
    keywords: ['respect', 'yes', 'ready', 'sir', 'maam', 'duty'],
    meaning: 'Respectful readiness ("Aye aye! Ready to do my best")',
    aiGuidance: 'Acknowledge respect and readiness.',
    tone: 'warmth',
    category: 'smileys',
  },
  {
    emoji: '😬',
    name: 'Grimacing Face',
    keywords: ['awkward', 'oops', 'nervous', 'uhoh'],
    meaning: 'Feeling awkward, nervous, or worried about a slip-up',
    aiGuidance: 'Reassure calmly — mistakes are part of CBC growth.',
    tone: 'oops',
    category: 'smileys',
  },
  {
    emoji: '😔',
    name: 'Pensive Face',
    keywords: ['sad', 'down', 'disappointed', 'quiet', 'low'],
    meaning: 'Feeling discouraged, quiet, or disappointed',
    aiGuidance: 'Offer gentle encouragement and practical next steps.',
    tone: 'vulnerable',
    category: 'smileys',
  },
  {
    emoji: '😟',
    name: 'Worried Face',
    keywords: ['worried', 'anxious', 'concerned', 'nervous'],
    meaning: 'Feeling anxious or concerned about something',
    aiGuidance: 'Reassure clearly and break the worry into small steps.',
    tone: 'vulnerable',
    category: 'smileys',
  },
  {
    emoji: '😕',
    name: 'Confused Face',
    keywords: ['confused', 'lost', 'unsure', 'puzzle'],
    meaning: 'Unsure or needing clearer explanation',
    aiGuidance: 'Simplify and walk through an example slowly.',
    tone: 'thinking',
    category: 'smileys',
  },
  {
    emoji: '😢',
    name: 'Crying Face',
    keywords: ['cry', 'sad', 'upset', 'hurt', 'tears'],
    meaning: 'Feeling hurt, sad, or upset',
    aiGuidance: 'Respond with sincere kindness and support; check if adult help is needed.',
    tone: 'vulnerable',
    category: 'smileys',
  },
  {
    emoji: '😭',
    name: 'Loudly Crying Face',
    keywords: ['sob', 'overwhelmed', 'crying', 'stressed', 'laughing hard'],
    meaning: 'Either overwhelmed/very upset OR laughing super hard depending on context',
    aiGuidance: 'Check surrounding words carefully: comfort gently if stressed, or laugh warmly if playful.',
    tone: 'vulnerable',
    category: 'smileys',
  },
  {
    emoji: '🤯',
    name: 'Exploding Head',
    keywords: ['mind blown', 'amazed', 'shocked', 'wow', 'hard'],
    meaning: 'Mind blown by an amazing fact OR overwhelmed by a tricky topic',
    aiGuidance: 'Clarify gently or celebrate the "aha!" discovery.',
    tone: 'curious',
    category: 'smileys',
  },
  {
    emoji: '😴',
    name: 'Sleeping Face',
    keywords: ['sleep', 'tired', 'rest', 'night', 'bedtime'],
    meaning: 'Tired, sleepy, or saying goodnight',
    aiGuidance: 'Remind learners gently to rest well while noting AI stays awake.',
    tone: 'calm',
    category: 'smileys',
  },
  {
    emoji: '🥱',
    name: 'Yawning Face',
    keywords: ['yawn', 'sleepy', 'tired', 'bored'],
    meaning: 'Feeling sleepy or needing an engaging break',
    aiGuidance: 'Keep things brief, energizing, or suggest rest.',
    tone: 'calm',
    category: 'smileys',
  },
  {
    emoji: '😤',
    name: 'Face with Steam From Nose',
    keywords: ['frustrated', 'determined', 'grr', 'huff'],
    meaning: 'Frustrated OR fiercely determined to overcome a challenge',
    aiGuidance: 'Acknowledge effort calmly and guide toward a quick win.',
    tone: 'caution',
    category: 'smileys',
  },
  {
    emoji: '😠',
    name: 'Angry Face',
    keywords: ['angry', 'mad', 'upset', 'annoyed'],
    meaning: 'Feeling upset or frustrated',
    aiGuidance: 'Stay calm, polite, and constructive; never mirror anger.',
    tone: 'caution',
    category: 'smileys',
  },

  // --- PEOPLE & GESTURES ---
  {
    emoji: '👀',
    name: 'Eyes',
    keywords: ['eyes', 'look', 'watch', 'check', 'curious', 'see', 'notice'],
    meaning: 'Looking closely, checking details, or saying "let me see this!"',
    aiGuidance: 'Highlight key facts, real marks, or interesting details right away.',
    tone: 'curious',
    category: 'gestures',
  },
  {
    emoji: '🤦',
    name: 'Person Facepalming',
    keywords: ['facepalm', 'oops', 'silly', 'mistake', 'duh', 'doh'],
    meaning: 'Realizing a silly mistake or saying "oops, I missed that!"',
    aiGuidance: 'Respond with gentle kindness — never tease or shame; help fix it cleanly.',
    tone: 'oops',
    category: 'gestures',
  },
  {
    emoji: '👐',
    name: 'Open Hands',
    keywords: ['open', 'welcome', 'honest', 'hug', 'ready', 'share'],
    meaning: 'Openness, warm welcome, honesty, and readiness to receive help',
    aiGuidance: 'Welcome openly and share clear, honest guidance.',
    tone: 'welcoming',
    category: 'gestures',
  },
  {
    emoji: '👋',
    name: 'Waving Hand',
    keywords: ['hi', 'hello', 'bye', 'wave', 'greetings'],
    meaning: 'Friendly hello or goodbye wave',
    aiGuidance: 'Greet or bid farewell warmly.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '🙏',
    name: 'Folded Hands',
    keywords: ['please', 'thank you', 'thanks', 'pray', 'asante', 'grateful'],
    meaning: 'Gratitude ("Asante!"), polite request ("Please"), or blessing',
    aiGuidance: 'Respond politely with gratitude and readiness to help.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '🙌',
    name: 'Raising Hands',
    keywords: ['hooray', 'praise', 'celebrate', 'win', 'yay'],
    meaning: 'Celebration, joy, or cheering ("Hooray!")',
    aiGuidance: 'Celebrate the milestone or good news!',
    tone: 'celebration',
    category: 'gestures',
  },
  {
    emoji: '👏',
    name: 'Clapping Hands',
    keywords: ['clap', 'bravo', 'applause', 'congrats', 'well done'],
    meaning: 'Applauding effort, progress, or great work',
    aiGuidance: 'Affirm and encourage continued growth.',
    tone: 'celebration',
    category: 'gestures',
  },
  {
    emoji: '🤝',
    name: 'Handshake',
    keywords: ['deal', 'agree', 'team', 'partner', 'trust'],
    meaning: 'Partnership, agreement, and teamwork (school + parent + learner)',
    aiGuidance: 'Reinforce collaboration and trust.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '👍',
    name: 'Thumbs Up',
    keywords: ['ok', 'good', 'yes', 'agree', 'nice', 'poa'],
    meaning: 'Approval, agreement, or "Sounds good!"',
    aiGuidance: 'Confirm clearly and keep moving forward.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '👎',
    name: 'Thumbs Down',
    keywords: ['no', 'bad', 'disagree', 'dislike'],
    meaning: 'Disagreement or dissatisfaction',
    aiGuidance: 'Ask politely how Elsie can improve the answer.',
    tone: 'caution',
    category: 'gestures',
  },
  {
    emoji: '👌',
    name: 'OK Hand',
    keywords: ['ok', 'perfect', 'great', 'spot on'],
    meaning: 'Everything is clear, accurate, and good',
    aiGuidance: 'Acknowledge smoothly.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '✌️',
    name: 'Victory Hand',
    keywords: ['peace', 'victory', 'win', 'two', 'chill'],
    meaning: 'Peace, positivity, or victory',
    aiGuidance: 'Stay upbeat and encouraging.',
    tone: 'playful',
    category: 'gestures',
  },
  {
    emoji: '🤞',
    name: 'Crossed Fingers',
    keywords: ['luck', 'hope', 'wish', 'fingers crossed'],
    meaning: 'Hoping for good luck or a positive outcome',
    aiGuidance: 'Encourage effort and calm preparation.',
    tone: 'warmth',
    category: 'gestures',
  },
  {
    emoji: '🫶',
    name: 'Heart Hands',
    keywords: ['love', 'support', 'care', 'appreciate'],
    meaning: 'Warm support, care, and appreciation',
    aiGuidance: 'Reciprocate with kind academic support.',
    tone: 'affection',
    category: 'gestures',
  },
  {
    emoji: '💪',
    name: 'Flexed Biceps',
    keywords: ['strong', 'effort', 'encourage', 'motivation', 'power'],
    meaning: 'Strength, determination, and "You’ve got this!"',
    aiGuidance: 'Boost confidence and perseverance.',
    tone: 'celebration',
    category: 'gestures',
  },
  {
    emoji: '🧠',
    name: 'Brain',
    keywords: ['smart', 'think', 'mind', 'study', 'logic', 'intelligence'],
    meaning: 'Deep thinking, smart insight, or brainpower',
    aiGuidance: 'Deliver clear, thoughtful reasoning.',
    tone: 'thinking',
    category: 'gestures',
  },
  {
    emoji: '🤷',
    name: 'Person Shrugging',
    keywords: ['idk', 'unsure', 'maybe', 'shrug', 'confused'],
    meaning: 'Not sure yet or wondering what comes next',
    aiGuidance: 'Offer clear options and gentle guidance.',
    tone: 'thinking',
    category: 'gestures',
  },
  {
    emoji: '🙋',
    name: 'Person Raising Hand',
    keywords: ['question', 'me', 'ask', 'volunteer', 'answer'],
    meaning: 'Raising a hand in class to ask or participate',
    aiGuidance: 'Respond like an attentive teacher welcoming a question.',
    tone: 'school',
    category: 'gestures',
  },
  {
    emoji: '✍️',
    name: 'Writing Hand',
    keywords: ['write', 'notes', 'homework', 'essay', 'draft'],
    meaning: 'Taking notes, drafting, or doing written work',
    aiGuidance: 'Help structure writing or notes cleanly.',
    tone: 'school',
    category: 'gestures',
  },

  // --- HEARTS & SYMBOLS ---
  {
    emoji: '❤️',
    name: 'Red Heart',
    keywords: ['love', 'heart', 'care', 'thanks', 'family', 'rose'],
    meaning: 'Genuine care, gratitude, and family warmth',
    aiGuidance: 'Acknowledge warmly & respectfully as an academic AI (never romantically).',
    tone: 'affection',
    category: 'hearts',
  },
  {
    emoji: '🔥',
    name: 'Fire',
    keywords: ['fire', 'awesome', 'lit', 'hot', 'amazing', 'streak', 'fiti'],
    meaning: 'Awesome work, high energy, or "on fire!" excitement',
    aiGuidance: 'Celebrate great energy and keep the learning streak going!',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '✨',
    name: 'Sparkles',
    keywords: ['sparkle', 'magic', 'ai', 'shine', 'special', 'great'],
    meaning: 'Bright insight, creativity, and shining effort',
    aiGuidance: 'Use lightly to highlight helpful insights.',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '🌟',
    name: 'Glowing Star',
    keywords: ['star', 'excellent', 'ee', 'shine', 'gold'],
    meaning: 'Shining achievement and Exceeding Expectations',
    aiGuidance: 'Celebrate strong mastery.',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '💯',
    name: 'Hundred Points',
    keywords: ['100', 'perfect', 'agree', 'full marks', 'facts'],
    meaning: 'Total agreement or aiming for 100% effort',
    aiGuidance: 'Reinforce accuracy and great effort.',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '✅',
    name: 'Check Mark Button',
    keywords: ['done', 'yes', 'correct', 'verified', 'pass'],
    meaning: 'Confirmed, correct, or completed',
    aiGuidance: 'Keep confirmation crisp and clear.',
    tone: 'calm',
    category: 'hearts',
  },
  {
    emoji: '🎯',
    name: 'Bullseye',
    keywords: ['goal', 'focus', 'target', 'aim', 'focus zone'],
    meaning: 'Staying focused on a clear learning goal or Focus Zone target',
    aiGuidance: 'Tie back to specific strands or goals.',
    tone: 'school',
    category: 'hearts',
  },
  {
    emoji: '🏆',
    name: 'Trophy',
    keywords: ['win', 'champion', 'award', 'best', 'success'],
    meaning: 'Celebrating hard-earned success and growth',
    aiGuidance: 'Affirm personal mastery without comparing learners.',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '⚡',
    name: 'High Voltage',
    keywords: ['fast', 'energy', 'spark', 'quick', 'power'],
    meaning: 'Quick energy, alertness, and fast thinking',
    aiGuidance: 'Give crisp, energetic help.',
    tone: 'celebration',
    category: 'hearts',
  },
  {
    emoji: '💡',
    name: 'Light Bulb',
    keywords: ['idea', 'tip', 'aha', 'smart', 'hint'],
    meaning: 'Bright idea, helpful tip, or "Aha!" moment',
    aiGuidance: 'Share a practical tip or insight.',
    tone: 'thinking',
    category: 'hearts',
  },
  {
    emoji: '🌹',
    name: 'Rose',
    keywords: ['rose', 'little roses', 'flower', 'school', 'care'],
    meaning: 'Little Roses Academy emblem — "Much from Little" growth & care',
    aiGuidance: 'Signature Little Roses warmth and encouragement.',
    tone: 'warmth',
    category: 'nature',
  },
  {
    emoji: '📚',
    name: 'Books',
    keywords: ['books', 'study', 'read', 'cbc', 'revision', 'homework'],
    meaning: 'Studying, revising CBC topics, or reading Assessment Books',
    aiGuidance: 'Offer structured study or CBC guidance.',
    tone: 'school',
    category: 'school',
  },
  {
    emoji: '🎓',
    name: 'Graduation Cap',
    keywords: ['graduate', 'pathway', 'senior school', 'academic', 'learner'],
    meaning: 'Academic achievement and Kenyan Senior School Pathways',
    aiGuidance: 'Connect to CBC mastery and Senior Pathways.',
    tone: 'school',
    category: 'school',
  },
];

// Compact packed emoji lists per keyboard category so every standard keyboard section is rich & complete
// Note: Hostile/obscene/NSFW emojis are intentionally omitted from the school picker.
const CATEGORY_PACKS: Array<{
  category: Exclude<EmojiCategoryId, 'recent'>;
  items: Array<[string, string, string]>; // [emoji, name, extraKeywords]
}> = [
  {
    category: 'smileys',
    items: [
      ['😀', 'Grinning Face', 'happy smile'],
      ['😃', 'Grinning Big Eyes', 'excited glad'],
      ['😄', 'Grinning Smiling Eyes', 'joy cheerful'],
      ['😁', 'Beaming Face', 'proud grin'],
      ['😆', 'Grinning Squinting', 'laugh haha'],
      ['😅', 'Grinning Sweat', 'phew nervous'],
      ['🤣', 'ROFL Laughing', 'hilarious funny'],
      ['😂', 'Tears of Joy', 'laugh funny lol'],
      ['🙂', 'Slightly Smiling', 'calm polite'],
      ['🙃', 'Upside-Down Face', 'silly irony'],
      ['🫠', 'Melting Face', 'awkward heat'],
      ['😉', 'Winking Face', 'wink hint playful'],
      ['😊', 'Smiling Eyes', 'warm kind friendly'],
      ['😇', 'Smiling Halo', 'good angel'],
      ['🥰', 'Smiling with Hearts', 'warmth love grateful'],
      ['😍', 'Heart Eyes', 'love amaze'],
      ['🤩', 'Star-Struck', 'wow inspired'],
      ['😘', 'Blowing a Kiss', 'sweet bye'],
      ['😗', 'Kissing Face', 'sweet'],
      ['😚', 'Kissing Closed Eyes', 'sweet'],
      ['😙', 'Kissing Smiling Eyes', 'sweet'],
      ['🥲', 'Smiling with Tear', 'proud touched'],
      ['😋', 'Savoring Food', 'yummy tasty'],
      ['😛', 'Face with Tongue', 'playful silly'],
      ['😜', 'Winking Tongue', 'playful fun tease'],
      ['🤪', 'Zany Face', 'goofy wild'],
      ['😝', 'Squinting Tongue', 'silly joke'],
      ['🤑', 'Money-Mouth', 'wealth'],
      ['🤗', 'Hugging Face', 'hug care support'],
      ['🤭', 'Hand Over Mouth', 'giggle oops'],
      ['🫢', 'Open Eyes Hand Over Mouth', 'gasp surprise'],
      ['🫣', 'Peeking Eye', 'peek shy nervous'],
      ['🤫', 'Shushing Face', 'quiet secret'],
      ['🤔', 'Thinking Face', 'think wonder hmm'],
      ['🫡', 'Saluting Face', 'respect ready'],
      ['🤐', 'Zipper Mouth', 'quiet secret'],
      ['🤨', 'Raised Eyebrow', 'doubt question'],
      ['😐', 'Neutral Face', 'blank plain'],
      ['😑', 'Expressionless', 'tired flat'],
      ['😶', 'No Mouth', 'speechless'],
      ['🫥', 'Dotted Line Face', 'shy invisible'],
      ['😏', 'Smirking Face', 'confident wry'],
      ['😒', 'Unamused Face', 'unimpressed'],
      ['🙄', 'Rolling Eyes', 'annoyed'],
      ['😬', 'Grimacing Face', 'oops awkward'],
      ['😮‍💨', 'Exhaling Face', 'relief sigh'],
      ['🤥', 'Lying Face', 'fib'],
      ['😌', 'Relieved Face', 'peace calm'],
      ['😔', 'Pensive Face', 'sad down'],
      ['😪', 'Sleepy Face', 'tired'],
      ['🤤', 'Drooling Face', 'hungry'],
      ['😴', 'Sleeping Face', 'sleep rest night'],
      ['😷', 'Medical Mask', 'sick health'],
      ['🤒', 'Thermometer Face', 'fever sick'],
      ['🤕', 'Head Bandage', 'hurt'],
      ['🤢', 'Nauseated Face', 'sick'],
      ['🤮', 'Vomiting Face', 'sick'],
      ['🤧', 'Sneezing Face', 'achoo cold'],
      ['🥵', 'Hot Face', 'heat'],
      ['🥶', 'Cold Face', 'freezing'],
      ['🥴', 'Woozy Face', 'dizzy'],
      ['😵', 'Dizzy Face', 'stunned'],
      ['🤯', 'Exploding Head', 'mind blown wow'],
      ['🤠', 'Cowboy Hat', 'cheerful'],
      ['🥳', 'Partying Face', 'celebrate win'],
      ['🥸', 'Disguised Face', 'fun'],
      ['😎', 'Sunglasses', 'cool confident'],
      ['🤓', 'Nerd Face', 'study smart geek'],
      ['🧐', 'Monocle Face', 'inspect analyze'],
      ['😕', 'Confused Face', 'lost unsure'],
      ['🫤', 'Diagonal Mouth', 'unsure meh'],
      ['😟', 'Worried Face', 'anxious concern'],
      ['🙁', 'Slightly Frowning', 'sad'],
      ['☹️', 'Frowning Face', 'upset'],
      ['😮', 'Open Mouth', 'wow surprise'],
      ['😯', 'Hushed Face', 'surprised'],
      ['😲', 'Astonished Face', 'shocked'],
      ['😳', 'Flushed Face', 'shy embarrassed'],
      ['🥺', 'Pleading Face', 'please gentle help sad'],
      ['🥹', 'Holding Back Tears', 'touched proud'],
      ['😦', 'Frowning Open Mouth', 'shock'],
      ['😧', 'Anguished Face', 'distress'],
      ['😨', 'Fearful Face', 'scared'],
      ['😰', 'Anxious with Sweat', 'nervous test'],
      ['😥', 'Sad but Relieved', 'phew sad'],
      ['😢', 'Crying Face', 'sad tear'],
      ['😭', 'Loudly Crying', 'sob overwhelmed'],
      ['😱', 'Screaming in Fear', 'shock panic'],
      ['😖', 'Confounded Face', 'stuck'],
      ['😣', 'Persevering Face', 'trying hard'],
      ['😞', 'Disappointed Face', 'let down'],
      ['😓', 'Downcast Sweat', 'hard work'],
      ['😩', 'Weary Face', 'exhausted'],
      ['😫', 'Tired Face', 'tired'],
      ['🥱', 'Yawning Face', 'sleepy bored'],
      ['😤', 'Steam From Nose', 'determined frustrated'],
      ['😡', 'Enraged Face', 'mad'],
      ['😠', 'Angry Face', 'angry'],
      ['🤖', 'Robot AI', 'elsie ai assistant'],
      ['👻', 'Ghost', 'spooky playful'],
      ['👽', 'Alien', 'space sci-fi'],
    ],
  },
  {
    category: 'gestures',
    items: [
      ['👋', 'Waving Hand', 'hello bye wave'],
      ['🤚', 'Raised Back of Hand', 'stop hello'],
      ['🖐️', 'Hand with Fingers Splayed', 'five stop'],
      ['✋', 'Raised Hand', 'stop high five'],
      ['🖖', 'Vulcan Salute', 'peace'],
      ['🫱', 'Rightwards Hand', 'offer'],
      ['🫲', 'Leftwards Hand', 'offer'],
      ['👌', 'OK Hand', 'perfect good'],
      ['🤌', 'Pinched Fingers', 'focus precise'],
      ['🤏', 'Pinching Hand', 'tiny little'],
      ['✌️', 'Victory Hand', 'peace win'],
      ['🤞', 'Crossed Fingers', 'luck hope'],
      ['🫰', 'Index & Thumb Crossed', 'heart snap'],
      ['🤟', 'Love-You Gesture', 'care'],
      ['🤘', 'Sign of the Horns', 'rock cool'],
      ['🤙', 'Call Me Hand', 'call phone'],
      ['👈', 'Pointing Left', 'left back'],
      ['👉', 'Pointing Right', 'right next'],
      ['👆', 'Pointing Up', 'above up'],
      ['👇', 'Pointing Down', 'below down'],
      ['☝️', 'Index Pointing Up', 'one note'],
      ['👍', 'Thumbs Up', 'yes good agree'],
      ['👎', 'Thumbs Down', 'no disagree'],
      ['✊', 'Raised Fist', 'solidarity power'],
      ['👊', 'Oncoming Fist', 'fist bump'],
      ['🤛', 'Left Fist', 'bump'],
      ['🤜', 'Right Fist', 'bump'],
      ['👏', 'Clapping Hands', 'bravo well done'],
      ['🙌', 'Raising Hands', 'hooray celebrate'],
      ['🫶', 'Heart Hands', 'love care support'],
      ['👐', 'Open Hands', 'open welcome honest'],
      ['🤲', 'Palms Up Together', 'receive prayer'],
      ['🤝', 'Handshake', 'team partner agree'],
      ['🙏', 'Folded Hands', 'please thanks asante'],
      ['✍️', 'Writing Hand', 'write notes'],
      ['💅', 'Nail Polish', 'confident'],
      ['🤳', 'Selfie', 'photo'],
      ['💪', 'Flexed Biceps', 'strong effort power'],
      ['🦾', 'Mechanical Arm', 'stem robotics'],
      ['👂', 'Ear', 'listen'],
      ['👃', 'Nose', 'smell'],
      ['🧠', 'Brain', 'think smart logic'],
      ['👀', 'Eyes', 'look check notice curious'],
      ['👁️', 'Eye', 'focus observe'],
      ['🤦', 'Facepalm', 'oops mistake silly'],
      ['🤦‍♀️', 'Woman Facepalming', 'oops mistake'],
      ['🤦‍♂️', 'Man Facepalming', 'oops mistake'],
      ['🤷', 'Person Shrugging', 'idk unsure'],
      ['🤷‍♀️', 'Woman Shrugging', 'unsure'],
      ['🤷‍♂️', 'Man Shrugging', 'unsure'],
      ['🙋', 'Raising Hand', 'question class volunteer'],
      ['💁', 'Tipping Hand', 'help info'],
      ['🙅', 'Gesturing No', 'no stop'],
      ['🙆', 'Gesturing OK', 'ok yes'],
      ['🙇', 'Bowing', 'respect sorry'],
      ['👩‍🏫', 'Woman Teacher', 'mwalimu teacher'],
      ['👨‍🏫', 'Man Teacher', 'mwalimu teacher'],
      ['👩‍🎓', 'Woman Student', 'learner graduate'],
      ['👨‍🎓', 'Man Student', 'learner graduate'],
      ['👪', 'Family', 'parents guardian'],
    ],
  },
  {
    category: 'hearts',
    items: [
      ['❤️', 'Red Heart', 'love care thanks'],
      ['🧡', 'Orange Heart', 'warm friendship'],
      ['💛', 'Yellow Heart', 'kindness gold'],
      ['💚', 'Green Heart', 'cbc growth kenya'],
      ['💙', 'Blue Heart', 'trust calm'],
      ['💜', 'Purple Heart', 'royalty care'],
      ['🖤', 'Black Heart', 'style'],
      ['🤍', 'White Heart', 'pure peace care'],
      ['🤎', 'Brown Heart', 'earth warm'],
      ['🩷', 'Pink Heart', 'sweet rose'],
      ['🩵', 'Light Blue Heart', 'calm sky'],
      ['💔', 'Broken Heart', 'sad hurt'],
      ['❤️‍🔥', 'Heart on Fire', 'passion'],
      ['❤️‍🩹', 'Mending Heart', 'healing support'],
      ['❣️', 'Heart Exclamation', 'agree care'],
      ['💕', 'Two Hearts', 'warmth'],
      ['💞', 'Revolving Hearts', 'joy'],
      ['💓', 'Beating Heart', 'alive'],
      ['💗', 'Growing Heart', 'care'],
      ['💖', 'Sparkling Heart', 'bright love'],
      ['💘', 'Heart with Arrow', 'love'],
      ['💝', 'Heart with Ribbon', 'gift'],
      ['💯', '100 Points', 'perfect full marks'],
      ['💢', 'Anger Symbol', 'frustrated'],
      ['💥', 'Collision', 'boom impact'],
      ['💫', 'Dizzy Star', 'spark'],
      ['💦', 'Sweat Droplets', 'effort hustle'],
      ['💨', 'Dashing Away', 'fast'],
      ['💬', 'Speech Balloon', 'chat talk'],
      ['💭', 'Thought Balloon', 'think idea'],
      ['💤', 'Zzz Sleep', 'rest sleep'],
      ['✨', 'Sparkles', 'magic ai shine'],
      ['🌟', 'Glowing Star', 'star ee great'],
      ['⭐', 'Star', 'star good'],
      ['🌠', 'Shooting Star', 'wish goal'],
      ['🔥', 'Fire', 'fire awesome lit'],
      ['⚡', 'High Voltage', 'energy fast'],
      ['✅', 'Check Mark', 'done correct yes'],
      ['☑️', 'Check Box', 'done'],
      ['❌', 'Cross Mark', 'wrong no'],
      ['⚠️', 'Warning', 'caution alert'],
      ['❓', 'Question Mark', 'ask question'],
      ['❗', 'Exclamation Mark', 'important'],
      ['‼️', 'Double Exclamation', 'urgent'],
      ['⁉️', 'Exclamation Question', 'surprise ask'],
      ['🎯', 'Bullseye', 'focus zone goal'],
      ['🏆', 'Trophy', 'win champion'],
      ['🥇', '1st Place Medal', 'first gold'],
      ['🥈', '2nd Place Medal', 'silver'],
      ['🥉', '3rd Place Medal', 'bronze'],
      ['🏅', 'Sports Medal', 'award'],
      ['🎖️', 'Military Medal', 'honor'],
      ['🎉', 'Party Popper', 'celebrate congrats'],
      ['🎊', 'Confetti Ball', 'celebration'],
      ['🎈', 'Balloon', 'party'],
      ['🎁', 'Wrapped Gift', 'present reward'],
      ['🎀', 'Ribbon', 'pretty'],
      ['🔔', 'Bell', 'notice alert school'],
      ['🎶', 'Musical Notes', 'music song'],
      ['🎵', 'Musical Note', 'music'],
    ],
  },
  {
    category: 'nature',
    items: [
      ['🌹', 'Rose', 'little roses school emblem'],
      ['🌷', 'Tulip', 'flower spring'],
      ['🌸', 'Cherry Blossom', 'gentle flower'],
      ['🌺', 'Hibiscus', 'flower'],
      ['🌻', 'Sunflower', 'bright sun'],
      ['🌼', 'Blossom', 'flower'],
      ['🪷', 'Lotus', 'calm'],
      ['🌱', 'Seedling', 'growth much from little'],
      ['🪴', 'Potted Plant', 'care grow'],
      ['🌲', 'Evergreen Tree', 'nature forest'],
      ['🌳', 'Deciduous Tree', 'shade tree'],
      ['🌴', 'Palm Tree', 'coast mombasa'],
      ['🌵', 'Cactus', 'dryland'],
      ['🌾', 'Sheaf of Rice', 'agriculture harvest'],
      ['🌿', 'Herb', 'leaf plant'],
      ['☘️', 'Shamrock', 'clover'],
      ['🍀', 'Four Leaf Clover', 'luck'],
      ['🍁', 'Maple Leaf', 'leaf'],
      ['🍂', 'Fallen Leaf', 'autumn'],
      ['🍃', 'Leaf Fluttering', 'wind breeze'],
      ['🐶', 'Dog Face', 'puppy pet'],
      ['🐱', 'Cat Face', 'kitty pet'],
      ['🐭', 'Mouse', 'animal'],
      ['🐹', 'Hamster', 'pet'],
      ['🐰', 'Rabbit', 'bunny'],
      ['🦊', 'Fox', 'clever'],
      ['🐻', 'Bear', 'animal'],
      ['🐼', 'Panda', 'cute'],
      ['🐨', 'Koala', 'animal'],
      ['🐯', 'Tiger', 'fierce'],
      ['🦁', 'Lion', 'kenya safari simba'],
      ['🐮', 'Cow', 'farm dairy'],
      ['🐷', 'Pig', 'farm'],
      ['🐸', 'Frog', 'pond'],
      ['🐵', 'Monkey', 'playful'],
      ['🙈', 'See-No-Evil Monkey', 'shy oops'],
      ['🙉', 'Hear-No-Evil Monkey', 'silly'],
      ['🙊', 'Speak-No-Evil Monkey', 'oops secret'],
      ['🐔', 'Chicken', 'farm'],
      ['🐧', 'Penguin', 'cold'],
      ['🐦', 'Bird', 'fly'],
      ['🐤', 'Baby Chick', 'cute'],
      ['🦅', 'Eagle', 'soar'],
      ['🦉', 'Owl', 'wise study'],
      ['🐴', 'Horse', 'run'],
      ['🦄', 'Unicorn', 'magic'],
      ['🐝', 'Honeybee', 'busy bee'],
      ['🦋', 'Butterfly', 'nature'],
      ['🐢', 'Turtle', 'steady'],
      ['🐬', 'Dolphin', 'ocean smart'],
      ['🐘', 'Elephant', 'kenya wildlife'],
      ['🦒', 'Giraffe', 'kenya safari'],
      ['🦓', 'Zebra', 'kenya safari'],
      ['☀️', 'Sun', 'morning bright'],
      ['🌤️', 'Sun Behind Small Cloud', 'afternoon'],
      ['⛅', 'Sun Behind Cloud', 'weather'],
      ['🌧️', 'Cloud with Rain', 'rain'],
      ['⛈️', 'Thunderstorm', 'storm'],
      ['🌈', 'Rainbow', 'hope colors'],
      ['❄️', 'Snowflake', 'cold freeze'],
      ['🌊', 'Water Wave', 'ocean'],
      ['🌙', 'Crescent Moon', 'night evening'],
    ],
  },
  {
    category: 'food',
    items: [
      ['🍎', 'Red Apple', 'teacher fruit snack'],
      ['🍏', 'Green Apple', 'fresh'],
      ['🍐', 'Pear', 'fruit'],
      ['🍊', 'Tangerine', 'orange'],
      ['🍋', 'Lemon', 'citrus'],
      ['🍌', 'Banana', 'fruit'],
      ['🍉', 'Watermelon', 'fruit'],
      ['🍇', 'Grapes', 'fruit'],
      ['🍓', 'Strawberry', 'berry'],
      ['🫐', 'Blueberries', 'berry'],
      ['🍒', 'Cherries', 'fruit'],
      ['🥭', 'Mango', 'kenya fruit'],
      ['🍍', 'Pineapple', 'fruit'],
      ['🥥', 'Coconut', 'madafu'],
      ['🥑', 'Avocado', 'healthy'],
      ['🍅', 'Tomato', 'nyanya'],
      ['🥕', 'Carrot', 'vegetable'],
      ['🌽', 'Ear of Corn', 'maize mahindi'],
      ['🥔', 'Potato', 'viazi'],
      ['🍞', 'Bread', 'mkate'],
      ['🥐', 'Croissant', 'breakfast'],
      ['🥞', 'Pancakes', 'breakfast'],
      ['🥚', 'Egg', 'mayai'],
      ['🍳', 'Cooking', 'breakfast'],
      ['🧀', 'Cheese', 'dairy'],
      ['🍗', 'Poultry Leg', 'chicken'],
      ['🍔', 'Burger', 'lunch'],
      ['🍟', 'French Fries', 'chips'],
      ['🍕', 'Pizza', 'treat'],
      ['🥪', 'Sandwich', 'lunchbox'],
      ['🌮', 'Taco', 'food'],
      ['🍝', 'Spaghetti', 'pasta'],
      ['🍜', 'Steaming Bowl', 'noodles soup'],
      ['🍲', 'Pot of Food', 'stew'],
      ['🍛', 'Curry Rice', 'dinner'],
      ['🥗', 'Green Salad', 'healthy nutrition'],
      ['🍦', 'Soft Ice Cream', 'treat'],
      ['🍩', 'Doughnut', 'mandazi sweet'],
      ['🍪', 'Cookie', 'snack'],
      ['🎂', 'Birthday Cake', 'celebrate'],
      ['🍰', 'Shortcake', 'cake'],
      ['🍫', 'Chocolate Bar', 'sweet'],
      ['🍿', 'Popcorn', 'movie snack'],
      ['🥛', 'Glass of Milk', 'healthy'],
      ['☕', 'Hot Beverage', 'chai tea coffee'],
      ['🫖', 'Teapot', 'chai'],
      ['🧃', 'Beverage Box', 'juice'],
      ['🥤', 'Cup with Straw', 'drink'],
      ['💧', 'Droplet', 'water hydrate'],
    ],
  },
  {
    category: 'activities',
    items: [
      ['⚽', 'Soccer Ball', 'football sport'],
      ['🏀', 'Basketball', 'sport'],
      ['🏈', 'American Football', 'sport'],
      ['⚾', 'Baseball', 'sport'],
      ['🎾', 'Tennis', 'sport'],
      ['🏐', 'Volleyball', 'sport'],
      ['🏉', 'Rugby Football', 'kenya rugby'],
      ['🏓', 'Ping Pong', 'table tennis'],
      ['🏸', 'Badminton', 'sport'],
      ['🏏', 'Cricket Game', 'sport'],
      ['🏃', 'Person Running', 'athletics kenya'],
      ['🚴', 'Person Biking', 'cycling'],
      ['🏊', 'Person Swimming', 'swim'],
      ['🤸', 'Cartwheeling', 'gymnastics'],
      ['🧘', 'Lotus Position', 'calm breathe'],
      ['🎨', 'Artist Palette', 'creative arts draw'],
      ['🎭', 'Performing Arts', 'drama festival'],
      ['🎬', 'Clapper Board', 'film'],
      ['🎤', 'Microphone', 'sing speak'],
      ['🎧', 'Headphone', 'listen audio'],
      ['🎼', 'Musical Score', 'music'],
      ['🎹', 'Musical Keyboard', 'piano'],
      ['🥁', 'Drum', 'ngoma music'],
      ['🎸', 'Guitar', 'music'],
      ['🎻', 'Violin', 'music'],
      ['🎲', 'Game Die', 'random math'],
      ['♟️', 'Chess Pawn', 'chess strategy'],
      ['🎮', 'Video Game', 'game'],
      ['🧩', 'Puzzle Piece', 'problem solve'],
      ['🪁', 'Kite', 'wind play'],
    ],
  },
  {
    category: 'school',
    items: [
      ['📚', 'Books', 'study cbc library'],
      ['📖', 'Open Book', 'read assessment book'],
      ['📓', 'Notebook', 'notes'],
      ['📔', 'Decorative Notebook', 'journal'],
      ['📒', 'Ledger', 'records'],
      ['📕', 'Closed Book', 'book'],
      ['📗', 'Green Book', 'book'],
      ['📘', 'Blue Book', 'book'],
      ['📙', 'Orange Book', 'book'],
      ['📝', 'Memo', 'lesson plan test write'],
      ['✏️', 'Pencil', 'edit draw write'],
      ['✒️', 'Black Nib', 'write'],
      ['🖋️', 'Fountain Pen', 'sign'],
      ['🖊️', 'Pen', 'write'],
      ['🖌️', 'Paintbrush', 'art'],
      ['🖍️', 'Crayon', 'color'],
      ['📏', 'Straight Ruler', 'math measure'],
      ['📐', 'Triangular Ruler', 'geometry math'],
      ['📎', 'Paperclip', 'attach'],
      ['📌', 'Pushpin', 'pin'],
      ['✂️', 'Scissors', 'cut craft'],
      ['🗂️', 'Card Index Dividers', 'schemes organize'],
      ['📁', 'File Folder', 'folder'],
      ['📅', 'Calendar', 'term schedule'],
      ['🗓️', 'Spiral Calendar', 'timetable'],
      ['📈', 'Chart Increasing', 'progress improve'],
      ['📉', 'Chart Decreasing', 'focus needed'],
      ['📊', 'Bar Chart', 'marks results'],
      ['📋', 'Clipboard', 'report assessment'],
      ['🔍', 'Magnifying Glass', 'search inspect'],
      ['🔬', 'Microscope', 'science stem'],
      ['🔭', 'Telescope', 'astronomy science'],
      ['💡', 'Light Bulb', 'idea tip'],
      ['💻', 'Laptop', 'ict coding'],
      ['🖥️', 'Desktop Computer', 'computer'],
      ['📱', 'Mobile Phone', 'pwa app'],
      ['☎️', 'Telephone', 'call'],
      ['📞', 'Telephone Receiver', 'phone'],
      ['⏱️', 'Stopwatch', 'timer'],
      ['⏰', 'Alarm Clock', 'bell time'],
      ['⏳', 'Hourglass', '24h pending'],
      ['🧪', 'Test Tube', 'science experiment'],
      ['🧬', 'DNA', 'biology stem'],
      ['🩺', 'Stethoscope', 'health medicine'],
      ['🔑', 'Key', 'password access'],
      ['🎓', 'Graduation Cap', 'senior pathways'],
      ['🧮', 'Abacus', 'mathematics math'],
    ],
  },
  {
    category: 'travel',
    items: [
      ['🇰🇪', 'Kenya Flag', 'kenya nakuru cbc swahili'],
      ['🇹🇿', 'Tanzania Flag', 'east africa'],
      ['🇺🇬', 'Uganda Flag', 'east africa'],
      ['🇷🇼', 'Rwanda Flag', 'east africa'],
      ['🇪🇹', 'Ethiopia Flag', 'east africa'],
      ['🇳🇬', 'Nigeria Flag', 'africa'],
      ['🇿🇦', 'South Africa Flag', 'africa'],
      ['🇬🇭', 'Ghana Flag', 'africa'],
      ['🇺🇸', 'United States Flag', 'usa'],
      ['🇬🇧', 'United Kingdom Flag', 'uk'],
      ['🌍', 'Globe Europe-Africa', 'world geography'],
      ['🌎', 'Globe Americas', 'world'],
      ['🌏', 'Globe Asia-Australia', 'world'],
      ['🗺️', 'World Map', 'social studies geography'],
      ['🏫', 'School', 'little roses academy'],
      ['🏠', 'House', 'home family'],
      ['🏡', 'House with Garden', 'home'],
      ['🏛️', 'Classical Building', 'admin office'],
      ['🏥', 'Hospital', 'health'],
      ['🚗', 'Automobile', 'car'],
      ['🚌', 'Bus', 'school bus'],
      ['🚲', 'Bicycle', 'bike'],
      ['✈️', 'Airplane', 'travel'],
      ['🚀', 'Rocket', 'launch stem'],
      ['⛵', 'Sailboat', 'water'],
      ['🚦', 'Vertical Traffic Light', 'rules'],
    ],
  },
];

// Build unified catalog and fast lookup map
const _map = new Map<string, EmojiEntry>();

for (const entry of FEATURED_EMOJI_ENTRIES) {
  _map.set(entry.emoji, entry);
}

const DEFAULT_TONE_FOR_CATEGORY: Record<Exclude<EmojiCategoryId, 'recent'>, EmojiTone> = {
  smileys: 'warmth',
  gestures: 'warmth',
  hearts: 'celebration',
  nature: 'calm',
  food: 'warmth',
  activities: 'celebration',
  school: 'school',
  travel: 'curious',
};

export const EMOJI_CATALOG: EmojiEntry[] = [];

// Add featured first in a clean map, then preserve category order
for (const pack of CATEGORY_PACKS) {
  for (const [emoji, name, extraKw] of pack.items) {
    const existing = _map.get(emoji);
    if (existing) {
      EMOJI_CATALOG.push(existing);
    } else {
      const entry: EmojiEntry = {
        emoji,
        name,
        keywords: [name.toLowerCase(), ...extraKw.toLowerCase().split(/\s+/).filter(Boolean)],
        meaning: `${name} — expresses ${name.toLowerCase()} in conversation`,
        aiGuidance: 'Interpret naturally with warm, respectful school etiquette.',
        tone: DEFAULT_TONE_FOR_CATEGORY[pack.category],
        category: pack.category,
      };
      _map.set(emoji, entry);
      EMOJI_CATALOG.push(entry);
    }
  }
}

// Add any featured entries not already pushed in CATEGORY_PACKS
for (const entry of FEATURED_EMOJI_ENTRIES) {
  if (!EMOJI_CATALOG.some((e) => e.emoji === entry.emoji)) {
    EMOJI_CATALOG.push(entry);
  }
}

// Extra external keyboard emojis that users might type from their OS keyboard (so Elsie recognizes them & responds responsibly)
const EXTRA_EXTERNAL_MEANINGS: Record<string, { name: string; meaning: string; tone: EmojiTone; safe: boolean }> = {
  '🖕': { name: 'Middle Finger', meaning: 'Rude or hostile gesture', tone: 'caution', safe: false },
  '🤬': { name: 'Face with Symbols on Mouth', meaning: 'Strong anger or swearing', tone: 'caution', safe: false },
  '💩': { name: 'Pile of Poo', meaning: 'Silly or rude expression', tone: 'caution', safe: false },
  '🤡': { name: 'Clown Face', meaning: 'Mocking or joking around', tone: 'caution', safe: false },
  '💀': { name: 'Skull', meaning: 'Gen-Z slang for "dying laughing" OR shock/exhaustion', tone: 'playful', safe: false },
  '☠️': { name: 'Skull and Crossbones', meaning: 'Danger or dramatic shock', tone: 'caution', safe: false },
  '🔪': { name: 'Kitchen Knife', meaning: 'Sharp tool or threat warning', tone: 'caution', safe: false },
  '🔫': { name: 'Water Pistol / Weapon', meaning: 'Play or weapon symbol', tone: 'caution', safe: false },
  '🚬': { name: 'Cigarette', meaning: 'Smoking symbol', tone: 'caution', safe: false },
  '🍺': { name: 'Beer Mug', meaning: 'Alcohol drink', tone: 'caution', safe: false },
  '🍻': { name: 'Clinking Beer Mugs', meaning: 'Cheers / alcohol', tone: 'caution', safe: false },
  '🍷': { name: 'Wine Glass', meaning: 'Wine drink', tone: 'caution', safe: false },
  '🍆': { name: 'Eggplant', meaning: 'Vegetable (keep conversation school-appropriate)', tone: 'caution', safe: false },
  '🍑': { name: 'Peach', meaning: 'Fruit (keep conversation school-appropriate)', tone: 'caution', safe: false },
  '🙄': { name: 'Face with Rolling Eyes', meaning: 'Mild annoyance or impatience', tone: 'caution', safe: false },
  '😒': { name: 'Unamused Face', meaning: 'Feeling unimpressed or frustrated', tone: 'caution', safe: false },
};

export const DISALLOWED_AI_OUTPUT_EMOJIS = new Set<string>([
  '🖕',
  '🤬',
  '💩',
  '🤡',
  '💀',
  '☠️',
  '🔪',
  '🔫',
  '🚬',
  '🍺',
  '🍻',
  '🍷',
  '🥃',
  '🍸',
  '🍹',
  '🍾',
  '🙄',
  '😒',
  '😤',
  '😡',
  '😠',
  '🤮',
  '🤢',
  '😈',
  '👿',
  '💋',
  '🫦',
  '👙',
  '🩲',
  '🔞',
]);

export function lookupEmojiMeaning(emoji: string): {
  emoji: string;
  name: string;
  meaning: string;
  tone: EmojiTone;
  safe: boolean;
} | null {
  const clean = emoji.trim();
  const ext = EXTRA_EXTERNAL_MEANINGS[clean];
  if (ext) {
    return { emoji: clean, ...ext };
  }
  const found = _map.get(clean);
  if (found) {
    return {
      emoji: found.emoji,
      name: found.name,
      meaning: found.meaning,
      tone: found.tone,
      safe: !DISALLOWED_AI_OUTPUT_EMOJIS.has(found.emoji),
    };
  }
  return null;
}

export interface EmojiSemanticsSummary {
  emojis: string[];
  details: Array<{
    emoji: string;
    name: string;
    meaning: string;
    tone: EmojiTone;
    safe: boolean;
  }>;
  dominantTone: EmojiTone | null;
  hasInappropriate: boolean;
  isEmojiOnly: boolean;
  summaryText: string;
}

// Extract emoji grapheme clusters from text using Intl.Segmenter when available
export function extractEmojis(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;

  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    for (const seg of segmenter.segment(text)) {
      const g = seg.segment;
      if (emojiRegex.test(g)) {
        results.push(g);
      }
    }
  } else {
    const matches = text.match(/(\p{Extended_Pictographic}|\u{1F1E6}-\u{1F1FF})+/gu);
    if (matches) results.push(...matches);
  }
  return results;
}

export function analyzeEmojiSemantics(text: string): EmojiSemanticsSummary {
  const rawEmojis = extractEmojis(text);
  const uniqueEmojis = Array.from(new Set(rawEmojis));
  const details = uniqueEmojis.map((em) => {
    const lookedUp = lookupEmojiMeaning(em);
    if (lookedUp) return lookedUp;
    return {
      emoji: em,
      name: 'Expressive Emoji',
      meaning: 'Visual emotion or symbol in conversation',
      tone: 'warmth' as EmojiTone,
      safe: !DISALLOWED_AI_OUTPUT_EMOJIS.has(em),
    };
  });

  const strippedText = text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u200D\uFE0F\s.,!?]/gu, '')
    .trim();
  const isEmojiOnly = uniqueEmojis.length > 0 && strippedText.length === 0;
  const hasInappropriate = details.some((d) => !d.safe && d.tone === 'caution');

  const priorityOrder: EmojiTone[] = [
    'caution',
    'vulnerable',
    'oops',
    'thinking',
    'curious',
    'celebration',
    'joy',
    'playful',
    'welcoming',
    'affection',
    'warmth',
    'school',
    'calm',
  ];
  let dominantTone: EmojiTone | null = null;
  for (const t of priorityOrder) {
    if (details.some((d) => d.tone === t)) {
      dominantTone = t;
      break;
    }
  }

  const summaryText = details
    .slice(0, 4)
    .map((d) => `${d.emoji} (${d.name}: ${d.meaning})`)
    .join('; ');

  return {
    emojis: uniqueEmojis,
    details,
    dominantTone,
    hasInappropriate,
    isEmojiOnly,
    summaryText,
  };
}

/**
 * Ensures Elsie AI never outputs mocking, sarcastic, vulgar, or inappropriate emojis.
 */
export function sanitizeAiReplyEmojis(replyText: string): string {
  if (!replyText) return replyText;
  let cleaned = replyText;
  for (const bad of DISALLOWED_AI_OUTPUT_EMOJIS) {
    if (cleaned.includes(bad)) {
      cleaned = cleaned.split(bad).join('');
    }
  }
  return cleaned.replace(/\s{2,}/g, ' ').replace(/ \n/g, '\n').trim();
}

export function getToneChipLabel(tone: EmojiTone): { label: string; hint: string } {
  switch (tone) {
    case 'joy':
      return { label: 'Joyful & Laughing', hint: 'Elsie will match your upbeat mood' };
    case 'warmth':
      return { label: 'Warm & Friendly', hint: 'Elsie will reply kindly' };
    case 'playful':
      return { label: 'Playful & Lighthearted', hint: 'Elsie will keep it fun & respectful' };
    case 'curious':
      return { label: 'Looking Closely', hint: 'Elsie will highlight key facts & details' };
    case 'thinking':
      return { label: 'Thinking / Questioning', hint: 'Elsie will explain step-by-step' };
    case 'vulnerable':
      return { label: 'Needs Gentle Support', hint: 'Elsie will respond extra kindly & patiently' };
    case 'oops':
      return { label: 'Oops / Slip-up', hint: 'Elsie will encourage you without judgement' };
    case 'welcoming':
      return { label: 'Open & Welcoming', hint: 'Elsie is ready with open-handed help' };
    case 'celebration':
      return { label: 'Celebrating Progress', hint: 'Elsie will cheer your effort!' };
    case 'affection':
      return { label: 'Warm Appreciation', hint: 'Elsie appreciates your kindness' };
    case 'school':
      return { label: 'Study & CBC Focus', hint: 'Elsie will focus on learning & pathways' };
    case 'calm':
      return { label: 'Calm & Steady', hint: 'Elsie will keep a peaceful pace' };
    case 'caution':
      return { label: 'Keep It Respectful', hint: 'Elsie stays calm, kind & school-safe' };
  }
}
