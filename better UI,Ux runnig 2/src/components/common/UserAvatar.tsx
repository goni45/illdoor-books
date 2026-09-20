import React from 'react';
import { Check } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  avatarUrl?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  avatarUrl,
  name,
  size = 'md',
  isVerified = false,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const effectiveSrc = src || avatarUrl;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const badgeSizeClasses = {
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-0.5',
    md: 'w-4 h-4 -bottom-0.5 -right-0.5 p-0.5',
    lg: 'w-5 h-5 bottom-0 right-0 p-1',
    xl: 'w-6 h-6 bottom-0 right-0 p-1',
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-neutral-200 text-neutral-700 flex items-center justify-center font-semibold border border-white shadow-xs`}
      >
        {effectiveSrc && !imgError ? (
          <img
            src={effectiveSrc}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {isVerified && (
        <span
          title="Verified Polytechnic Student"
          className={`absolute ${badgeSizeClasses[size]} bg-[#ef4d23] text-white rounded-full flex items-center justify-center shadow-xs border-2 border-white`}
        >
          <Check className="w-full h-full stroke-[3]" />
        </span>
      )}
    </div>
  );
};
