import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 p-8 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#ef4d23] flex items-center justify-center mx-auto border border-orange-100">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">Error 404</span>
          <h1 className="text-2xl font-bold text-neutral-900">পাতাটি খুঁজে পাওয়া যায়নি</h1>
          <p className="text-sm text-neutral-500">
            Page Not Found. আপনি যে লিংকটি খুঁজছেন তা হয়তো সরানো হয়েছে অথবা ভুল ঠিকানায় প্রবেশ করেছেন।
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>হোমে যান (Home)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/books')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>বই খুঁজুন (Browse)</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
