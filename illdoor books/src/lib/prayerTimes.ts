import { Coordinates, CalculationMethod, PrayerTimes, Madhab, Prayer } from 'adhan';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerInfo {
  key: PrayerName;
  englishName: string;
  banglaName: string;
  time: Date;
  formattedTime: string;
  question: string;
  encouragement: string;
  quranHadithQuote: string;
}

export interface DayPrayerSchedule {
  date: Date;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  currentPrayer: PrayerInfo | null;
  nextPrayer: { key: PrayerName; name: string; time: Date; formattedTime: string } | null;
}

// Default Coordinates: Dhaka, Bangladesh
export const DEFAULT_COORDINATES = {
  latitude: 23.8103,
  longitude: 90.4125,
  city: 'ঢাকা, বাংলাদেশ',
};

const STORAGE_KEYS = {
  ENABLED: 'namaz_reminder_enabled',
  SNOOZE_UNTIL: 'namaz_reminder_snooze_until',
  LAST_INTERACTED: 'namaz_reminder_last_action', // { prayerKey: string, date: string, action: string, at: number }
  CUSTOM_QUESTION: 'namaz_reminder_custom_question',
};

export function isReminderEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ENABLED);
    return val === null ? true : val === 'true'; // default enabled
  } catch {
    return true;
  }
}

export function setReminderEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENABLED, String(enabled));
    window.dispatchEvent(new Event('prayer-reminder-settings-changed'));
  } catch (e) {
    console.error('Failed to save prayer reminder state', e);
  }
}

export function getSnoozeUntil(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SNOOZE_UNTIL);
    if (!val) return null;
    const time = parseInt(val, 10);
    return isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

export function setSnoozeMinutes(minutes: number): void {
  try {
    const until = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.SNOOZE_UNTIL, String(until));
  } catch (e) {
    console.error('Failed to set snooze', e);
  }
}

export function clearSnooze(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SNOOZE_UNTIL);
  } catch {
    // ignore
  }
}

export interface LastPrayerAction {
  prayer: PrayerName;
  dateStr: string;
  action: 'prayed' | 'will_pray' | 'dismissed';
  timestamp: number;
}

