import React, { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayImages =
    images && images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'];

  const currentImage = displayImages[selectedIndex] || displayImages[0];

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-square bg-[#f5f2ee] rounded-2xl border border-[#e5e5e5] overflow-hidden flex items-center justify-center">
        <img
          src={currentImage}
          alt={`${title} - view ${selectedIndex + 1}`}
          className="w-full h-full object-cover sm:object-contain transition-all duration-300"
        />
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
          ছবি {selectedIndex + 1} / {displayImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {displayImages.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-[#ef4d23] ring-2 ring-[#ef4d23]/20'
                    : 'border-[#e5e5e5] hover:border-neutral-400 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
