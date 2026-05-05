import React from 'react';

export const AdrinixLogo = ({ size = 40, className = "" }: { size?: number, className?: string }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Adrinix Logo" 
      width={size} 
      height={size} 
      className={className} 
      style={{ objectFit: 'contain' }}
    />
  );
};