export function getLastActionForPrayer(prayer: PrayerName, dateStr: string): LastPrayerAction | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.LAST_INTERACTED}_${prayer}_${dateStr}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function markPrayerAction(prayer: PrayerName, dateStr: string, action: 'prayed' | 'will_pray' | 'dismissed'): void {
  try {
    const record: LastPrayerAction = {
      prayer,
      dateStr,
      action,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${STORAGE_KEYS.LAST_INTERACTED}_${prayer}_${dateStr}`, JSON.stringify(record));
    clearSnooze();
  } catch (e) {
    console.error('Failed to mark prayer action', e);
  }
}

// Format time in 12-hour Bengali format (e.g., "০১:১৫ PM")
export function formatBengaliTime(date: Date): string {
  try {
    return date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }
}

export function getTodayDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayPrayerSchedule(
  date: Date = new Date(),
  latitude = DEFAULT_COORDINATES.latitude,
  longitude = DEFAULT_COORDINATES.longitude
): DayPrayerSchedule {
  const coordinates = new Coordinates(latitude, longitude);
  // Standard calculation method for subcontinent: Karachi (18° Fajr, 18° Isha) with Hanafi Asr
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coordinates, date, params);

  const isFriday = date.getDay() === 5; // Friday is 5

  const prayersMap: Record<PrayerName, PrayerInfo> = {
    fajr: {
      key: 'fajr',
      englishName: 'Fajr',
      banglaName: 'ফজর',
      time: pt.fajr,
      formattedTime: formatBengaliTime(pt.fajr),
      question: 'ফজরের নামাজ পড়সো?',
      encouragement: 'দিনের শুরুটা আল্লাহর স্মরণে হোক। সফলতার চাবিকাঠি হলো ফজর!',
      quranHadithQuote: '“আস-সালাতু খাইরুম মিনান নাওম” (ঘুমের চেয়ে নামাজ উত্তম)',
    },
    dhuhr: {
      key: 'dhuhr',
      englishName: 'Dhuhr',
      banglaName: isFriday ? "জুমু'আ" : 'যোহর',
      time: pt.dhuhr,
      formattedTime: formatBengaliTime(pt.dhuhr),
      question: isFriday ? "আজ পবিত্র জুমু'আহ! জুমু'আর নামাজ পড়সো?" : 'যোহরের নামাজ পড়সো?',
      encouragement: isFriday
        ? "পবিত্র জুমু'আর বরকতময় দিন! মসজিদে গিয়ে সময়মতো জুমু'আর জামাত ধরে নিও।"
        : 'পড়াশোনার ফাঁকে একটু বিরতি নিয়ে মনকে প্রশান্ত করে এসো।',
      quranHadithQuote: '“নিশ্চয়ই নামাজ মানুষকে অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।” (সূরা আনকাবুত: ৪৫)',
    },
    asr: {
      key: 'asr',
      englishName: 'Asr',
      banglaName: 'আসর',
      time: pt.asr,
      formattedTime: formatBengaliTime(pt.asr),
      question: 'আসরের নামাজ পড়সো?',
      encouragement: 'আসরের নামাজের গুরুত্ব অপরিসীম। চলো দ্রুত ওজু করে নামাজটা পড়ে আসি।',
      quranHadithQuote: '“তোমরা সমস্ত নামাজের প্রতি যত্নবান হও, বিশেষ করে মধ্যবর্তী (আসর) নামাজের।” (সূরা বাকারা: ২৩৮)',
    },
    maghrib: {
      key: 'maghrib',
      englishName: 'Maghrib',
      banglaName: 'মাগরিব',
      time: pt.maghrib,
      formattedTime: formatBengaliTime(pt.maghrib),
      question: 'মাগরিবের নামাজ পড়সো?',
      encouragement: 'সূর্য ডোবার সাথে সাথে মাগরিবের ওয়াক্ত হয়ে যায়, দেরি না করে নামাজ আদায় করে নাও।',
      quranHadithQuote: '“সূর্যাস্তের পর বিলম্ব না করে নামাজ আদায় করা অতি কল্যাণকর।” (হাদিস শরিফ)',
    },
    isha: {
      key: 'isha',
      englishName: 'Isha',
      banglaName: 'এশা',
      time: pt.isha,
      formattedTime: formatBengaliTime(pt.isha),
      question: 'এশার নামাজ পড়সো?',
      encouragement: 'সারাদিনের ব্যস্ততা শেষে এশা পড়ে ঘুমানোর প্রস্তুতি নাও, মন শান্ত হবে।',
      quranHadithQuote: '“যে ব্যক্তি এশার নামাজ জামাতে আদায় করল, সে যেন অর্ধরাত ইবাদত করল।” (সহিহ মুসলিম)',
    },
  };

  const now = date.getTime();

  // Determine current active prayer
  // Fajr: from pt.fajr to pt.sunrise
  // Dhuhr: from pt.dhuhr to pt.asr
  // Asr: from pt.asr to pt.maghrib
  // Maghrib: from pt.maghrib to pt.isha
  // Isha: from pt.isha to midnight (or until next Fajr)
  let activePrayer: PrayerInfo | null = null;
  let nextPrayerInfo: { key: PrayerName; name: string; time: Date; formattedTime: string } | null = null;

  if (now >= pt.fajr.getTime() && now < pt.sunrise.getTime()) {
    activePrayer = prayersMap.fajr;
    nextPrayerInfo = { key: 'dhuhr', name: prayersMap.dhuhr.banglaName, time: pt.dhuhr, formattedTime: prayersMap.dhuhr.formattedTime };
  } else if (now >= pt.dhuhr.getTime() && now < pt.asr.getTime()) {
    activePrayer = prayersMap.dhuhr;
    nextPrayerInfo = { key: 'asr', name: prayersMap.asr.banglaName, time: pt.asr, formattedTime: prayersMap.asr.formattedTime };
  } else if (now >= pt.asr.getTime() && now < pt.maghrib.getTime()) {
    activePrayer = prayersMap.asr;
    nextPrayerInfo = { key: 'maghrib', name: prayersMap.maghrib.banglaName, time: pt.maghrib, formattedTime: prayersMap.maghrib.formattedTime };
  } else if (now >= pt.maghrib.getTime() && now < pt.isha.getTime()) {
    activePrayer = prayersMap.maghrib;
    nextPrayerInfo = { key: 'isha', name: prayersMap.isha.banglaName, time: pt.isha, formattedTime: prayersMap.isha.formattedTime };
  } else if (now >= pt.isha.getTime() || now < pt.fajr.getTime()) {
    activePrayer = prayersMap.isha;
    nextPrayerInfo = { key: 'fajr', name: prayersMap.fajr.banglaName, time: pt.fajr, formattedTime: prayersMap.fajr.formattedTime };
  }

  return {
    date,
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
    currentPrayer: activePrayer,
    nextPrayer: nextPrayerInfo,
  };
}

/**
 * Checks whether a prayer popup should trigger right now
 */
export function shouldShowPrayerPopup(): {
  shouldShow: boolean;
  prayer: PrayerInfo | null;
  dateStr: string;
} {
  if (!isReminderEnabled()) {
    return { shouldShow: false, prayer: null, dateStr: '' };
  }

  // Check snooze
  const snoozeUntil = getSnoozeUntil();
  if (snoozeUntil && Date.now() < snoozeUntil) {
    return { shouldShow: false, prayer: null, dateStr: '' };
  }

  const now = new Date();
  const schedule = getDayPrayerSchedule(now);
  const current = schedule.currentPrayer;

  if (!current) {
    return { shouldShow: false, prayer: null, dateStr: '' };
  }

  const dateStr = getTodayDateString(now);
  const lastAction = getLastActionForPrayer(current.key, dateStr);

  // If already interacted (marked prayed or dismissed), don't show again this waqt
  if (lastAction) {
    return { shouldShow: false, prayer: current, dateStr };
  }

  // Ensure prayer started at least 5 minutes ago to avoid showing the exact second
  // (unless user is browsing during the prayer window)
  return {
    shouldShow: true,
    prayer: current,
    dateStr,
  };
}
