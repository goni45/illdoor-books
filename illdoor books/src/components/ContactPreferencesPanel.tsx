import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useContactMarketplace } from '../hooks/useContactMarketplace';
import type { ContactPreferences } from '../types';
import { Button } from './common/Button';

export const ContactPreferencesPanel: React.FC = () => {
  const { preferences, loadingPreferences, savingPreferences, savePreferences } = useContactMarketplace(true);
  const [draft, setDraft] = useState<ContactPreferences>(preferences);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setDraft(preferences), [preferences]);

  const save = async () => {
    setFeedback(null);
    const phone = draft.contactPhone.trim();
    const whatsapp = draft.whatsappPhone.trim();
    if (!phone) {
      setFeedback({ ok: false, text: 'কল করার নম্বর অবশ্যই দিতে হবে।' });
      return;
    }
    if (!whatsapp) {
      setFeedback({ ok: false, text: 'WhatsApp নম্বর অবশ্যই দিতে হবে।' });
      return;
    }
    try {
      await savePreferences({ ...draft, contactEnabled: true, contactPhone: phone, whatsappPhone: whatsapp });
      setFeedback({ ok: true, text: 'যোগাযোগের তথ্য ও পছন্দ সফলভাবে সংরক্ষিত হয়েছে।' });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : 'সেটিংস সংরক্ষণ করা যায়নি।' });
    }
  };

  return <section className="bg-white rounded-3xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-xs font-bold uppercase text-[#ef4d23]">সরাসরি যোগাযোগ তথ্য</span>
        <h2 className="text-lg font-bold">আপনার যোগাযোগের নম্বর ও পছন্দ</h2>
        <p className="text-xs text-neutral-500 mt-1">ক্যাম্পাস মার্কেটপ্লেসে বই কেনাবেচা ও রিকোয়েস্টে সহপাঠীরা আপনার দেওয়া নম্বরে কল বা WhatsApp-এ যোগাযোগ করতে পারবেন।</p>
      </div>
      <ShieldCheck className="w-6 text-emerald-600 shrink-0" />
    </div>
    {loadingPreferences ? <div className="py-6 flex justify-center"><Loader2 className="animate-spin" /></div> : <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <div className="sm:col-span-2 flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
        <span className="text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>সরাসরি যোগাযোগ সক্রিয় (সহপাঠী শিক্ষার্থীদের সাথে সহজ লেনদেনের জন্য যোগাযোগ তথ্য বাধ্যতামূলক)</span>
        </span>
      </div>
      <label className="text-xs font-semibold text-neutral-600">কল করার নম্বর *
        <input value={draft.contactPhone} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} placeholder="01XXXXXXXXX" inputMode="tel" maxLength={32} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal focus:outline-none focus:border-[#ef4d23]" required />
      </label>
      <label className="text-xs font-semibold text-neutral-600">WhatsApp নম্বর *
        <input value={draft.whatsappPhone} onChange={(event) => setDraft({ ...draft, whatsappPhone: event.target.value })} placeholder="01XXXXXXXXX" inputMode="tel" maxLength={32} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal focus:outline-none focus:border-[#ef4d23]" required />
      </label>
      <label className="text-xs font-semibold text-neutral-600 sm:col-span-2">পছন্দের যোগাযোগের মাধ্যম
        <select value={draft.preferredMethod} onChange={(event) => setDraft({ ...draft, preferredMethod: event.target.value as ContactPreferences['preferredMethod'] })} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal focus:outline-none focus:border-[#ef4d23]">
          <option value="both">কল ও WhatsApp—উভয় মাধ্যমেই যোগাযোগ সম্ভব</option><option value="whatsapp">হোয়াটসঅ্যাপ (WhatsApp) অগ্রাধিকার</option><option value="phone">সরাসরি ফোন কল অগ্রাধিকার</option>
        </select>
      </label>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className={`text-xs ${feedback?.ok ? 'text-emerald-700 font-semibold' : 'text-red-700'}`}>{feedback?.text}</p>
        <Button size="sm" onClick={save} disabled={savingPreferences}>{savingPreferences ? 'সংরক্ষণ হচ্ছে…' : 'সেটিংস সংরক্ষণ'}</Button>
      </div>
    </div>}
  </section>;
};
