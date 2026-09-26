import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, X, Heart } from 'lucide-react';
import { getTipJarSettings, fetchTipJarSettings, subscribeTipJarSettings, TipJarSettings } from '../lib/tipJarStorage';
import { TipJarModal } from './TipJarModal';
import { useLocation } from 'react-router-dom';

export const TipJarWidget: React.FC = () => {
  const [settings, setSettings] = useState<TipJarSettings>(getTipJarSettings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [imgError, setImgError] = useState(false);
  const location = useLocation();

  // Hide on admin dashboard to keep admin clean and distraction-free
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    fetchTipJarSettings().then((loaded) => {
      setSettings(loaded);
    });

    const unsubscribe = subscribeTipJarSettings((updated) => {
      setSettings(updated);
    });
    return () => unsubscribe();
  }, []);

  if (!settings.enabled || isAdminPath) {
    return null;
  }

  const imageSource = imgError ? '/iphone-fund-meme.jpg' : settings.imageUrl || '/iphone-fund-meme.jpg';

  return (
    <>
      {/* Floating Pill / Button */}
      <aside
        aria-label="Help me buy an iPhone fund widget"
        className="fixed z-40 left-3 sm:left-6 bottom-20 sm:bottom-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
      >
        {isMinimized ? (
          /* Minimized circular/rounded button */
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsMinimized(false);
            }}
            title="Help me to buy a new iPhone (Click to open, right click to expand)"
            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] border-2 border-amber-400 p-1 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <img
              src={imageSource}
              alt="iPhone Fund Meme"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-xl"
            />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ef4d23] text-white flex items-center justify-center text-xs shadow-md animate-pulse">
              📱
            </span>
          </button>
        ) : (
          /* Expanded pill button with prominent meme image */
          <div className="group relative flex items-center bg-white/98 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.2)] border-2 border-amber-400/90 p-1.5 sm:p-2 pr-3 sm:pr-4 hover:shadow-[0_16px_40px_rgba(239,77,35,0.28)] hover:border-[#ef4d23] transition-all duration-200">
            {/* Clickable Area to open Modal */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 cursor-pointer focus:outline-none"
            >
              {/* Prominent Meme Image (Large and clear) */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-amber-400 bg-neutral-900 shrink-0 shadow-md">
                <img
                  src={imageSource}
                  alt="Meme"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Title & Micro badge */}
              <div className="flex flex-col text-left pr-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-neutral-900 leading-tight group-hover:text-[#ef4d23] transition-colors whitespace-nowrap">
                    {/* Compact on mobile, full on sm+ */}
                    <span className="inline min-[420px]:hidden">Help iPhone plssss</span>
                    <span className="hidden min-[420px]:inline">
                      {settings.buttonText.includes('plsssssssss')
                        ? settings.buttonText
                        : `${settings.buttonText} plsssssssss`}
                    </span>
                  </span>
                  <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#ef4d23] animate-ping" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-neutral-600 font-semibold leading-tight mt-0.5">
                  Send Money (bKash/Nagad/Rocket)
                </span>
                <span className="text-[9px] text-amber-700 font-medium">
                  ক্লিক করে ডোনেট করুন বা নম্বর দেখুন
                </span>
              </div>
            </button>

            {/* Quick minimize button (Enlarged for easy tapping/clicking) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(true);
              }}
              title="উইজেট সংকুচিত করুন (Minimize)"
              aria-label="Minimize widget"
              className="ml-2 mr-0.5 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-500 hover:text-neutral-900 border border-neutral-200 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </aside>

      {/* Pop-up Donation Modal */}
      <TipJarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settings={settings}
      />
    </>
  );
};
