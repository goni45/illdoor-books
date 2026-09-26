import React, { useState } from 'react';
import { X, Copy, Check, Heart, Smartphone, Sparkles, AlertCircle, Trophy } from 'lucide-react';
import { TipJarSettings } from '../lib/tipJarStorage';

interface TipJarModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TipJarSettings;
}

export const TipJarModal: React.FC<TipJarModalProps> = ({ isOpen, onClose, settings }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async (key: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const imageSource = imgError ? '/iphone-fund-meme.jpg' : settings.imageUrl || '/iphone-fund-meme.jpg';
  const progressPercent = settings.targetAmount > 0
    ? Math.min(100, Math.round((settings.collectedAmount / settings.targetAmount) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header background banner (Single Solid Orange, No Gradients) */}
        <div className="relative bg-[#ef4d23] p-5 sm:p-6 text-white text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Meme Image Avatar / Card */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3 group">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/95 bg-neutral-900 flex items-center justify-center">
                <img
                  src={imageSource}
                  alt="Help me buy a new iPhone meme"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="absolute -bottom-2 -right-2 bg-amber-400 text-neutral-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border-2 border-white">
                <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                iPhone 📱
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-1.5 justify-center">
              {(settings.title || 'Help me to buy a new iPhone')
                .replace(/📱/g, '')
                .trim()
                .replace(/plsssssssss/gi, '')
                .trim()} plsssssssss
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-medium text-amber-100 max-w-sm mx-auto leading-relaxed bg-black/25 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10 shadow-xs">
              {settings.subtitle || 'আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈'}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-neutral-800">
          {/* Progress Goal & Donors Leaderboard */}
          <div className="space-y-3">
            {settings.targetAmount > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-900 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                    নতুন iPhone ফান্ড অগ্রগতি
                  </span>
                  <span className="text-[#ef4d23] font-bold">
                    {progressPercent}% সম্পূর্ণ
                  </span>
                </div>
                <div className="w-full bg-amber-200/70 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-[#ef4d23] h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800/80 mt-1.5 font-medium">
                  <span>সংগৃহীত: ৳{settings.collectedAmount.toLocaleString()}</span>
                  <span>টার্গেট: ৳{settings.targetAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Donors Leaderboard */}
            {settings.showLeaderboard !== false && (settings.leaderboard?.length ?? 0) > 0 && (
              <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Trophy className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>লিডারবোর্ড ও সাম্প্রতিক সহায়তা</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/60">
                    Top Supporters
                  </span>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {settings.leaderboard?.map((donor, idx) => (
                    <div
                      key={donor.id || idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/95 border border-amber-100 hover:border-amber-300 transition-colors text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-[#ef4d23] text-white flex items-center justify-center font-black text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate flex items-center gap-1">
                            <span className="text-neutral-950">{donor.name}</span>
                            <span className="text-[11px] text-neutral-500 font-normal">
                              just sent
                            </span>
                            <span className="text-[#ef4d23] font-bold font-mono">
                              {donor.amount} taka
                            </span>
                          </p>
                          {donor.message && (
                            <p className="text-[10px] text-neutral-500 italic truncate">
                              "{donor.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      {donor.timeAgo && (
                        <span className="text-[10px] text-neutral-400 shrink-0 whitespace-nowrap bg-neutral-50 px-1.5 py-0.5 rounded-md border border-neutral-100">
                          {donor.timeAgo}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <span>টাকা পাঠানোর উপায় (Send Money / Personal)</span>
            </h3>

            {/* 1. bKash */}
            {settings.bkashNumber && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-pink-200 bg-pink-50/50 hover:bg-pink-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#e2136e] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    bKash
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-900 text-sm sm:text-base font-mono tracking-wide">
                        {settings.bkashNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-pink-700 font-medium">
                      {settings.bkashType || 'Personal (Send Money)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy('bkash', settings.bkashNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedKey === 'bkash'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-pink-300 text-pink-700 hover:bg-pink-100/60'
                  }`}
                >
                  {copiedKey === 'bkash' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2. Nagad */}
            {settings.nagadNumber && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f7941d] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    নগদ
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-900 text-sm sm:text-base font-mono tracking-wide">
                        {settings.nagadNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-orange-700 font-medium">
                      {settings.nagadType || 'Personal (Send Money)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy('nagad', settings.nagadNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedKey === 'nagad'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-orange-300 text-orange-700 hover:bg-orange-100/60'
                  }`}
                >
                  {copiedKey === 'nagad' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 3. Rocket */}
            {settings.rocketNumber && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#8c3494] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    রকেট
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-900 text-sm sm:text-base font-mono tracking-wide">
                        {settings.rocketNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-700 font-medium">
                      {settings.rocketType || 'Personal (Send Money)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy('rocket', settings.rocketNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedKey === 'rocket'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-100/60'
                  }`}
                >
                  {copiedKey === 'rocket' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Friendly Note */}
          {settings.note && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs text-neutral-600 flex items-start gap-2.5 leading-relaxed">
              <Heart className="w-4 h-4 text-[#ef4d23] shrink-0 mt-0.5 fill-[#ef4d23]/20" />
              <span>{settings.note}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-neutral-100/80 border-t border-neutral-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-medium">
            <Heart className="w-3.5 h-3.5 text-[#ef4d23] shrink-0 fill-[#ef4d23]/20" />
            <span>We are not forcing anyone to donate, it's your choice but plssss</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
