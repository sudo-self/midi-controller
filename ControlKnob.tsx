import React, { useState, useRef } from 'react';

interface ControlKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
}

const ControlKnob: React.FC<ControlKnobProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  unit = '' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const normalizedValue = (value - min) / (max - min);
  const rotation = normalizedValue * 270 - 135; // -135 to +135 degrees

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - e.clientY; // Inverted for natural feel
    const sensitivity = (max - min) / 100; // 100px = full range
    const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity));
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="flex flex-col items-center space-y-2">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="relative">
        <div
          ref={knobRef}
          className={`w-16 h-16 rounded-full border-4 border-gray-300 bg-gradient-to-br from-gray-200 to-gray-400 cursor-pointer select-none ${
            isDragging ? 'shadow-lg' : 'shadow-md'
          } transition-shadow`}
          onMouseDown={handleMouseDown}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <div className="absolute w-1 h-6 bg-white rounded-full left-1/2 top-1 transform -translate-x-1/2 shadow-sm" />
        </div>
      </div>
      <div className="text-xs text-gray-500 font-mono">
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
};

export default ControlKnob;
