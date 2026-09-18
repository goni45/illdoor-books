import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  BookOpen,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Condition } from '../types';
import {
  CONDITIONS,
  DEPARTMENTS,
  SEMESTERS,
} from '../data/mockData';
import { Button } from '../components/common/Button';

export const SellBookPage: React.FC = () => {
  const { addBookListing, navigateToBook, user, openAuthModal, setActiveView, pickupPoints } = useMarketplace();

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 max-w-lg mx-auto text-center space-y-4 my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0b0f1a]">বই বিক্রি করতে লগইন করুন</h2>
        <p className="text-sm text-neutral-500">
          আপনার পুরোনো বা অতিরিক্ত পাঠ্যবই বিক্রি করে অন্য পলিটেকনিক শিক্ষার্থীদের সাহায্য করুন এবং নগদ অর্থ উপার্জন করুন।
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => openAuthModal('login', 'বই বিক্রি করতে লগইন করুন')}>
            লগইন / রেজিস্টার করুন
          </Button>
          <Button variant="outline" onClick={() => setActiveView('browse')}>
            বই ব্রাউজ করুন
          </Button>
        </div>
      </div>
    );
  }

  // Multi-step form: 1 (Academic Details) -> 2 (Condition & Pricing) -> 3 (Images & Pickup Point)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [department, setDepartment] = useState('Computer Technology');
  const [semester, setSemester] = useState('6th Semester');
  const [condition, setCondition] = useState<Condition>('Good');
  const [conditionDetails, setConditionDetails] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>(650);
  const [sellingPrice, setSellingPrice] = useState<number | ''>(350);
  const [pickupPointId, setPickupPointId] = useState(pickupPoints[0]?.id || 'pk-1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState(
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
  );
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Preset covers students can choose easily
  const coverPresets = [
    {
      label: 'Engineering Tech',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Computer / Database',
      url: 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Civil / Architecture',
      url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Electrical / Circuits',
      url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Math / Physics',
      url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    },
  ];

  // Cleanup object URLs to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const calculatedSavings =
    typeof originalPrice === 'number' && typeof sellingPrice === 'number'
      ? Math.max(0, originalPrice - sellingPrice)
      : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    setSelectedImage((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customImageUrl.trim()) {
      if (selectedImage.startsWith('blob:')) URL.revokeObjectURL(selectedImage);
      setSelectedImage(customImageUrl.trim());
      setImageFile(null);
    }
  };

  const validateStep1 = () => {
    return title.trim().length > 2 && subjectCode.trim().length >= 4;
  };

  const validateStep2 = () => {
    return (
      typeof originalPrice === 'number' &&
      originalPrice > 0 &&
      typeof sellingPrice === 'number' &&
      sellingPrice > 0
    );
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    const chosenPickup = pickupPoints.find((p) => p.id === pickupPointId) ?? pickupPoints[0];

    const newId = await addBookListing(
      {
        title: title.trim(),
        author: author.trim() || 'Academic Faculty',
        edition: edition.trim() || 'Latest Edition',
        subjectCode: subjectCode.trim(),
        subjectName: subjectName.trim() || title.trim(),
        department,
        semester,
        condition,
        conditionDetails:
          conditionDetails.trim() ||
          'Standard condition. All core chapters present and readable.',
        originalPrice: Number(originalPrice),
        sellingPrice: Number(sellingPrice),
        images: [selectedImage],
        availability: 'Available',
        pickupPointId: chosenPickup?.id || 'pk-1',
        pickupPointName: chosenPickup?.name || 'Central Library Verification Desk',
      },
      imageFile ? [imageFile] : undefined
    );

    setSubmittedId(newId);
  };

  if (submittedId) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[#e5e5e5] p-8 sm:p-12 text-center shadow-xs space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#0b0f1a]">
          Your Book is Now Listed!
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
          "{title}" (BTEB Code: {subjectCode}) is live on the marketplace. You will
          receive a notification once a fellow student purchases the book and requests
          drop-off at the campus booth.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => setSubmittedId(null)}>
            List Another Book
          </Button>
          <Button variant="dark" onClick={() => navigateToBook(submittedId)}>
            View Your Listing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
        <div className="max-w-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ef4d23]">
            Sell Book Now
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b0f1a] tracking-tight mt-1">
            List Your Used Polytechnic Textbook
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Connect directly with juniors and classmates. Keep 100% of your earnings.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-[#e5e5e5]">
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
              currentStep === 1
                ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]'
                : currentStep > 1
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-[#f5f2ee] text-neutral-400 border-[#e5e5e5]'
            }`}
          >
            1. Book & Subject
          </div>
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
              currentStep === 2
                ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]'
                : currentStep > 2
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-[#f5f2ee] text-neutral-400 border-[#e5e5e5]'
            }`}
          >
            2. Condition & Price
          </div>
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
              currentStep === 3
                ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]'
                : 'bg-[#f5f2ee] text-neutral-400 border-[#e5e5e5]'
            }`}
          >
            3. Photo & Pickup
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] p-6 sm:p-8 shadow-xs">
        {/* STEP 1: Academic Details */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#ef4d23]" />
              <span>Step 1: Academic & Subject Information</span>
            </h3>

            {/* Book Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Book Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Microprocessor and Interfacing (BTEB Probidhan)"
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                required
              />
            </div>

            {/* Author & Edition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Sunil Mathur"
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Edition / Year
                </label>
                <input
                  type="text"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder="e.g. 5th Edition (2022)"
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                />
              </div>
            </div>

            {/* Subject Code & Subject Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center justify-between">
                  <span>BTEB Subject Code *</span>
                  <span className="text-[11px] text-[#ef4d23] font-mono">
                    5 digits e.g. 66661
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. 66661"
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm font-mono font-semibold text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Microprocessor and Interfacing"
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                />
              </div>
            </div>

            {/* Department & Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Department / Technology *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                >
                  {DEPARTMENTS.filter((d) => d !== 'All Departments').map(
                    (dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Semester *
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] cursor-pointer"
                >
                  {SEMESTERS.filter((s) => s !== 'All Semesters').map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="dark"
                disabled={!validateStep1()}
                onClick={() => setCurrentStep(2)}
              >
                <span>Continue to Condition & Price</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Condition & Pricing */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#ef4d23]" />
              <span>Step 2: Condition Rating & Pricing</span>
            </h3>

            {/* Condition Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Book Physical Condition *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CONDITIONS.filter((c) => c !== 'All Conditions').map((c) => {
                  const isSelected = condition === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(c as Condition)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0b0f1a] text-white border-[#0b0f1a] shadow-xs'
                          : 'bg-[#f5f2ee] text-neutral-700 border-[#e5e5e5] hover:bg-white'
                      }`}
                    >
                      <p className="font-bold text-xs sm:text-sm">{c}</p>
                      <span className="text-[10px] opacity-75 mt-0.5 block">
                        {c === 'Like New' && 'Pristine, no marks'}
                        {c === 'Good' && 'Minor highlights, clean'}
                        {c === 'Used' && 'Folded pages, intact'}
                        {c === 'Heavily Used' && 'Worn cover, readable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition Details Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Detailed Condition Notes
              </label>
              <textarea
                rows={3}
                value={conditionDetails}
                onChange={(e) => setConditionDetails(e.target.value)}
                placeholder="Mention any pencil notes, solved question highlights, or missing cover jackets..."
                className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl p-3 text-sm text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
              />
            </div>

            {/* Pricing: Original & Selling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Original Printed Price (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={10}
                    value={originalPrice}
                    onChange={(e) =>
                      setOriginalPrice(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                    placeholder="e.g. 650"
                    className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-[#0b0f1a] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Your Selling Price (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ef4d23] font-bold text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={10}
                    value={sellingPrice}
                    onChange={(e) =>
                      setSellingPrice(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                    placeholder="e.g. 350"
                    className="w-full bg-[#f5f2ee] border border-[#e5e5e5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-[#ef4d23] focus:outline-none focus:border-[#ef4d23] focus:bg-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Real-time Computed Savings preview */}
            <div className="p-4 rounded-2xl bg-[#f5f2ee] border border-[#e5e5e5] flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 font-medium">
                  Buyer's Discount Preview
                </span>
                <p className="text-xs text-neutral-600">
                  Student buyer pays <strong>৳{sellingPrice || 0}</strong> and saves{' '}
                  <strong className="text-[#ef4d23]">৳{calculatedSavings}</strong> compared to new.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#ef4d23]/10 text-[#ef4d23] font-bold text-xs">
                Save ৳{calculatedSavings}
              </span>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                variant="dark"
                disabled={!validateStep2()}
                onClick={() => setCurrentStep(3)}
              >
                <span>Continue to Photos & Pickup</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Photos & Pickup Point */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitListing} className="space-y-5 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-[#0b0f1a] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#ef4d23]" />
              <span>Step 3: Book Photos & Campus Pickup Point</span>
            </h3>

            {/* Book Image selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Book Cover Photo
              </label>

              {/* Preview Box */}
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#f5f2ee] p-4 rounded-2xl border border-[#e5e5e5]">
                <img
                  src={selectedImage}
                  alt="Listing preview"
                  className="w-24 h-28 object-cover rounded-xl border border-white shadow-xs"
                />
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold text-[#0b0f1a]">
                    Select a preset cover or upload your own book photo:
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {coverPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(p.url)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          selectedImage === p.url
                            ? 'bg-[#0b0f1a] text-white border-[#0b0f1a]'
                            : 'bg-white text-neutral-600 border-[#e5e5e5] hover:bg-neutral-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-3 justify-center sm:justify-start text-xs">
                    <label className="cursor-pointer text-[#ef4d23] font-semibold hover:underline flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Photo from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup Point Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ef4d23]" />
                <span>Preferred Campus Drop-off / Pickup Point *</span>
              </label>

              <div className="space-y-2">
                {pickupPoints.map((pt) => {
                  const isSelected = pickupPointId === pt.id;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => setPickupPointId(pt.id)}
                      className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#ef4d23] bg-[#ef4d23]/5 ring-1 ring-[#ef4d23]'
                          : 'border-[#e5e5e5] bg-white hover:bg-[#f5f2ee]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0b0f1a] text-sm">
                          {pt.name}
                        </span>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4d23]" />
                        )}
                      </div>
                      <p className="text-neutral-500 mt-1">{pt.locationDetail}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                        ⏰ {pt.operatingHours} • Contact: {pt.contactPerson}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
              >
                <span>Publish Listing (৳{sellingPrice})</span>
                <CheckCircle2 className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
