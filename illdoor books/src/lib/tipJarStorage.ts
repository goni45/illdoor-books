export interface TipJarLeaderboardEntry {
  id: string;
  name: string;
  amount: number;
  message?: string;
  timeAgo?: string;
}

export interface TipJarSettings {
  enabled: boolean;
  buttonText: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bkashNumber: string;
  bkashType: string;
  nagadNumber: string;
  nagadType: string;
  rocketNumber: string;
  rocketType: string;
  targetAmount: number;
  collectedAmount: number;
  note: string;
  showLeaderboard?: boolean;
  leaderboard?: TipJarLeaderboardEntry[];
}

export const DEFAULT_LEADERBOARD_ENTRIES: TipJarLeaderboardEntry[] = [
  { id: '1', name: 'Mahi', amount: 200, message: 'iPhone er jonno chotto valobasha!', timeAgo: 'Just now' },
  { id: '2', name: 'Tanvir (CST)', amount: 500, message: 'Best of luck bhai, new iPhone chai!', timeAgo: '2 hours ago' },
  { id: '3', name: 'Sabbir Ahmed', amount: 300, message: 'Polytechnic community rocks ❤️', timeAgo: 'Yesterday' },
];

export const DEFAULT_TIP_JAR_SETTINGS: TipJarSettings = {
  enabled: true,
  buttonText: 'Help me to buy a new iPhone',
  title: 'Help me to buy a new iPhone plsssssssss',
  subtitle: 'আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈',
  imageUrl: 'https://images.meme-arsenal.com/6105c3761e035663ba81e5667a46ee4d.jpg',
  bkashNumber: '01712345678',
  bkashType: 'Personal (Send Money)',
  nagadNumber: '01812345678',
  nagadType: 'Personal (Send Money)',
  rocketNumber: '01912345678',
  rocketType: 'Personal (Send Money)',
  targetAmount: 125000,
  collectedAmount: 16800,
  note: 'টাকা পাঠানোর পর রেফারেন্সে আপনার নাম/ডিপার্টমেন্ট লিখে দিতে পারেন। আপনাদের এই ভালোবাসা ও সাহায্য আমাদের নতুন ফিচার বানাতে উৎসাহ দেয়!',
  showLeaderboard: true,
  leaderboard: DEFAULT_LEADERBOARD_ENTRIES,
};

const STORAGE_KEY = 'poly_iphone_tip_jar_settings_v1';
const EVENT_NAME = 'poly_tip_jar_settings_updated';

export function getTipJarSettings(): TipJarSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_TIP_JAR_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TIP_JAR_SETTINGS;
    const parsed = JSON.parse(raw);
    const title = parsed?.title ? parsed.title.replace(/📱/g, '').trim() : DEFAULT_TIP_JAR_SETTINGS.title;
    const subtitle = parsed?.subtitle && !parsed.subtitle.includes('পলিটেকনিক শিক্ষার্থীদের জন্য এই প্ল্যাটফর্মটি')
      ? parsed.subtitle
      : DEFAULT_TIP_JAR_SETTINGS.subtitle;
    const leaderboard = Array.isArray(parsed?.leaderboard) && parsed.leaderboard.length > 0
      ? parsed.leaderboard
      : DEFAULT_LEADERBOARD_ENTRIES;

    return {
      ...DEFAULT_TIP_JAR_SETTINGS,
      ...parsed,
      title: title.includes('plsssssssss') ? title : `${title} plsssssssss`,
      subtitle,
      leaderboard,
    };
  } catch {
    return DEFAULT_TIP_JAR_SETTINGS;
  }
}

export function saveTipJarSettings(settings: Partial<TipJarSettings>): TipJarSettings {
  const current = getTipJarSettings();
  const updated: TipJarSettings = {
    ...current,
    ...settings,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (err) {
    console.error('Failed to save tip jar settings to localStorage', err);
  }
  return updated;
}

export function subscribeTipJarSettings(
  callback: (settings: TipJarSettings) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<TipJarSettings>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getTipJarSettings());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getTipJarSettings());
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
