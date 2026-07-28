import React from 'react';
import { Star } from 'lucide-react';

interface RatingDisplayProps {
  rating: number;
  totalReviews?: number;
  showNumber?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  totalReviews,
  showNumber = true,
  size = 'md',
  className = '',
}) => {
  const starSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      {showNumber && (
        <span className={`${textSize} font-medium text-gray-700`}>
          {rating.toFixed(1)}
        </span>
      )}

      {totalReviews !== undefined && totalReviews > 0 && (
        <span className={`${textSize} text-gray-500`}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
};

export default RatingDisplay;
