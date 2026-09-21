import React from 'react';

interface PriceDisplayProps {
  sellingPrice: number;
  originalPrice?: number;
  savings?: number;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'stacked' | 'horizontal';
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  sellingPrice,
  originalPrice,
  savings,
  size = 'md',
  layout = 'stacked',
}) => {
  const calculatedSavings = savings !== undefined ? savings : (originalPrice ? originalPrice - sellingPrice : 0);

  const priceSizes = {
    sm: 'text-base font-bold text-[#0b0f1a]',
    md: 'text-lg font-bold text-[#0b0f1a]',
    lg: 'text-2xl sm:text-3xl font-bold text-[#0b0f1a]',
  };

  const origSizes = {
    sm: 'text-xs text-neutral-400 line-through',
    md: 'text-sm text-neutral-400 line-through',
    lg: 'text-base text-neutral-400 line-through',
  };

  const savingsSizes = {
    sm: 'text-[11px] font-semibold text-[#ef4d23]',
    md: 'text-xs font-semibold text-[#ef4d23]',
    lg: 'text-sm font-semibold text-[#ef4d23] bg-[#ef4d23]/10 px-2.5 py-0.5 rounded-full inline-block',
  };

  if (layout === 'horizontal') {
    return (
      <div className="flex items-baseline flex-wrap gap-2">
        <span className={priceSizes[size]}>৳{sellingPrice}</span>
        {originalPrice && originalPrice > sellingPrice && (
          <span className={origSizes[size]}>৳{originalPrice}</span>
        )}
        {calculatedSavings > 0 && (
          <span className={savingsSizes[size]}>সাশ্রয় ৳{calculatedSavings}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        <span className={priceSizes[size]}>৳{sellingPrice}</span>
        {originalPrice && originalPrice > sellingPrice && (
          <span className={origSizes[size]}>৳{originalPrice}</span>
        )}
      </div>
      {calculatedSavings > 0 && (
        <p className={savingsSizes[size]}>সাশ্রয় ৳{calculatedSavings}</p>
      )}
    </div>
  );
};
