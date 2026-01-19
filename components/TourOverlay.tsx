import React, { useEffect, useState, useRef } from 'react';
import { playSound } from '../utils/audio';

export interface TourStep {
  targetId?: string; // ID of the element to highlight. If undefined, shows centered modal.
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  onEnter?: () => void; // Action to perform when step starts (e.g. change tab)
}

interface TourOverlayProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void; // Called when skipping or closing early
  onComplete?: () => void; // Called when finishing the last step naturally
}

export const TourOverlay: React.FC<TourOverlayProps> = ({ steps, isOpen, onClose, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const currentStep = steps[currentStepIndex];
  const requestRef = useRef<number>(0);
  
  // Logic to handle step changes and initial positioning
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset rect when step changes to prevent ghosting of previous highlight
    setRect(null);

    // Execute side effect for the step (like switching tabs)
    if (currentStep.onEnter) {
        currentStep.onEnter();
    }

    // Function to continuously track element position
    const trackPosition = () => {
      if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        
        if (el && el.offsetParent !== null) {
          const newRect = el.getBoundingClientRect();
          
          // Only update state if rect has changed significantly to avoid excessive re-renders
          setRect(prev => {
            if (!prev) return newRect;
            if (
              Math.abs(prev.top - newRect.top) > 1 || 
              Math.abs(prev.left - newRect.left) > 1 ||
              Math.abs(prev.width - newRect.width) > 1 ||
              Math.abs(prev.height - newRect.height) > 1
            ) {
              return newRect;
            }
            return prev;
          });
        }
      } else {
        setRect(null); // Center mode
      }
      
      requestRef.current = requestAnimationFrame(trackPosition);
    };

    // Initial scroll (one-off)
    const initialScroll = setTimeout(() => {
        if (currentStep.targetId) {
            const el = document.getElementById(currentStep.targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
        }
    }, 100); 

    // Start tracking
    requestRef.current = requestAnimationFrame(trackPosition);
    
    return () => {
      cancelAnimationFrame(requestRef.current);
      clearTimeout(initialScroll);
    };
  }, [currentStepIndex, isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    playSound('click');
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Finished the tour
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
      setCurrentStepIndex(0);
    }
  };

  const handlePrev = () => {
    playSound('click');
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Styles for the highlighter box
  const highlightStyle: React.CSSProperties = rect ? {
    top: rect.top - 4,
    left: rect.left - 4,
    width: rect.width + 8,
    height: rect.height + 8,
    position: 'fixed',
    transition: 'top 0.1s, left 0.1s, width 0.1s, height 0.1s',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)', 
    zIndex: 55, 
    pointerEvents: 'none'
  } : {};

  // Styles for the tooltip
  const tooltipStyle: React.CSSProperties = rect ? {
    position: 'fixed',
    top: currentStep.position === 'top' ? rect.top - 10 : (rect.bottom + 10),
    left: rect.left + (rect.width / 2),
    transform: currentStep.position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    transition: 'top 0.1s, left 0.1s', 
    zIndex: 60
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 60
  };

  // Adjust for edges
  if (rect) {
      if (window.innerHeight - rect.bottom < 200) {
          tooltipStyle.top = rect.top - 10;
          tooltipStyle.transform = 'translate(-50%, -100%)';
      }
      if (rect.top < 200) {
          tooltipStyle.top = rect.bottom + 10;
          tooltipStyle.transform = 'translate(-50%, 0)';
      }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {!rect && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300"></div>
      )}
      
      {/* Highlighter */}
      {rect && (
        <div 
          className="rounded-lg ring-4 ring-jw-blue animate-pulse"
          style={highlightStyle}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className="bg-jw-card text-jw-text p-6 rounded-xl shadow-2xl border border-jw-blue max-w-sm w-[90vw] animate-fade-in"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-jw-blue">{currentStep.title}</h3>
            <span className="text-xs font-mono opacity-50 bg-black/20 px-2 py-1 rounded">
                {currentStepIndex + 1} / {steps.length}
            </span>
        </div>
        
        <p className="text-sm opacity-90 leading-relaxed mb-6">
            {currentStep.content}
        </p>

        <div className="flex justify-between items-center pt-2 border-t border-gray-700/30">
            <button 
                onClick={handlePrev} 
                disabled={currentStepIndex === 0}
                className="text-sm px-3 py-1 opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
            >
                Anterior
            </button>
            <div className="flex gap-2">
                <button 
                    onClick={onClose} 
                    className="text-sm px-3 py-1 opacity-60 hover:opacity-100 hover:text-red-400 transition-colors"
                >
                    Pular Tour
                </button>
                <button 
                    onClick={handleNext}
                    className="bg-jw-blue text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                >
                    {currentStepIndex === steps.length - 1 ? 'COMEÇAR!' : 'Avançar'}
                </button>
            </div>
        </div>
        
        {/* Arrow (Visual only) */}
        {rect && (
            <div 
                className={`absolute w-4 h-4 bg-jw-card border-l border-t border-jw-blue transform rotate-45 ${
                    (tooltipStyle.transform as string).includes('-100%') 
                    ? '-bottom-2 left-1/2 -ml-2 border-l-0 border-t-0 border-r border-b' 
                    : '-top-2 left-1/2 -ml-2' 
                }`}
            ></div>
        )}
      </div>
    </div>
  );
};