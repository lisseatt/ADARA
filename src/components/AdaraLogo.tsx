import React from 'react';

interface AdaraLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'horizontal' | 'symbol';
  size?: number;
}

/**
 * Componente SVG oficial del Logo de "Adara Cosmética Natural"
 * Ilustración lineal continua (one-line art) de rostro con mariposa
 * y tipografía característica en dorado cálido (#D49A2A) y carbón (#231F1C).
 */
export const AdaraLogo: React.FC<AdaraLogoProps> = ({
  className = '',
  variant = 'horizontal',
  size = 40
}) => {
  // Símbolo lineal del rostro con la mariposa
  const LineArtIllustration = ({ strokeColor = '#1F1C18' }: { strokeColor?: string }) => (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Mariposa en la parte superior / frente */}
      {/* Ala izquierda */}
      <path
        d="M125 45 C122 35 128 22 140 20 C148 18 156 24 158 35 C160 42 155 52 145 55"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Nervaduras ala izquierda */}
      <path
        d="M135 32 C140 32 148 35 150 42"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Ala derecha / trasera */}
      <path
        d="M148 40 C154 30 165 28 172 32 C178 36 179 45 174 53 C168 59 158 60 152 56"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cuerpo y antenas mariposa */}
      <path
        d="M142 52 C145 50 148 49 151 51 C148 57 144 60 142 62"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M148 47 C149 42 153 39 157 39"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Trazo continuo del rostro de perfil */}
      {/* Frente, nariz, labio superior e inferior, barbilla */}
      <path
        d="M100 48 
           C112 42 124 50 128 62 
           C130 67 138 72 142 75 
           C135 78 126 80 122 86 
           C120 92 128 98 136 102 
           C144 107 146 112 140 115 
           C135 117 131 121 133 126 
           C137 133 146 138 144 145 
           C141 154 130 162 124 168 
           C112 178 95 186 82 172
           C68 156 60 130 65 105
           C70 78 88 56 108 52
           C118 50 128 58 134 68"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Ojo suave cerrado y ceja */}
      <path
        d="M106 72 C113 70 121 73 125 78"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M112 80 C116 83 122 84 126 81"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Trazo curvo envolvente característico del rostro botánico */}
      <path
        d="M65 105 
           C60 135 78 165 98 190 
           C115 210 118 230 102 245 
           C90 256 75 240 85 220"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'symbol') {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
        <LineArtIllustration strokeColor="#231F1C" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div 
          className="rounded-full bg-[#FAF5EC] border border-[#ECD9BA] flex items-center justify-center p-1.5 shadow-2xs shrink-0 overflow-hidden"
          style={{ width: size, height: size }}
        >
          <LineArtIllustration strokeColor="#231F1C" />
        </div>
        <div>
          <span className="block font-serif tracking-[0.25em] font-semibold text-[#D49A2A] text-base leading-none">
            ADARA
          </span>
          <span className="block text-[8px] font-sans tracking-[0.25em] text-[#231F1C] uppercase font-medium mt-0.5">
            Cosmética Natural
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div 
          className="relative overflow-hidden mb-2"
          style={{ width: size * 1.6, height: size * 1.9 }}
        >
          <LineArtIllustration strokeColor="#231F1C" />
        </div>
        <div className="space-y-0.5">
          <span className="block font-serif tracking-[0.3em] font-medium text-[#D49A2A] text-2xl md:text-3xl leading-none">
            ADARA
          </span>
          <span className="block text-[10px] md:text-xs font-sans tracking-[0.35em] text-[#231F1C] uppercase font-semibold">
            COSMETICA NATURAL
          </span>
        </div>
      </div>
    );
  }

  // Variant 'horizontal' (ideal para cabecera superior y tickets)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative shrink-0 overflow-hidden flex items-center justify-center"
        style={{ width: size * 0.9, height: size * 1.1 }}
      >
        <LineArtIllustration strokeColor="#231F1C" />
      </div>
      <div className="flex flex-col justify-center">
        <span className="font-serif tracking-[0.28em] font-semibold text-[#D49A2A] text-lg sm:text-xl leading-none">
          ADARA
        </span>
        <span className="text-[9px] font-sans tracking-[0.32em] text-[#231F1C] uppercase font-semibold mt-1">
          COSMETICA NATURAL
        </span>
      </div>
    </div>
  );
};
