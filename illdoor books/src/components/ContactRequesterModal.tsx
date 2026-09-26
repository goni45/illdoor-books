import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  User,
  School,
  GraduationCap,
  Layers3,
  BookOpen,
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';
import type { BookRequest } from '../types';

interface ContactRequesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: BookRequest;
  onStartSell?: (request: BookRequest) => void;
  contactData: {
    phone?: string;
    whatsapp?: string;
    errorMessage?: string;
  };
  isLoading?: boolean;
}

const cleanPhoneDigits = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return digits.startsWith('01') ? `88${digits}` : digits;
};

export const ContactRequesterModal: React.FC<ContactRequesterModalProps> = ({
  isOpen,
  onClose,
  request,
  onStartSell,
  contactData,
  isLoading = false,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  if (!isOpen) return null;

  const isBundle = request.requestType === 'full_semester' || request.subjectCode === 'FULL SET';

  const phone = contactData.phone || request.requesterPhone;
  const whatsapp = contactData.whatsapp || request.requesterWhatsapp || phone;

  // Custom prefilled WhatsApp message for polite conversation
  const whatsappMessage = isBundle
    ? `আসসালামু আলাইকুম ${request.requesterName}, Illdoor-এ আপনার "${request.title}" (${request.department}, ${request.semester}) সম্পূর্ণ বইয়ের সেটের রিকোয়েস্টটি দেখেছি। আমার কাছে এই সেটের বইগুলো রয়েছে। আপনার কি এখনো প্রয়োজন আছে?`
    : `আসসালামু আলাইকুম ${request.requesterName}, Illdoor-এ আপনার "${request.title}" (কোড: ${request.subjectCode}) বইটির রিকোয়েস্টটি দেখেছি। বইটি আমার কাছে রয়েছে। আপনি কি নিতে চান?`;

  const whatsappUrl = whatsapp
    ? `https://wa.me/${cleanPhoneDigits(whatsapp)}?text=${encodeURIComponent(whatsappMessage)}`
    : '';

  const handleCopy = (text: string, type: 'phone' | 'whatsapp') => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-neutral-100">
          <div className="relative">
            <UserAvatar name={request.requesterName} src={request.requesterAvatar} size="lg" />
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white border-2 border-white">
              <Check className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-neutral-900 text-base truncate">
                {request.requesterName}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#ef4d23]">
                ক্রেতা / শিক্ষার্থী
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
              <School className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
              <span>{request.requesterInstitute || request.department || 'ক্যাম্পাস শিক্ষার্থী'}</span>
            </p>
          </div>
        </div>

        {/* Requested Book / Bundle Summary Box */}
        <div
          className={`p-3.5 rounded-2xl mb-5 border ${
            isBundle
              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
              : 'bg-neutral-50 border-neutral-200/80 text-neutral-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              {isBundle ? (
                <>
                  <Layers3 className="w-3 h-3 text-[#ef4d23]" />
                  <span>সেমিস্টার সেট রিকোয়েস্ট</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3 h-3 text-[#ef4d23]" />
                  <span>একক বইয়ের রিকোয়েস্ট</span>
                </>
              )}
            </span>
            {request.maxBudget != null && (
              <span className="text-xs font-extrabold text-[#ef4d23]">
                বাজেট: ৳{request.maxBudget}
              </span>
            )}
          </div>
          <p className="font-bold text-sm leading-snug line-clamp-2 mb-1">{request.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-neutral-600 flex-wrap">
            <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-neutral-200">
              {request.subjectCode}
            </span>
            <span>{request.department}</span>
            <span>•</span>
            <span>{request.semester}</span>
          </div>
        </div>

        {/* Contact Numbers Section */}
        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#ef4d23] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 font-medium">যোগাযোগের তথ্য লোড হচ্ছে...</p>
          </div>
        ) : !phone && !whatsapp ? (
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-center mb-5">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-amber-900 font-medium">
              {contactData.errorMessage || 'এই শিক্ষার্থী সরাসরি যোগাযোগের নম্বর দেননি। আপনি সাইটে লিস্টিং বা অফার পোস্ট করতে পারেন।'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            <p className="text-xs font-bold text-neutral-700">সরাসরি যোগাযোগের অপশন:</p>

            {/* WhatsApp Option Button */}
            {whatsapp && (
              <div className="flex items-center gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-100"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>হোয়াটসঅ্যাপে চ্যাট করুন (WhatsApp)</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(whatsapp, 'whatsapp')}
                  title="WhatsApp নম্বর কপি করুন"
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200 transition-colors cursor-pointer"
                >
                  {copiedWhatsapp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Direct Phone Call Option Button */}
            {phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-100"
                >
                  <Phone className="w-4 h-4 fill-white" />
                  <span>সরাসরি কল দিন ({phone})</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(phone, 'phone')}
                  title="ফোন নম্বর কপি করুন"
                  className="p-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl border border-neutral-200 transition-colors cursor-pointer"
                >
                  {copiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Secondary: Sell page prefill redirect */}
        {onStartSell && (
          <div className="pt-3 border-t border-neutral-100">
            <button
              onClick={() => {
                onClose();
                onStartSell(request);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ef4d23] font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              {isBundle
                ? 'অনলাইনে এই সেটের সেল লিস্টিং তৈরি করতে চান? এখানে চাপুন'
                : 'অনলাইনে এই বইটির সেল লিস্টিং তৈরি করতে চান? এখানে চাপুন'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
