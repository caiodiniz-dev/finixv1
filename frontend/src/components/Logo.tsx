import React from 'react';
import { TrendingUp } from 'lucide-react';

interface Props { size?: number; showText?: boolean; className?: string }

export const Logo: React.FC<Props> = ({ size = 36, showText = true, className = '' }) => (
  <div className={`flex items-center gap-2.5 ${className}`} data-testid="finix-logo">
    <div
      className="relative rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 60%, #22C55E 100%)',
        boxShadow: '0 6px 20px -6px rgba(37, 99, 235, 0.55)',
      }}
    >
      <span
        className="text-white font-extrabold leading-none"
        style={{ fontSize: size * 0.55, fontFamily: 'Poppins, Inter, sans-serif' }}
      >F</span>
      <TrendingUp
        className="absolute text-[#86EFAC]"
        style={{ right: -4, bottom: -4, width: size * 0.5, height: size * 0.5 }}
        strokeWidth={3}
      />
    </div>
    {showText && (
      <div className="flex flex-col leading-none">
        <span className="font-display font-extrabold text-[1.25rem] tracking-tight">
          <span className="text-brand-dark dark:text-white">FINI</span>
          <span className="bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">X</span>
        </span>
      </div>
    )}
  </div>
);
