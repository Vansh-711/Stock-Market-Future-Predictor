import React, { useState } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { InteractiveHoverButton } from './interactive-hover-button';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isClearing: boolean;
}

export function ResetDataModal({ isOpen, onClose, onConfirm, isClearing }: ResetDataModalProps) {
  const [safetyLevel, setSafetyLevel] = useState('1'); // 1=Locked, 2=Armed, 3=Purge

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative bg-surface border border-border shadow-modal rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row animate-fade">
        {/* Left Side: The Wheel */}
        <div className="bg-[#111] p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#333] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,62,62,0.1)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="wheel-selector mb-4">
            <div className="hint-pop">DIAL TO UNLOCK</div>
            <div className="radio-input">
              <label htmlFor="value-2" className="next-trigger" id="trigger-for-1" />
              <label htmlFor="value-3" className="next-trigger" id="trigger-for-2" />
              <label htmlFor="value-1" className="next-trigger" id="trigger-for-3" />
              <div className="glass-overlay" />
              
              <input value="1" name="value-radio" id="value-1" type="radio" checked={safetyLevel === '1'} onChange={(e) => setSafetyLevel(e.target.value)} />
              <label className="wheel-label" htmlFor="value-1" style={{ '--angle': '-30deg' } as any}>
                <span className="num">01</span>
                <span className="label">LOCKED</span>
              </label>
              
              <input value="2" name="value-radio" id="value-2" type="radio" checked={safetyLevel === '2'} onChange={(e) => setSafetyLevel(e.target.value)} />
              <label className="wheel-label" htmlFor="value-2" style={{ '--angle': '0deg' } as any}>
                <span className="num">02</span>
                <span className="label">ARMED</span>
              </label>
              
              <input value="3" name="value-radio" id="value-3" type="radio" checked={safetyLevel === '3'} onChange={(e) => setSafetyLevel(e.target.value)} />
              <label className="wheel-label" htmlFor="value-3" style={{ '--angle': '30deg' } as any}>
                <span className="num">03</span>
                <span className="label">PURGE</span>
              </label>
            </div>
          </div>
          
          <div className="flex gap-2 items-center mt-2">
            <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${safetyLevel === '1' ? 'bg-positive shadow-[0_0_10px_var(--positive)]' : 'bg-[#333]'}`} />
            <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${safetyLevel === '2' ? 'bg-warning shadow-[0_0_10px_var(--warning)]' : 'bg-[#333]'}`} />
            <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${safetyLevel === '3' ? 'bg-negative shadow-[0_0_10px_var(--negative)]' : 'bg-[#333]'}`} />
          </div>
        </div>

        {/* Right Side: Text & Actions */}
        <div className="p-8 flex-1 flex flex-col justify-center bg-surface-raised relative z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-negative/20 p-2 rounded-xl text-negative">
              <TriangleAlert className="w-6 h-6" />
            </div>
            <h2 className="text-h3 text-text-primary">Destructive Action</h2>
          </div>
          
          <p className="text-body text-text-secondary mb-6">
            You are about to permanently delete <strong>all</strong> uploaded datasets, 
            backtest patterns, trained models, and generated hypotheses. 
            This action cannot be undone.
          </p>

          <div className="mt-auto pt-6 border-t border-border">
            <p className="text-small-medium text-text-muted mb-4 uppercase tracking-widest text-xs">
              {safetyLevel === '1' && 'System safely locked. Dial to unlock.'}
              {safetyLevel === '2' && 'System armed. Proceed with caution.'}
              {safetyLevel === '3' && 'Safety disabled. Purge authorized.'}
            </p>
            
            <button
              onClick={onConfirm}
              disabled={safetyLevel !== '3' || isClearing}
              className={`w-full py-3 px-6 rounded-xl font-bold tracking-wide transition-all duration-500 overflow-hidden relative group
                ${safetyLevel === '3' 
                  ? 'bg-negative text-white shadow-[0_0_30px_rgba(255,62,62,0.4)] hover:shadow-[0_0_40px_rgba(255,62,62,0.6)] hover:-translate-y-1' 
                  : 'bg-surface border border-border text-text-muted cursor-not-allowed opacity-50'
                }
              `}
            >
              {safetyLevel === '3' && (
                <div className="absolute inset-0 bg-white/20 w-full translate-x-[-150%] skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              )}
              {isClearing ? 'PURGING...' : 'INITIATE PURGE'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .wheel-selector {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .hint-pop {
          position: absolute;
          top: -40px;
          font-family: "JetBrains Mono", monospace;
          font-weight: 800;
          font-size: 0.6rem;
          letter-spacing: 2px;
          color: #888;
          text-transform: uppercase;
          animation: pulseHint 2s infinite ease-in-out;
          pointer-events: none;
        }

        @keyframes pulseHint {
          0%, 100% { opacity: 0.8; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }

        .radio-input {
          position: relative;
          height: 240px;
          width: 200px;
          background: #111;
          border: 2px solid #333;
          border-radius: 30px;
          overflow: hidden;
          display: flex;
          align-items: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8);
        }

        .radio-input::after {
          content: "";
          position: absolute;
          right: -150px;
          width: 300px;
          height: 300px;
          background: repeating-conic-gradient(from 0deg, #222 0deg 10deg, #252525 10deg 20deg);
          border-radius: 50%;
          z-index: 1;
          opacity: 0.5;
        }
        
        .radio-input::before {
          content: "";
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: var(--negative);
          border-radius: 50%;
          z-index: 30;
          box-shadow: 0 0 15px var(--negative), 0 0 30px var(--negative);
          pointer-events: none;
          transition: background 0.3s, box-shadow 0.3s;
        }

        .radio-input:has(#value-1:checked)::before {
          background: var(--positive);
          box-shadow: 0 0 15px var(--positive), 0 0 30px var(--positive);
        }
        .radio-input:has(#value-2:checked)::before {
          background: var(--warning);
          box-shadow: 0 0 15px var(--warning), 0 0 30px var(--warning);
        }

        .radio-input input {
          display: none;
        }

        .glass-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.2) 100%);
          z-index: 25;
          pointer-events: none;
        }

        .wheel-label {
          position: absolute;
          left: 40px;
          display: flex;
          flex-direction: column;
          transition: all 0.7s cubic-bezier(0.19, 1, 0.22, 1);
          transform-origin: 280px center;
          transform: rotate(var(--angle));
          filter: blur(2px);
          opacity: 0.1;
          z-index: 5;
        }

        .wheel-label .num {
          font-family: "JetBrains Mono", monospace;
          font-weight: 900;
          font-size: 0.7rem;
          color: #ff3e3e;
          margin-bottom: -5px;
          transition: color 0.3s;
        }
        
        .radio-input:has(#value-1:checked) .wheel-label[for="value-1"] .num { color: var(--positive); }
        .radio-input:has(#value-2:checked) .wheel-label[for="value-2"] .num { color: var(--warning); }
        .radio-input:has(#value-3:checked) .wheel-label[for="value-3"] .num { color: var(--negative); }

        .wheel-label .label {
          font-family: "Inter", sans-serif;
          font-weight: 900;
          font-size: 2.2rem;
          color: #fff;
          letter-spacing: -1px;
          text-transform: uppercase;
        }

        .radio-input:has(#value-1:checked) .wheel-label { transform: rotate(calc(var(--angle) + 30deg)); }
        .radio-input:has(#value-2:checked) .wheel-label { transform: rotate(calc(var(--angle) + 0deg)); }
        .radio-input:has(#value-3:checked) .wheel-label { transform: rotate(calc(var(--angle) - 30deg)); }

        .radio-input input:checked + .wheel-label {
          opacity: 1;
          filter: blur(0);
          transform: rotate(0deg) translateX(10px);
          z-index: 10;
        }

        .radio-input input:checked + .wheel-label .label {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        }

        .next-trigger {
          position: absolute;
          inset: 0;
          z-index: -1;
          cursor: pointer;
        }
        .radio-input:has(#value-1:checked) #trigger-for-1,
        .radio-input:has(#value-2:checked) #trigger-for-2,
        .radio-input:has(#value-3:checked) #trigger-for-3 {
          z-index: 100;
        }
      `}</style>
    </div>
  );
}
