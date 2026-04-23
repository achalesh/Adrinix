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
        <linearGradient id="adrinix-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <filter id="adrinix-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Main 'A' Structure */}
      <path 
        d="M50 15L85 85H65L50 50L35 85H15L50 15Z" 
        fill="url(#adrinix-grad)"
        filter="url(#adrinix-glow)"
      />
      
      {/* Swoosh/Curve */}
      <path 
        d="M25 70C45 60 65 65 85 45" 
        stroke="white" 
        strokeWidth="6" 
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Dynamic Dots/Accent */}
      <circle cx="85" cy="45" r="4" fill="white" />
      <circle cx="80" cy="35" r="2" fill="white" opacity="0.6" />
    </svg>
  );
};
