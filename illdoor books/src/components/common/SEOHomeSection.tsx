import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Layers,
  Zap,
  Settings,
  Radio,
  Sparkles,
} from 'lucide-react';

interface FAQItem {
  q: string;
  qEn: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'Illdoor-এ পলিটেকনিকের পুরাতন বই কীভাবে বিক্রি করব? (How to sell my books in BD)',
    qEn: 'How can I sell my used polytechnic books on Illdoor?',
    a: "খুব সহজ! আপনার মোবাইল নম্বর দিয়ে লগইন করে 'Sell Book' বাটনে ক্লিক করুন। বইয়ের কভার ও পাতার ছবি তুলুন, বিষয় কোড ও আপনার নির্ধারিত মূল্য লিখে পোস্ট করুন। আগ্রহী শিক্ষার্থীরা সরাসরি যোগাযোগ করে বই কিনবে। কোনো মধ্যস্থতাকারী ফি নেই।",
  },
  {
    q: 'পলিটেকনিকের কোন কোন ডিপার্টমেন্ট ও টেকনোলজির বই এখানে পাওয়া যায়?',
    qEn: 'Which BTEB polytechnic departments are covered?',
    a: 'Illdoor-এ BTEB অনুমোদিত সকল ডিপার্টমেন্ট যেমন—কম্পিউটার (Computer), সিভিল (Civil), ইলেকট্রিক্যাল (Electrical), মেকানিক্যাল (Mechanical), ইলেকট্রনিক্স (Electronics), পাওয়ার (Power) সহ ১ম থেকে ৮ম পর্বের হক (Haque) ও টেকনিক্যাল (Technical) সহ সকল প্রকাশনীর বই পাওয়া যায়।',
  },
  {
    q: 'Illdoor কি বই কেনাবেচায় কোনো কমিশন বা চার্জ নেয়?',
    qEn: 'Is buying and selling free on Illdoor?',
    a: 'না, Illdoor সম্পূর্ণ বিনামূল্যে পলিটেকনিক শিক্ষার্থীদের একে অপরের সাথে যুক্ত করে। এখানে বিজ্ঞাপন দেওয়া, বই খোঁজা এবং সরাসরি ক্রেতা-বিক্রেতার মধ্যে যোগাযোগ ১০০% ফ্রি।',
  },
  {
    q: 'সম্পূর্ণ সেমিস্টার বুক বান্ডিল (Semester Bundle) কি পাওয়া যায়?',
    qEn: 'Can I buy or sell full semester book sets?',
    a: "হ্যাঁ! আমাদের 'Semester Bundles' সেকশনে গিয়ে আপনি আপনার সেমিস্টারের সম্পূর্ণ বইয়ের সেট একসাথেই খুঁজে পাবেন অথবা নিজের পূর্ববর্তী সেমিস্টারের বই সেট বান্ডিল হিসেবে বিক্রি করতে পারবেন।",
  },
];

const DEPARTMENTS = [
  { name: 'Computer Technology', bn: 'কম্পিউটার টেকনোলজি', icon: Cpu, slug: 'Computer' },
  { name: 'Civil Technology', bn: 'সিভিল টেকনোলজি', icon: Layers, slug: 'Civil' },
  { name: 'Electrical Technology', bn: 'ইলেকট্রিক্যাল টেকনোলজি', icon: Zap, slug: 'Electrical' },
  { name: 'Mechanical Technology', bn: 'মেকানিক্যাল টেকনোলজি', icon: Settings, slug: 'Mechanical' },
  { name: 'Electronics Technology', bn: 'ইলেকট্রনিক্স টেকনোলজি', icon: Radio, slug: 'Electronics' },
];

export const SEOHomeSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="space-y-6 pt-2">
      {/* 1. Main SEO Knowledge & Department Directory */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF6700] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Polytechnic Used Book Marketplace • BTEB PolyBooks</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0b0f1a] tracking-tight">
            পলিটেকনিক পুরাতন বই কেনাবেচার নির্ভরযোগ্য প্ল্যাটফর্ম (Illdoor)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
            <strong>Illdoor</strong> হলো বাংলাদেশের পলিটেকনিক ইনস্টিটিউট ও কারিগরি শিক্ষা বোর্ডের (BTEB) শিক্ষার্থীদের জন্য নিবেদিত ব্যবহৃত পাঠ্যবই কেনাবেচার মুক্ত প্ল্যাটফর্ম। আপনার ডিপ্লোমা ইঞ্জিনিয়ারিংয়ের পড়া শেষ হওয়া পুরাতন বই বিক্রয় করুন এবং পরবর্তী সেমিস্টারের বই সংগ্রহ করুন সবচেয়ে সুলভ মূল্যে।
          </p>
        </div>

        {/* Department Quick Filter Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#FF6700]" />
              <span>ডিপার্টমেন্ট অনুযায়ী বই খুঁজুন (Popular Departments)</span>
            </h3>
            <Link
              to="/books"
              className="text-xs font-bold text-[#FF6700] hover:underline"
            >
              সকল বই দেখুন →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              return (
                <Link
                  key={dept.slug}
                  to={`/books?department=${encodeURIComponent(dept.slug)}`}
                  className="p-3.5 rounded-2xl bg-[#fafafa] hover:bg-orange-50/60 border border-[#e5e5e5] hover:border-orange-300 transition-all group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center text-[#FF6700] group-hover:scale-105 transition-transform mb-2 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0b0f1a] leading-tight group-hover:text-[#FF6700] transition-colors">
                      {dept.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {dept.bn}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 3 Step Guide: How to Sell in BD */}
        <div className="mt-8 pt-6 border-t border-[#f0f0f0]">
          <h3 className="text-sm sm:text-base font-bold text-[#0b0f1a] mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#FF6700]" />
            <span>কীভাবে বই বিক্রি করবেন? (How to sell your books in BD)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FF6700] text-white flex items-center justify-center text-xs font-bold shrink-0">
                ১
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-900">ছবি ও তথ্য যুক্ত করুন</h5>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  বইয়ের পরিষ্কার ছবি তুলুন, ডিপার্টমেন্ট, সেমিস্টার ও বিষয় কোড উল্লেখ করুন।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FF6700] text-white flex items-center justify-center text-xs font-bold shrink-0">
                ২
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-900">পছন্দের মূল্য নির্ধারণ</h5>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  ন্যায্য দাম নির্ধারণ করুন যাতে জুনিয়র শিক্ষার্থীরা দ্রুত কিনে নিতে পারে।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-[#e5e5e5] flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FF6700] text-white flex items-center justify-center text-xs font-bold shrink-0">
                ৩
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-900">ক্যাম্পাসে হ্যান্ডওভার</h5>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  ক্যাম্পাসের পরিচিত জায়গায় দেখা করে বই দিন এবং সরাসরি মূল্য গ্রহণ করুন।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive FAQ Section (Matches Google FAQ Schema) */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6700] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (Frequently Asked Questions)</span>
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-[#0b0f1a] tracking-tight mt-1">
            Illdoor সম্পর্কে সাধারণ প্রশ্ন ও উত্তর
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#e5e5e5] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 bg-[#fafafa] hover:bg-orange-50/40 transition-colors cursor-pointer"
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0b0f1a]">
                      {faq.q}
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {faq.qEn}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#FF6700]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 sm:p-5 pt-0 bg-white border-t border-[#f0f0f0]">
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed pt-3 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{faq.a}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
