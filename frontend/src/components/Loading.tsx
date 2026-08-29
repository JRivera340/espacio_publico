import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="relative">
        <div className="loading-spinner"></div>
        <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/10 animate-ping"></div>
      </div>
      <p className="mt-4 text-sm text-neutral-500 font-medium">Cargando...</p>
    </div>
  );
};
