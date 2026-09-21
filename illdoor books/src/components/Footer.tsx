import React from 'react';
import { BookOpen, ShieldCheck, MapPin, Heart } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { IlldoorLogo } from './common/IlldoorLogo';

export const Footer: React.FC = () => {
  const { setActiveView } = useMarketplace();

  return (
    <footer className="mt-16 border-t border-[#e5e5e5] bg-white text-neutral-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-3">
              <IlldoorLogo height={32} />
            </div>
            <p className="text-neutral-500 leading-relaxed text-[11px]">
              বাংলাদেশ পলিটেকনিক ইনস্টিটিউট ডিপ্লোমা ইন ইঞ্জিনিয়ারিং শিক্ষার্থীদের জন্য সরাসরি বই কেনাবেচার নির্ভরযোগ্য ক্যাম্পাস মার্কেটপ্লেস।
            </p>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>ক্যাম্পাস এসক্রো ও পিন হ্যান্ডওভার সুরক্ষা</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              মার্কেটপ্লেস
            </h4>
            <ul className="space-y-1.5 text-neutral-500">
              <li>
                <button
                  onClick={() => {
                    setActiveView('browse');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#ef4d23] cursor-pointer"
                >
                  সব একাডেমিক বই
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('semester-bundles');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#ef4d23] cursor-pointer"
                >
                  সেমিস্টার বইয়ের বান্ডেল
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('sell');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#ef4d23] cursor-pointer"
                >
                  বই বিক্রি করুন (০% ফি)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#ef4d23] cursor-pointer"
                >
                  অর্ডার ও পিকআপ পিন ট্র্যাক করুন
                </button>
              </li>
            </ul>
          </div>

          {/* Technologies */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              বিভাগসমূহ
            </h4>
            <ul className="space-y-1.5 text-neutral-500">
              <li>কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি (৮৫)</li>
              <li>সিভিল টেকনোলজি (৬৪)</li>
              <li>ইলেকট্রিক্যাল টেকনোলজি (৬৭)</li>
              <li>মেকানিক্যাল টেকনোলজি (৭০)</li>
              <li>ইলেকট্রনিক্স টেকনোলজি (৬৮)</li>
            </ul>
          </div>

          {/* Safety & Operations */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              ক্যাম্পাস কার্যক্রম
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              পলিটেকনিক ক্যাম্পাসগুলোর সেন্ট্রাল লাইব্রেরি ও ডিপার্টমেন্টের নির্দিষ্ট ডেস্কে নিরাপদ ড্রপ-অফ ও হ্যান্ডওভার সুবিধা।
            </p>
            <div className="pt-1">
              <button
                onClick={() => {
                  setActiveView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-semibold text-neutral-500 hover:text-[#0b0f1a] flex items-center gap-1 cursor-pointer"
              >
                <span>ক্যাম্পাস ডেস্ক অপারেশন পোর্টাল</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-[11px]">
          <p>© {new Date().getFullYear()} পলিটেকনিক ব্যবহৃত বই মার্কেটপ্লেস। শিক্ষার্থীদের ক্যাম্পাস প্ল্যাটফর্ম।</p>
          <div className="flex items-center gap-4">
            <span>বিটিইবি ২০১৬ ও ২০২২ প্রবিধান</span>
            <span>•</span>
            <span>বিনা ফিতে শিক্ষার্থীদের কমিউনিটি</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
