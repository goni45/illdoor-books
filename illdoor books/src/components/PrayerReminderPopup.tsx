import React, { useState, useEffect, useCallback } from 'react';
import {
  shouldShowPrayerPopup,
  markPrayerAction,
  setSnoozeMinutes,
  isReminderEnabled,
  setReminderEnabled,
  PrayerInfo,
  getDayPrayerSchedule,
  formatBengaliTime,
  PrayerName,
  getTodayDateString,
} from '../lib/prayerTimes';
import { X, Check, Clock, BellOff, Volume2, Sparkles, Moon, Sun, Sunset } from 'lucide-react';

export const PrayerReminderPopup: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [activePrayer, setActivePrayer] = useState<PrayerInfo | null>(null);
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // Sound chime helper
  const playGentleChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Peaceful pleasant harmonic frequencies
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.35); // G5

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } catch {
      // Audio playback blocked or unsupported, fail silently
    }
  }, []);

  const checkPrayer = useCallback(() => {
    if (visible && !isTestMode) return;
    const { shouldShow, prayer, dateStr } = shouldShowPrayerPopup();
    if (shouldShow && prayer) {
      setActivePrayer(prayer);
      setCurrentDateStr(dateStr);
      setVisible(true);
      playGentleChime();
    }
  }, [visible, isTestMode, playGentleChime]);

  useEffect(() => {
    // Initial check on mount
    const timeout = setTimeout(checkPrayer, 2500);

    // Periodic check every 1 minute
    const interval = setInterval(checkPrayer, 60000);

    // Allow manual testing via CustomEvent
    const handleTestEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prayer?: PrayerName }>;
      const requestedKey = customEvent.detail?.prayer || 'dhuhr';
      const schedule = getDayPrayerSchedule();
      const prayer =
        schedule.currentPrayer?.key === requestedKey
          ? schedule.currentPrayer
          : schedule.currentPrayer || {
              key: 'dhuhr',
              englishName: 'Dhuhr',
              banglaName: 'যোহর',
              time: schedule.dhuhr,
              formattedTime: formatBengaliTime(schedule.dhuhr),
              question: 'যোহরের নামাজ পড়সো?',
              encouragement: 'পড়াশোনার ফাঁকে একটু বিরতি নিয়ে মনকে প্রশান্ত করে এসো।',
              quranHadithQuote: '“নিশ্চয়ই নামাজ মানুষকে অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।” (সূরা আনকাবুত: ৪৫)',
            };

      setActivePrayer(prayer);
      setCurrentDateStr(getTodayDateString());
      setIsTestMode(true);
      setVisible(true);
      playGentleChime();
    };

    window.addEventListener('test-prayer-reminder', handleTestEvent);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('test-prayer-reminder', handleTestEvent);
    };
  }, [checkPrayer, playGentleChime]);

  if (!visible || !activePrayer) return null;

  const handlePrayed = () => {
    if (!isTestMode) {
      markPrayerAction(activePrayer.key, currentDateStr, 'prayed');
    }
    setFeedbackMessage('মাশাআল্লাহ! আল্লাহ আপনার নামাজ কবুল করুন 🤲');
    setTimeout(() => {
      setVisible(false);
      setFeedbackMessage(null);
      setIsTestMode(false);
    }, 2200);
  };

  const handleWillPrayNow = () => {
    if (!isTestMode) {
      markPrayerAction(activePrayer.key, currentDateStr, 'will_pray');
    }
    setFeedbackMessage('আল্লাহ সহজ করুন! নামাজের পর আবার দেখা হবে 😊');
    setTimeout(() => {
      setVisible(false);
      setFeedbackMessage(null);
      setIsTestMode(false);
    }, 2200);
  };

  const handleSnooze = () => {
    if (!isTestMode) {
      setSnoozeMinutes(10);
    }
    setFeedbackMessage('ঠিক আছে! ১০ মিনিট পর আবার মনে করিয়ে দেবো ⏰');
    setTimeout(() => {
      setVisible(false);
      setFeedbackMessage(null);
      setIsTestMode(false);
    }, 1800);
  };

  const handleDismiss = () => {
    if (!isTestMode) {
      markPrayerAction(activePrayer.key, currentDateStr, 'dismissed');
    }
    setVisible(false);
    setIsTestMode(false);
  };

  const handleDisableReminders = () => {
    setReminderEnabled(false);
    setFeedbackMessage('নামাজ রিমাইন্ডার বন্ধ করা হয়েছে। প্রোফাইল বা সেটিংসে চাইলে যেকোনো সময় চালু করতে পারবেন।');
    setTimeout(() => {
      setVisible(false);
      setFeedbackMessage(null);
      setIsTestMode(false);
    }, 2500);
  };

  const getWaqtIcon = () => {
    switch (activePrayer.key) {
      case 'fajr':
        return <Moon className="w-5 h-5 text-amber-300" />;
      case 'dhuhr':
        return <Sun className="w-5 h-5 text-amber-300" />;
      case 'asr':
        return <Sun className="w-5 h-5 text-orange-300" />;
      case 'maghrib':
        return <Sunset className="w-5 h-5 text-rose-300" />;
      case 'isha':
        return <Moon className="w-5 h-5 text-indigo-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-300" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-label="নামাজ রিমাইন্ডার"
      className="fixed bottom-24 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-900/10 overflow-hidden ring-1 ring-black/5">
        {/* Header Ribbon with Serene Islamic Palette */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 relative overflow-hidden">
          {/* Subtle decorative arch background motif */}
          <div className="absolute -right-4 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-sm pointer-events-none" />
          <div className="absolute right-8 top-1 text-white/10 text-3xl font-serif select-none pointer-events-none">
            ﷽
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs">
                {getWaqtIcon()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-emerald-200">
                    নামাজের সময় স্মরণ
                  </span>
                  {isTestMode && (
                    <span className="text-[10px] bg-amber-400 text-neutral-900 font-bold px-1.5 py-0.5 rounded-full">
                      টেস্ট মোড
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {activePrayer.banglaName} ওয়াক্ত · {activePrayer.formattedTime}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback confirmation overlay if answered */}
        {feedbackMessage ? (
          <div className="p-6 text-center space-y-2 bg-emerald-50/60 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-md">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-emerald-950 leading-relaxed">
              {feedbackMessage}
            </p>
          </div>
        ) : (
          /* Main Dialog Body */
          <div className="p-4 sm:p-5 space-y-4">
            {/* Friendly core question */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                <span>{activePrayer.question}</span>
                <span className="text-emerald-700">🕌</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {activePrayer.encouragement}
              </p>
            </div>

            {/* Hadith / Quranic Reminder Quote Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-emerald-900/90 leading-relaxed italic flex items-start gap-2">
              <span className="text-emerald-600 font-serif text-base not-italic leading-none">“</span>
              <p className="flex-1">{activePrayer.quranHadithQuote.replace(/^[“”]/, '').replace(/[“”]$/, '')}</p>
            </div>

            {/* Interactive Actions Grid */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handlePrayed}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>হ্যাঁ, আলহামদুলিল্লাহ পড়েছি</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleWillPrayNow}
                  className="py-2 px-3 rounded-xl border border-emerald-700/30 text-emerald-800 hover:bg-emerald-50 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>এখন পড়ব</span>
                  <span className="text-[10px] text-emerald-600">ইনশাআল্লাহ</span>
                </button>

                <button
                  type="button"
                  onClick={handleSnooze}
                  className="py-2 px-3 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>১০ মিনিট পর বলো</span>
                </button>
              </div>
            </div>

            {/* Footer quiet controls */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
              <span>ওয়াক্ত শেষ হওয়ার আগেই আদায় করে নিন</span>
              <button
                type="button"
                onClick={handleDisableReminders}
                className="text-neutral-400 hover:text-neutral-600 underline cursor-pointer"
              >
                রিমাইন্ডার বন্ধ করুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
