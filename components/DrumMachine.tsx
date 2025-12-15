"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DrumMachineProps {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

type DrumSound = "kick" | "snare" | "cymbal" | "tom"

const DrumMachine: React.FC<DrumMachineProps> = ({ audioContext, masterGain }) => {
  const [activePad, setActivePad] = useState<DrumSound | null>(null)
  const activeNodesRef = useRef<Map<DrumSound, AudioBufferSourceNode>>(new Map())

  // Create drum sounds using the Web Audio API
  const createKick = (ctx: AudioContext, destination: AudioNode) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const gainOsc = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    gainOsc.gain.setValueAtTime(1, ctx.currentTime)
    gainOsc.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    gain.gain.setValueAtTime(1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc.connect(gainOsc)
    gainOsc.connect(gain)
    gain.connect(destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)

    return { osc, gain }
  }

  const createSnare = (ctx: AudioContext, destination: AudioNode) => {
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "highpass"
    noiseFilter.frequency.value = 1000

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(1, ctx.currentTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.value = 100

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.7, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(destination)

    osc.connect(oscGain)
    oscGain.connect(destination)

    noise.start(ctx.currentTime)
    osc.start(ctx.currentTime)
    noise.stop(ctx.currentTime + 0.2)
    osc.stop(ctx.currentTime + 0.1)

    return { noise, osc, noiseGain, oscGain }
  }

  const createCymbal = (ctx: AudioContext, destination: AudioNode) => {
    const ratios = [1, 1.34, 1.71, 2.08, 2.76]
    const gains: GainNode[] = []
    const oscs: OscillatorNode[] = []

    ratios.forEach((ratio) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "square"
      osc.frequency.value = 300 * ratio

      gain.gain.setValueAtTime(0.3 / ratios.length, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      osc.connect(gain)
      gain.connect(destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)

      oscs.push(osc)
      gains.push(gain)
    })

    const filter = ctx.createBiquadFilter()
    filter.type = "highpass"
    filter.frequency.value = 7000

    return { oscs, gains, filter }
  }

  const createTom = (ctx: AudioContext, destination: AudioNode) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3)

    gain.gain.setValueAtTime(1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.connect(gain)
    gain.connect(destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    return { osc, gain }
  }

  const playDrum = (sound: DrumSound) => {
    if (!audioContext || !masterGain) return

    setActivePad(sound)
    setTimeout(() => setActivePad(null), 150)

    try {
      switch (sound) {
        case "kick":
          createKick(audioContext, masterGain)
          break
        case "snare":
          createSnare(audioContext, masterGain)
          break
        case "cymbal":
          createCymbal(audioContext, masterGain)
          break
        case "tom":
          createTom(audioContext, masterGain)
          break
      }
    } catch (error) {
      console.error("Error playing drum sound:", error)
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return

      switch (e.key.toLowerCase()) {
        case "1":
          playDrum("kick")
          break
        case "2":
          playDrum("snare")
          break
        case "3":
          playDrum("cymbal")
          break
        case "4":
          playDrum("tom")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [audioContext, masterGain])

  const pads: { sound: DrumSound; label: string; color: string; keyLabel: string }[] = [
    { sound: "kick", label: "KICK", color: "from-zinc-700 to-zinc-800", keyLabel: "1" },
    { sound: "snare", label: "SNARE", color: "from-zinc-600 to-zinc-700", keyLabel: "2" },
    { sound: "cymbal", label: "CYMBAL", color: "from-zinc-700 to-zinc-800", keyLabel: "3" },
    { sound: "tom", label: "TOM", color: "from-zinc-600 to-zinc-700", keyLabel: "4" },
  ]

  return (
    <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-xl text-center">Drum Machine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {pads.map((pad) => (
            <button
              key={pad.sound}
              onClick={() => playDrum(pad.sound)}
              className={`
                relative h-32 rounded-xl bg-gradient-to-br ${pad.color}
                border-2 transition-all duration-150
                ${
                  activePad === pad.sound
                    ? "border-white shadow-lg shadow-white/50 scale-95"
                    : "border-zinc-600 hover:border-zinc-500 shadow-md"
                }
                active:scale-95
                group
              `}
            >
              <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col items-center justify-center h-full">
                <span className="text-white font-bold text-2xl tracking-wider mb-2">{pad.label}</span>
                <span className="text-zinc-400 text-sm font-mono bg-zinc-800/50 px-2 py-1 rounded">
                  Key: {pad.keyLabel}
                </span>
              </div>
              {activePad === pad.sound && (
                <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />
              )}
            </button>
          ))}
        </div>
        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            Click pads or press keys <span className="font-mono text-white">1, 2, 3, 4</span> to play drums
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default DrumMachine
