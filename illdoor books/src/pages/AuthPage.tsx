import React, { useState, useEffect } from 'react';
import { IlldoorLogo } from '../components/common/IlldoorLogo';
import { useAuth } from '../context/AuthContext';
import type { SignUpData } from '../hooks/useAuth';
import {
  User, Mail, Lock, Phone, BookOpen, GraduationCap,
  Building2, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight, X, Calendar, MessageCircle
} from 'lucide-react';

const INSTITUTES = [
  'Mymensingh Polytechnic Institute',
  'Dhaka Polytechnic Institute',
  'Chittagong Polytechnic Institute',
  'Rajshahi Polytechnic Institute',
  'Khulna Polytechnic Institute',
  'Sylhet Polytechnic Institute',
  'Barisal Polytechnic Institute',
  'Comilla Polytechnic Institute',
  'Rangpur Polytechnic Institute',
  'Jessore Polytechnic Institute',
];

const DEPARTMENTS = [
  'Electronics Technology',
  'Computer Science & Technology',
  'Electrical Technology',
  'Civil Technology',
  'Mechanical Technology',
  'Telecommunication Technology',
  'Architecture Technology',
  'Power Technology',
  'Automobile Technology',
  'Refrigeration & Air Conditioning Technology',
];

const SEMESTERS = [
  '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
  '5th Semester', '6th Semester', '7th Semester', '8th Semester',
];

const SESSIONS = [
  '20-21',
  '21-22',
  '22-23',
  '23-24',
  '24-25',
  '25-26',
  '26-27',
  '27-28',
  '28-29',
  '29-30',
  '30-31',
  '31-32',
  '32-33',
  '33-34',
  '34-35',
  '35-36',
  '36-37',
  '37-38',
  '38-39',
  '39-40',
  '40-41',
];

type TabType = 'login' | 'register' | 'forgot';

interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  rightElement?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  icon, label, id, type = 'text', value, onChange,
  placeholder, required, autoComplete, rightElement,
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-[#1a1f2e]">{label}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] w-4 h-4">{icon}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#1a1f2e] text-sm
          focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/40 focus:border-[#ef4d23]
          placeholder:text-[#9ca3af] transition-all duration-200"
      />
      {rightElement && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</span>
      )}
    </div>
  </div>
);

interface SelectFieldProps {
  icon: React.ReactNode;
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({ icon, label, id, value, onChange, options, required }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-[#1a1f2e]">{label}</label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] w-4 h-4 pointer-events-none">{icon}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#1a1f2e] text-sm
          focus:outline-none focus:ring-2 focus:ring-[#ef4d23]/40 focus:border-[#ef4d23]
          appearance-none cursor-pointer transition-all duration-200"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  </div>
);

export interface AuthPageProps {
  isModal?: boolean;
  onClose?: () => void;
  initialTab?: TabType;
  message?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  isModal = false,
  onClose,
  initialTab = 'login',
  message,
}) => {
  const { signIn, signUp, resetPassword, loading, error: authError } = useAuth();
  const [tab, setTab] = useState<TabType>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regData, setRegData] = useState<SignUpData>({
    email: '', password: '', fullName: '', studentRoll: '',
    institute: INSTITUTES[0], // 'Mymensingh Polytechnic Institute'
    department: DEPARTMENTS[0], // 'Electronics Technology'
    semester: SEMESTERS[0],
    session: SESSIONS[0],
    phone: '',
    whatsappPhone: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('');

  const displayError = localError || authError;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);
    if (!loginEmail || !loginPassword) {
      setLocalError('ইমেইল এবং পাসওয়ার্ড প্রদান আবশ্যক।');
      return;
    }
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      setLocalError(error);
    } else {
      if (onClose) onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);
    if (regData.password !== confirmPassword) {
      setLocalError('পাসওয়ার্ড দুটি মেলেনি।');
      return;
    }
    if (regData.password.length < 6) {
      setLocalError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (!regData.studentRoll.trim()) {
      setLocalError('শিক্ষার্থী রোল নম্বর আবশ্যক।');
      return;
    }
    const phoneClean = (regData.phone || '').trim();
    const whatsappClean = (regData.whatsappPhone || '').trim();
    if (!phoneClean) {
      setLocalError('মোবাইল নম্বর প্রদান করা আবশ্যক।');
      return;
    }
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(phoneClean.replace(/[\s-]/g, ''))) {
      setLocalError('সঠিক বাংলাদেশী মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।');
      return;
    }
    if (!whatsappClean) {
      setLocalError('হোয়াটসঅ্যাপ (WhatsApp) নম্বর প্রদান করা আবশ্যক।');
      return;
    }
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(whatsappClean.replace(/[\s-]/g, ''))) {
      setLocalError('সঠিক বাংলাদেশী হোয়াটসঅ্যাপ নম্বর লিখুন (যেমন: 017XXXXXXXX)।');
      return;
    }
    const { error } = await signUp(regData);
    if (!error) {
      setSuccess('নিবন্ধন সফল হয়েছে! অ্যাকাউন্ট নিশ্চিত করতে আপনার ইমেইল চেক করুন, এরপর লগইন করুন।');
      setTab('login');
    } else {
      setLocalError(error);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);
    const { error } = await resetPassword(forgotEmail);
    if (!error) {
      setSuccess('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! আপনার ইমেইল ইনবক্স চেক করুন।');
    } else {
      setLocalError(error);
    }
  };

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 select-none'
          : 'min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#fff4f0] via-[#fef6ef] to-[#fff9f0] px-4 py-10'
      }
    >
      {/* Modal backdrop click */}
      {isModal && <div className="fixed inset-0" onClick={onClose} />}

      {/* Background decorations (full page mode only) */}
      {!isModal && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#ef4d23]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ff7a45]/8 rounded-full blur-3xl" />
        </div>
      )}

      {/* Card */}
      <div className={`relative w-full max-w-md ${isModal ? 'z-10 my-auto' : ''}`}>
        {/* Modal Close Button */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-neutral-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer border border-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <IlldoorLogo height={isModal ? 34 : 40} />
          <p className="mt-2 text-xs sm:text-sm text-white text-center">
            পলিটেকনিক বই কেনাবেচার ক্যাম্পাস মার্কেটপ্লেস
          </p>
        </div>

        {/* Prompt message banner if triggered by an action like Buy Now or Sell */}
        {message && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 mb-3.5 bg-gradient-to-r from-[#ef4d23]/10 to-[#ff7a45]/10 border border-[#ef4d23]/30 rounded-2xl text-xs sm:text-sm text-neutral-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ef4d23] shrink-0 animate-pulse" />
            <span>{message}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-[#ef4d23]/8 border border-[#f3e8e4] overflow-hidden">
          {/* Tab switcher */}
          {tab !== 'forgot' && (
            <div className="flex border-b border-[#f3e8e4]">
              {(['login', 'register'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setLocalError(null); setSuccess(null); }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
                    tab === t
                      ? 'text-[#ef4d23] border-b-2 border-[#ef4d23] bg-[#fff4f0]'
                      : 'text-[#6b7280] hover:text-[#1a1f2e]'
                  }`}
                >
                  {t === 'login' ? 'লগইন করুন' : 'নতুন অ্যাকাউন্ট'}
                </button>
              ))}
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Alerts */}
            {displayError && (
              <div className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 p-3.5 mb-5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <InputField
                  icon={<Mail className="w-4 h-4" />}
                  label="ইমেইল"
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={setLoginEmail}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
                <InputField
                  icon={<Lock className="w-4 h-4" />}
                  label="পাসওয়ার্ড"
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  rightElement={
                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                      className="text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="flex justify-end">
                  <button type="button" onClick={() => { setTab('forgot'); setLocalError(null); }}
                    className="text-xs text-[#ef4d23] hover:underline font-medium">
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
                    bg-gradient-to-r from-[#ef4d23] to-[#ff7a45] text-white font-semibold text-sm
                    hover:shadow-lg hover:shadow-[#ef4d23]/30 active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                </button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <InputField
                  icon={<User className="w-4 h-4" />}
                  label="পূর্ণ নাম"
                  id="reg-name"
                  value={regData.fullName}
                  onChange={(v) => setRegData((p) => ({ ...p, fullName: v }))}
                  placeholder="Moyeen MD. Goni Gangi"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    icon={<BookOpen className="w-4 h-4" />}
                    label="রোল / স্টুডেন্ট ID *"
                    id="reg-roll"
                    value={regData.studentRoll}
                    onChange={(v) => setRegData((p) => ({ ...p, studentRoll: v }))}
                    placeholder="Enter your roll"
                    required
                  />
                  <InputField
                    icon={<Phone className="w-4 h-4" />}
                    label="মোবাইল নম্বর *"
                    id="reg-phone"
                    type="tel"
                    value={regData.phone || ''}
                    onChange={(v) => {
                      setRegData((p) => ({
                        ...p,
                        phone: v,
                        // If WhatsApp was empty or matching previous phone, keep sync easy
                        whatsappPhone: (!p.whatsappPhone || p.whatsappPhone === p.phone) ? v : p.whatsappPhone,
                      }));
                    }}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <InputField
                    icon={<MessageCircle className="w-4 h-4 text-emerald-600" />}
                    label="হোয়াটসঅ্যাপ (WhatsApp) নম্বর *"
                    id="reg-whatsapp"
                    type="tel"
                    value={regData.whatsappPhone || ''}
                    onChange={(v) => setRegData((p) => ({ ...p, whatsappPhone: v }))}
                    placeholder="01XXXXXXXXX"
                    required
                    rightElement={
                      regData.phone && regData.whatsappPhone !== regData.phone ? (
                        <button
                          type="button"
                          onClick={() => setRegData((p) => ({ ...p, whatsappPhone: p.phone }))}
                          className="text-[11px] font-semibold text-[#ef4d23] hover:underline cursor-pointer bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200"
                        >
                          মোবাইল নম্বরই WhatsApp
                        </button>
                      ) : undefined
                    }
                  />
                  <p className="text-[11px] text-neutral-500">
                    বই কেনাবেচা বা রিকোয়েস্টে সহপাঠী শিক্ষার্থীরা এই নম্বরে সরাসরি চ্যাট করবেন।
                  </p>
                </div>

                <SelectField
                  icon={<Building2 className="w-4 h-4" />}
                  label="ইনস্টিটিউট"
                  id="reg-institute"
                  value={regData.institute}
                  onChange={(v) => setRegData((p) => ({ ...p, institute: v }))}
                  options={INSTITUTES}
                  required
                />

                <SelectField
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="ডিপার্টমেন্ট"
                  id="reg-dept"
                  value={regData.department}
                  onChange={(v) => setRegData((p) => ({ ...p, department: v }))}
                  options={DEPARTMENTS}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    icon={<BookOpen className="w-4 h-4" />}
                    label="সেমিস্টার"
                    id="reg-sem"
                    value={regData.semester}
                    onChange={(v) => setRegData((p) => ({ ...p, semester: v }))}
                    options={SEMESTERS}
                    required
                  />
                  <SelectField
                    icon={<Calendar className="w-4 h-4" />}
                    label="সেশন"
                    id="reg-session"
                    value={regData.session || SESSIONS[0]}
                    onChange={(v) => setRegData((p) => ({ ...p, session: v }))}
                    options={SESSIONS}
                    required
                  />
                </div>

                <InputField
                  icon={<Mail className="w-4 h-4" />}
                  label="ইমেইল"
                  id="reg-email"
                  type="email"
                  value={regData.email}
                  onChange={(v) => setRegData((p) => ({ ...p, email: v }))}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    icon={<Lock className="w-4 h-4" />}
                    label="পাসওয়ার্ড"
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={regData.password}
                    onChange={(v) => setRegData((p) => ({ ...p, password: v }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    rightElement={
                      <button type="button" onClick={() => setShowPassword((p) => !p)}
                        className="text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <InputField
                    icon={<Lock className="w-4 h-4" />}
                    label="নিশ্চিত করুন"
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <p className="text-xs text-[#9ca3af]">
                  রেজিস্ট্রেশন করলে আপনি আমাদের{' '}
                  <span className="text-[#ef4d23] cursor-pointer hover:underline">সেবার শর্তাবলী</span>{' '}
                  এবং{' '}
                  <span className="text-[#ef4d23] cursor-pointer hover:underline">গোপনীয়তা নীতি</span>{' '}
                  মেনে নিচ্ছেন।
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
                    bg-gradient-to-r from-[#ef4d23] to-[#ff7a45] text-white font-semibold text-sm
                    hover:shadow-lg hover:shadow-[#ef4d23]/30 active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-[#1a1f2e]">পাসওয়ার্ড রিসেট</h2>
                  <p className="text-sm text-[#6b7280] mt-1">
                    আপনার ইমেইল দিন, রিসেট লিংক পাঠানো হবে।
                  </p>
                </div>

                <InputField
                  icon={<Mail className="w-4 h-4" />}
                  label="ইমেইল"
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  placeholder="your@email.com"
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
                    bg-gradient-to-r from-[#ef4d23] to-[#ff7a45] text-white font-semibold text-sm
                    hover:shadow-lg hover:shadow-[#ef4d23]/30 active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
                </button>

                <button
                  type="button"
                  onClick={() => { setTab('login'); setLocalError(null); setSuccess(null); }}
                  className="text-sm text-[#6b7280] hover:text-[#ef4d23] transition-colors text-center"
                >
                  ← লগইন পেজে ফিরে যান
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#9ca3af] mt-6">
          ইলডোর — ক্যাম্পাস বই বিনিময় প্ল্যাটফর্ম · পলিটেকনিক শিক্ষার্থীদের জন্য প্রস্তুত
        </p>
      </div>
    </div>
  );
};
