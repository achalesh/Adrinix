import React from 'react';

export const AdrinixLogo = ({ size = 40, className = "" }: { size?: number, className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M50 15L85 85H15L50 15Z" 
        fill="url(#logo-grad)" 
        fillOpacity="0.1"
      />
      <path 
        d="M50 25L75 75H25L50 25Z" 
        stroke="url(#logo-grad)" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        filter="url(#glow)"
      />
      <path 
        d="M40 55H60" 
        stroke="url(#logo-grad)" 
        strokeWidth="8" 
        strokeLinecap="round"
      />
    </svg>
  );
};
