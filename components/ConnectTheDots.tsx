import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ConnectTheDotsProps {
  onConnect: (classNum: number, section: string) => void;
  isEnabled: boolean;
}

// Only show grades 6 and above (classes 6-10)
const CLASSES = Array.from({ length: 5 }, (_, i) => i + 6);
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const ConnectTheDots: React.FC<ConnectTheDotsProps> = ({ onConnect, isEnabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number; classNum: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const resetState = useCallback(() => {
    setStartPos(null);
    setCurrentPos(null);
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      resetState();
    }
  }, [isEnabled, resetState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>, classNum: number) => {
    if (!isEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    setStartPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      classNum,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startPos) return;
    const containerRect = containerRef.current!.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });
  };

  const handleMouseUp = (section: string) => {
    if (startPos) {
      onConnect(startPos.classNum, section);
    }
    resetState();
  };
  
  const handleMouseLeaveAndUp = () => {
      resetState();
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full max-w-sm mx-auto p-4 relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseLeaveAndUp}
      onMouseLeave={handleMouseLeaveAndUp}
    >
      <div className="text-center mb-8 font-mono">
        <h1 className="text-4xl text-purple-400 tracking-widest uppercase">Select Your Class</h1>
        <p className="text-slate-400 text-lg mt-2">Click and drag from your class to your section.</p>
      </div>

      <div className="flex justify-between w-full">
        {/* Classes Column */}
        <div className="flex flex-col gap-3">
          {CLASSES.map((classNum) => (
            <button
              key={`class-${classNum}`}
              onMouseDown={(e) => handleMouseDown(e, classNum)}
              className="w-20 h-12 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-xl font-sans font-bold transition-all duration-200 hover:bg-purple-500 hover:border-purple-400 hover:scale-105 active:scale-95"
            >
              {classNum}
            </button>
          ))}
        </div>

        {/* Sections Column */}
        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <button
              key={`section-${section}`}
              onMouseUp={() => handleMouseUp(section)}
              className="w-20 h-12 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-xl font-sans font-bold transition-all duration-200 hover:bg-purple-500 hover:border-purple-400 hover:scale-105"
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {startPos && currentPos && (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <line
            x1={startPos.x}
            y1={startPos.y}
            x2={currentPos.x}
            y2={currentPos.y}
            stroke="url(#line-gradient)"
            strokeWidth="3"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
           <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#c084fc', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#818cf8', stopOpacity: 1}} />
              </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
};

export default ConnectTheDots;