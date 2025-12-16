"use client"

import React, { useState, useRef } from "react"

interface ControlKnobProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  unit?: string
  color?: "blue" | "red" | "green" | "purple" | "amber" | "cyan"
  size?: "sm" | "md" | "lg"
}

const ControlKnob: React.FC<ControlKnobProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  unit = "", 
  color = "blue",
  size = "md"
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startValueRef = useRef(0)

  const normalizedValue = (value - min) / (max - min)
  const rotation = normalizedValue * 270 - 135 // -135 to +135 degrees

  // Color mappings
  const colorConfig = {
    blue: {
      ring: "border-blue-500/50",
      gradient: "from-blue-600 via-blue-700 to-blue-800",
      accent: "bg-gradient-to-r from-cyan-400 to-blue-400",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]"
    },
    red: {
      ring: "border-red-500/50",
      gradient: "from-red-600 via-red-700 to-red-800",
      accent: "bg-gradient-to-r from-orange-400 to-red-400",
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]"
    },
    green: {
      ring: "border-green-500/50",
      gradient: "from-green-600 via-green-700 to-green-800",
      accent: "bg-gradient-to-r from-emerald-400 to-green-400",
      glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]"
    },
    purple: {
      ring: "border-purple-500/50",
      gradient: "from-purple-600 via-purple-700 to-purple-800",
      accent: "bg-gradient-to-r from-violet-400 to-purple-400",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]"
    },
    amber: {
      ring: "border-amber-500/50",
      gradient: "from-amber-600 via-amber-700 to-amber-800",
      accent: "bg-gradient-to-r from-yellow-400 to-amber-400",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]"
    },
    cyan: {
      ring: "border-cyan-500/50",
      gradient: "from-cyan-600 via-cyan-700 to-cyan-800",
      accent: "bg-gradient-to-r from-teal-400 to-cyan-400",
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]"
    }
  }

  // Size mappings
  const sizeConfig = {
    sm: {
      knob: "w-14 h-14",
      indicator: "w-1 h-5",
      dot: "w-1.5 h-1.5",
      text: "text-[10px]",
      label: "text-xs"
    },
    md: {
      knob: "w-20 h-20",
      indicator: "w-1.5 h-8",
      dot: "w-2 h-2",
      text: "text-xs",
      label: "text-sm"
    },
    lg: {
      knob: "w-28 h-28",
      indicator: "w-2 h-10",
      dot: "w-3 h-3",
      text: "text-sm",
      label: "text-base"
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startYRef.current = e.clientY
    startValueRef.current = value
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaY = startYRef.current - e.clientY // Inverted for natural feel
    const sensitivity = (max - min) / 100 // 100px = full range
    const newValue = Math.min(max, Math.max(min, startValueRef.current + deltaY * sensitivity))
    onChange(newValue)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging])

  const config = colorConfig[color]
  const sizeInfo = sizeConfig[size]

  return (
    <div className="flex flex-col items-center space-y-4 group">
      {/* DJ-style label with LED indicator */}
      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-1.5 h-1.5 rounded-full ${config.accent} animate-pulse`}></div>
          <label className={`${sizeInfo.label} font-bold text-slate-200 tracking-wider uppercase`}>
            {label}
          </label>
        </div>
        <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
      </div>

      {/* Knob container with DJ rack styling */}
      <div className="relative">
        {/* Outer ring with metallic finish */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 
                        border-2 ${config.ring} shadow-inner ${sizeInfo.knob} -m-1`}></div>
        
        {/* Screw heads for authentic DJ equipment look */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full 
                       bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-600"></div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full 
                       bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-600"></div>
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 rounded-full 
                       bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-600"></div>
        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 rounded-full 
                       bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-600"></div>

        {/* Main knob */}
        <div
          ref={knobRef}
          className={`relative ${sizeInfo.knob} rounded-full cursor-pointer select-none transition-all duration-150 
                    border-2 border-slate-700/50 bg-gradient-to-br ${config.gradient}
                    ${isDragging ? `${config.glow} scale-110 border-blue-300/50` : "shadow-xl hover:scale-105"}
                    group-hover:${config.glow}`}
          onMouseDown={handleMouseDown}
          style={{
            transform: `rotate(${rotation}deg) ${isDragging ? "scale(1.1)" : ""}`,
          }}
        >
          {/* Knob grip ridges */}
          <div className="absolute inset-3 rounded-full border border-slate-800/50"></div>
          <div className="absolute inset-5 rounded-full border border-slate-900/30"></div>
          
          {/* Glossy top layer */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-black/10"></div>
          
          {/* Radial gradient lines for depth */}
          <div className="absolute inset-0 rounded-full"
               style={{
                 background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)`
               }}>
          </div>

          {/* Main indicator line */}
          <div className={`absolute ${sizeInfo.indicator} ${config.accent} rounded-full 
                         left-1/2 top-1 transform -translate-x-1/2 shadow-lg`}
               style={{
                 transform: `translateX(-50%) rotate(180deg)`,
                 boxShadow: `0 0 8px ${config.accent}`
               }} />

          {/* Center dot with metallic look */}
          <div className={`absolute ${sizeInfo.dot} rounded-full left-1/2 top-1/2 
                         transform -translate-x-1/2 -translate-y-1/2
                         bg-gradient-to-br from-slate-400 to-slate-600 border border-slate-500`} />

          {/* Value markers */}
          <div className="absolute top-1/2 left-0 w-1/2 h-px bg-slate-700/30 transform -translate-y-1/2">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-1 bg-slate-600/50 rounded-r"></div>
          </div>
          <div className="absolute top-0 left-1/2 h-1/2 w-px bg-slate-700/30 transform -translate-x-1/2">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-slate-600/50 rounded-b"></div>
          </div>
          <div className="absolute top-1/2 right-0 w-1/2 h-px bg-slate-700/30 transform -translate-y-1/2">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-1 bg-slate-600/50 rounded-l"></div>
          </div>
          <div className="absolute bottom-0 left-1/2 h-1/2 w-px bg-slate-700/30 transform -translate-x-1/2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-slate-600/50 rounded-t"></div>
          </div>
        </div>

        {/* Notches around the knob */}
        <div className="absolute inset-0 rounded-full">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15) * Math.PI / 180
            const notchLength = i % 6 === 0 ? 8 : 4 // Longer notches at major positions
            const x = 50 + 48 * Math.cos(angle)
            const y = 50 + 48 * Math.sin(angle)
            
            return (
              <div
                key={i}
                className="absolute w-px bg-slate-600/40"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  height: `${notchLength}px`,
                  transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
                  transformOrigin: 'center'
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Value display with DJ rack styling */}
      <div className="relative">
        <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 
                      rounded-md px-4 py-2 shadow-inner min-w-[80px]">
          {/* Seven-segment display effect */}
          <div className="text-center">
            <div className={`${sizeInfo.text} font-mono font-bold ${config.accent} bg-clip-text text-transparent
                           tracking-wider`}>
              {value.toFixed(1)}
              <span className="text-slate-400 ml-1">{unit}</span>
            </div>
          </div>
          
          {/* LED-like border effect */}
          <div className="absolute inset-0 rounded-md border border-transparent 
                        bg-gradient-to-r from-transparent via-slate-600/20 to-transparent"></div>
        </div>
        
        {/* Display mounting brackets */}
        <div className="absolute -top-1 left-2 right-2 h-2 bg-gradient-to-b from-slate-700 to-transparent"></div>
        <div className="absolute -bottom-1 left-2 right-2 h-2 bg-gradient-to-t from-slate-700 to-transparent"></div>
        
        {/* Side brackets */}
        <div className="absolute -left-1 top-2 bottom-2 w-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
        <div className="absolute -right-1 top-2 bottom-2 w-1 bg-gradient-to-l from-slate-700 to-transparent"></div>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between w-full px-2">
        <span className="text-xs text-slate-400 font-mono">{min}{unit}</span>
        <span className="text-xs text-slate-400 font-mono">{max}{unit}</span>
      </div>
    </div>
  )
}

export default ControlKnob
