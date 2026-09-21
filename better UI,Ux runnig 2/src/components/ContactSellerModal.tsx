import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react';
import { useContactMarketplace } from '../hooks/useContactMarketplace';
import type { ContactRevealResult, StudentUser } from '../types';
import { Button } from './common/Button';
import { UserAvatar } from './common/UserAvatar';

interface ContactSellerModalProps {
  open: boolean;
  onClose: () => void;
  seller: StudentUser;
  title: string;
  subtitle?: string;
  pickupText?: string;
  listingId?: string;
  bundleId?: string;
  bookId?: string;
  defaultMessage: string;
}

const whatsappDigits = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('01') ? `88${digits}` : digits;
};

export const ContactSellerModal: React.FC<ContactSellerModalProps> = (props) => {
  const { revealContact } = useContactMarketplace();
  const [message, setMessage] = useState(props.defaultMessage);
  const [revealed, setRevealed] = useState<ContactRevealResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(props.defaultMessage);
    setRevealed(null);
    setError('');
    setCopied(false);
  }, [props.defaultMessage, props.listingId, props.bundleId, props.bookId]);

  const whatsappUrl = useMemo(() => revealed?.whatsappPhone
    ? 'https:' + '//wa.me/' + whatsappDigits(revealed.whatsappPhone) + '?text=' + encodeURIComponent(message)
    : '', [message, revealed]);

  if (!props.open) return null;

  const handleReveal = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await revealContact({
        listingId: props.listingId,
        bundleId: props.bundleId,
        bookId: props.bookId,
        message,
      });
      if (!result.contactPhone && !result.whatsappPhone) throw new Error('Seller has no enabled contact method.');
      setRevealed(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'যোগাযোগের তথ্য দেখানো যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const copyNumber = async () => {
    const value = revealed?.contactPhone || revealed?.whatsappPhone;
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="বিক্রেতার সাথে যোগাযোগ">
    <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl">
      <header className="p-5 border-b flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
        <div className="flex gap-3 items-center">
          <UserAvatar src={props.seller.avatar} name={props.seller.name} isVerified={props.seller.isVerified} />
          <div>
            <p className="text-xs font-bold text-[#ef4d23]">সরাসরি বিক্রেতার সাথে যোগাযোগ</p>
            <h2 className="font-bold text-lg">{props.seller.name}</h2>
            <p className="text-xs text-neutral-500">{props.seller.institute} • {props.seller.department}</p>
          </div>
        </div>
        <button onClick={props.onClose} className="p-2 cursor-pointer" aria-label="বন্ধ করুন"><X className="w-5" /></button>
      </header>
      <div className="p-5 space-y-4">
        <div className="p-4 rounded-2xl bg-[#f5f2ee]">
          <h3 className="font-bold text-sm">{props.title}</h3>
          {props.subtitle && <p className="text-xs text-neutral-600 mt-1">{props.subtitle}</p>}
          {props.pickupText && <p className="text-xs text-neutral-600 mt-2">📍 {props.pickupText}</p>}
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
          <b className="flex items-center gap-2"><ShieldCheck className="w-4" />নিরাপত্তা নির্দেশনা</b>
          <ul className="list-disc pl-5 mt-2 space-y-1 leading-relaxed">
            <li>ক্যাম্পাসের জনসমাগমপূর্ণ স্থানে দেখা করুন।</li>
            <li>বইয়ের অবস্থা মিলিয়ে তারপর মূল্য পরিশোধ করুন।</li>
            <li>আগাম টাকা, OTP, PIN বা সংবেদনশীল তথ্য শেয়ার করবেন না।</li>
            <li>Illdoor পেমেন্ট নেয় না এবং ব্যক্তিগত লেনদেনের গ্যারান্টি দেয় না।</li>
          </ul>
        </div>
        <label className="text-xs font-semibold text-neutral-600 block">বিক্রেতাকে পাঠানোর বার্তা
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={3} className="w-full mt-1 p-3 rounded-xl border text-sm font-normal" />
        </label>
        {!revealed ? <Button fullWidth onClick={handleReveal} disabled={busy} icon={<ShieldCheck className="w-4" />}>
          {busy ? 'যাচাই করা হচ্ছে…' : 'যোগাযোগের তথ্য দেখুন'}
        </Button> : <div className="space-y-3">
          <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 shrink-0" />একই ইনস্টিটিউট যাচাই হয়েছে। বিক্রেতার অনুমোদিত মাধ্যম দেখানো হলো।</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {revealed.whatsappPhone && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex justify-center items-center gap-2"><MessageCircle className="w-4" />WhatsApp</a>}
            {revealed.contactPhone && <a href={`tel:${revealed.contactPhone}`} className="p-3 rounded-xl bg-[#0b0f1a] text-white text-sm font-bold flex justify-center items-center gap-2"><Phone className="w-4" />কল করুন</a>}
          </div>
          <button onClick={copyNumber} className="w-full p-2 rounded-xl border text-xs font-semibold flex justify-center gap-2 cursor-pointer"><Copy className="w-3.5" />{copied ? 'কপি হয়েছে' : 'নম্বর কপি করুন'}</button>
        </div>}
        {error && <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2"><AlertTriangle className="w-4 shrink-0" />{error}</p>}
      </div>
    </div>
  </div>;
};
