import React from 'react';

interface AdaraLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'horizontal' | 'symbol';
  size?: number;
}

/**
 * Componente estilizado del Logo de "ADARA COSMÉTICA NATURAL"
 * Contiene únicamente la tipografía estilizada oficial en dorado (#D49A2A) y carbón (#1A1612),
 * sin dibujos ni ilustraciones adjuntas.
 */
export const AdaraLogo: React.FC<AdaraLogoProps> = ({
  className = '',
  variant = 'horizontal'
}) => {
  if (variant === 'symbol') {
    return (
      <span className={`font-serif tracking-[0.2em] font-extrabold text-[#D49A2A] text-lg select-none ${className}`}>
        ADARA
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col select-none ${className}`}>
        <span className="font-serif tracking-[0.25em] font-extrabold text-[#D49A2A] text-lg leading-tight">
          ADARA
        </span>
        <span className="text-[10px] font-sans tracking-[0.25em] text-[#1A1612] uppercase font-bold">
          Cosmética Natural
        </span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <span className="font-serif tracking-[0.3em] font-extrabold text-[#D49A2A] text-3xl sm:text-4xl leading-none">
          ADARA
        </span>
        <span className="mt-1.5 text-base sm:text-lg font-sans tracking-[0.25em] text-[#1A1612] uppercase font-bold">
          COSMÉTICA NATURAL
        </span>
      </div>
    );
  }

  // Variant 'horizontal' (predeterminado para cabecera superior y barra de navegación)
  return (
    <div className={`flex flex-col justify-center select-none ${className}`}>
      <span className="font-serif tracking-[0.25em] font-extrabold text-[#D49A2A] text-2xl sm:text-3xl leading-none">
        ADARA
      </span>
      <span className="mt-1 text-xs sm:text-sm font-sans tracking-[0.25em] text-[#1A1612] uppercase font-bold">
        COSMÉTICA NATURAL
      </span>
    </div>
  );
};

