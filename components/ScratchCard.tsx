import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchCardProps {
  accountNumber: string;
  onComplete: () => void;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ accountNumber, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const isScratching = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      ctx.fillStyle = '#1E293B'; // slate-800
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-out';
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => {
        window.removeEventListener('resize', initCanvas);
    }
  }, [initCanvas]);

  const getScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }
    return (transparentPixels / (canvas.width * canvas.height)) * 100;
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2, true);
      ctx.fill();
      
      if (!isRevealed && getScratchPercentage() > 50) {
        setIsRevealed(true);
      }
    }
  };

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isScratching.current = true;
    const coords = getEventCoords(e);
    if (coords) scratch(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isScratching.current) return;
    const coords = getEventCoords(e);
    if (coords) scratch(coords.x, coords.y);
  };

  const handleMouseUp = () => {
    isScratching.current = false;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto animate-fade-in p-4">
      <h1 className="text-4xl font-bold text-slate-100 mb-2">Your Account Number</h1>
      <p className="text-slate-400 mb-8 text-center">Scratch the card below to reveal your unique 4-digit ID.</p>
      
      <div className="relative w-full aspect-video rounded-2xl shadow-2xl bg-slate-900 border-2 border-purple-500/80 flex items-center justify-center select-none p-2">
        <div className="absolute inset-2 flex items-center justify-center">
          <span className="text-7xl font-bold tracking-[0.2em] text-white">{accountNumber}</span>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] m-auto rounded-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />
      </div>

      <p className="text-sm text-slate-500 mt-8 text-center">Remember this 4-digit number - it's your unique account ID.</p>
      
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={onComplete}
          disabled={!isRevealed}
          className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-0 disabled:pointer-events-none enabled:opacity-100 hover:from-purple-500 hover:to-indigo-500 transition-all duration-500 shadow-lg shadow-purple-500/20"
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ScratchCard;