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
    if (draft.contactEnabled && !phone && !whatsapp) {
      setFeedback({ ok: false, text: 'যোগাযোগ চালু করতে অন্তত একটি নম্বর দিন।' });
      return;
    }
    if (draft.contactEnabled && draft.preferredMethod === 'phone' && !phone) {
      setFeedback({ ok: false, text: 'শুধু কল নির্বাচন করলে কল করার নম্বর দিতে হবে।' });
      return;
    }
    if (draft.contactEnabled && draft.preferredMethod === 'whatsapp' && !whatsapp) {
      setFeedback({ ok: false, text: 'শুধু WhatsApp নির্বাচন করলে WhatsApp নম্বর দিতে হবে।' });
      return;
    }
    try {
      await savePreferences({ ...draft, contactPhone: phone, whatsappPhone: whatsapp });
      setFeedback({ ok: true, text: 'যোগাযোগের পছন্দ সংরক্ষিত হয়েছে।' });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : 'সেটিংস সংরক্ষণ করা যায়নি।' });
    }
  };

  return <section className="bg-white rounded-3xl border border-[#e5e5e5] p-5 sm:p-6 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-xs font-bold uppercase text-[#ef4d23]">গোপনীয় যোগাযোগ</span>
        <h2 className="text-lg font-bold">বিক্রেতার যোগাযোগ পছন্দ</h2>
        <p className="text-xs text-neutral-500 mt-1">শুধু লগইন করা একই ইনস্টিটিউটের আগ্রহী শিক্ষার্থী নিরাপদ যাচাইয়ের পর অনুমোদিত নম্বর দেখতে পারবে।</p>
      </div>
      <ShieldCheck className="w-6 text-emerald-600 shrink-0" />
    </div>
    {loadingPreferences ? <div className="py-6 flex justify-center"><Loader2 className="animate-spin" /></div> : <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <label className="sm:col-span-2 flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f5f2ee] border">
        <span><b className="text-sm">ক্রেতাদের যোগাযোগের অনুমতি দিন</b><small className="block text-neutral-500">বন্ধ রাখলে কোনো নম্বর প্রকাশ হবে না।</small></span>
        <input type="checkbox" checked={draft.contactEnabled} onChange={(event) => setDraft({ ...draft, contactEnabled: event.target.checked })} className="w-5 h-5 accent-[#ef4d23]" />
      </label>
      <label className="text-xs font-semibold text-neutral-600">কল করার নম্বর
        <input value={draft.contactPhone} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} placeholder="+8801XXXXXXXXX" inputMode="tel" maxLength={32} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal" />
      </label>
      <label className="text-xs font-semibold text-neutral-600">WhatsApp নম্বর
        <input value={draft.whatsappPhone} onChange={(event) => setDraft({ ...draft, whatsappPhone: event.target.value })} placeholder="+8801XXXXXXXXX" inputMode="tel" maxLength={32} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal" />
      </label>
      <label className="text-xs font-semibold text-neutral-600 sm:col-span-2">পছন্দের মাধ্যম
        <select value={draft.preferredMethod} onChange={(event) => setDraft({ ...draft, preferredMethod: event.target.value as ContactPreferences['preferredMethod'] })} className="mt-1 w-full p-3 rounded-xl border text-sm font-normal">
          <option value="both">কল ও WhatsApp—যেটি দেওয়া আছে</option><option value="phone">শুধু কল</option><option value="whatsapp">শুধু WhatsApp</option>
        </select>
      </label>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className={`text-xs ${feedback?.ok ? 'text-emerald-700' : 'text-red-700'}`}>{feedback?.text}</p>
        <Button size="sm" onClick={save} disabled={savingPreferences}>{savingPreferences ? 'সংরক্ষণ হচ্ছে…' : 'সেটিংস সংরক্ষণ'}</Button>
      </div>
    </div>}
  </section>;
};
