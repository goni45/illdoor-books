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
              The dedicated peer-to-peer textbook marketplace for Bangladesh Polytechnic Diploma in Engineering students.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Escrow & PIN Handover Protection</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              Marketplace
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
                  All Books
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
                  Sell Your Book (0% Fee)
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
                  Track Pickup PIN
                </button>
              </li>
            </ul>
          </div>

          {/* Technologies */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              Departments
            </h4>
            <ul className="space-y-1.5 text-neutral-500">
              <li>Computer Science & Technology (85)</li>
              <li>Civil Technology (64)</li>
              <li>Electrical Technology (67)</li>
              <li>Mechanical Technology (70)</li>
              <li>Electronics Technology (68)</li>
            </ul>
          </div>

          {/* Safety & Operations */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#0b0f1a] text-xs uppercase tracking-wider">
              Campus Operations
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Safe drop-offs handled at Central Library and departmental office desks across major Polytechnic campuses.
            </p>
            <div className="pt-1">
              <button
                onClick={() => {
                  setActiveView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-semibold text-neutral-500 hover:text-[#0b0f1a] flex items-center gap-1 cursor-pointer"
              >
                <span>Campus Desk Operations Portal</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400 text-[11px]">
          <p>© {new Date().getFullYear()} Polytechnic Used Book Marketplace. Student peer-to-peer project.</p>
          <div className="flex items-center gap-4">
            <span>BTEB 2016 & 2022 Probidhan</span>
            <span>•</span>
            <span>Zero-Fee Student Community</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
