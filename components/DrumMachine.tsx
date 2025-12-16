"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DrumMachineProps {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

type DrumSound = "kick" | "snare" | "cymbal" | "tom" | "snare2" | "siren" | "kick2" | "openhat" | "clap" | "cowbell" | "rimshot" | "laser"

type KitType = "kit1" | "kit2"

const DrumMachine: React.FC<DrumMachineProps> = ({ audioContext, masterGain }) => {
  const [activePad, setActivePad] = useState<DrumSound | null>(null)
  const [activeKit, setActiveKit] = useState<KitType>("kit1")
  const [isRepeating, setIsRepeating] = useState(false)
  const [repeatSpeed, setRepeatSpeed] = useState(200) // ms between repeats
  const [lastPlayedSound, setLastPlayedSound] = useState<DrumSound | null>(null)
  
  const repeatIntervalRef = useRef<number | null>(null)

  // KIT 1 Sounds (Original)
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

    return { oscs, gains }
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

  const createSnare2 = (ctx: AudioContext, destination: AudioNode) => {
    // Create a more punchy snare with different characteristics
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "bandpass"
    noiseFilter.frequency.value = 1800
    noiseFilter.Q.value = 1.5

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.8, ctx.currentTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    // Add two tone oscillators for more body
    const osc1 = ctx.createOscillator()
    osc1.type = "sawtooth"
    osc1.frequency.value = 180

    const osc2 = ctx.createOscillator()
    osc2.type = "sine"
    osc2.frequency.value = 90

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.6, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 30
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(compressor)

    osc1.connect(oscGain)
    osc2.connect(oscGain)
    oscGain.connect(compressor)

    compressor.connect(destination)

    noise.start(ctx.currentTime)
    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    noise.stop(ctx.currentTime + 0.15)
    osc1.stop(ctx.currentTime + 0.08)
    osc2.stop(ctx.currentTime + 0.08)

    return { noise, osc1, osc2, noiseGain, oscGain, compressor }
  }

  const createSiren = (ctx: AudioContext, destination: AudioNode) => {
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()

    // Create a two-oscillator siren sound
    osc1.type = "sawtooth"
    osc1.frequency.value = 800

    osc2.type = "sawtooth"
    osc2.frequency.value = 805 // Slight detuning for chorus effect

    // LFO for the siren effect
    lfo.type = "sine"
    lfo.frequency.value = 5 // 5 Hz siren rate
    
    lfoGain.gain.value = 400 // Modulation depth

    // Connect LFO to both oscillators
    lfo.connect(lfoGain)
    lfoGain.connect(osc1.frequency)
    lfoGain.connect(osc2.frequency)

    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.5, ctx.currentTime + 1.5)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(destination)

    // Start oscillators
    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    lfo.start(ctx.currentTime)

    // Stop after 2 seconds
    osc1.stop(ctx.currentTime + 2)
    osc2.stop(ctx.currentTime + 2)
    lfo.stop(ctx.currentTime + 2)

    return { osc1, osc2, gain, lfo, lfoGain }
  }

  // KIT 2 Sounds (DJ Sounds)
  const createKick2 = (ctx: AudioContext, destination: AudioNode) => {
    // More aggressive, punchy kick
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    const gain2 = ctx.createGain()
    const masterGain = ctx.createGain()

    osc1.type = "sine"
    osc1.frequency.setValueAtTime(80, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1)
    osc1.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc2.type = "triangle"
    osc2.frequency.value = 60
    osc2.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    gain1.gain.setValueAtTime(1, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    gain2.gain.setValueAtTime(0.5, ctx.currentTime)
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    masterGain.gain.setValueAtTime(1, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc1.connect(gain1)
    osc2.connect(gain2)
    gain1.connect(masterGain)
    gain2.connect(masterGain)
    masterGain.connect(destination)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.3)
    osc2.stop(ctx.currentTime + 0.1)

    return { osc1, osc2, gain1, gain2, masterGain }
  }

  const createOpenhat = (ctx: AudioContext, destination: AudioNode) => {
    // Open hi-hat sound - works better than closed hi-hat
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const filter1 = ctx.createBiquadFilter()
    filter1.type = "highpass"
    filter1.frequency.value = 6000

    const filter2 = ctx.createBiquadFilter()
    filter2.type = "peaking"
    filter2.frequency.value = 8000
    filter2.gain.value = 10
    filter2.Q.value = 2

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    noise.connect(filter1)
    filter1.connect(filter2)
    filter2.connect(gain)
    gain.connect(destination)

    noise.start(ctx.currentTime)
    noise.stop(ctx.currentTime + 0.3)

    return { noise, filter1, filter2, gain }
  }

  const createClap = (ctx: AudioContext, destination: AudioNode) => {
  
    const now = ctx.currentTime
    

    for (let i = 0; i < 3; i++) {
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let j = 0; j < data.length; j++) {
        data[j] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = 1200 + i * 200
      filter.Q.value = 1

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.3 - i * 0.08, now + i * 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1 + i * 0.01)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(destination)

      noise.start(now + i * 0.01)
      noise.stop(now + 0.05 + i * 0.01)
    }

    return {}
  }

  const createCowbell = (ctx: AudioContext, destination: AudioNode) => {
 
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = "sine"
    osc1.frequency.value = 900

    osc2.type = "square"
    osc2.frequency.value = 1200

    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(destination)

    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 1000
    filter.Q.value = 5

    gain.connect(filter)
    filter.connect(destination)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.4)
    osc2.stop(ctx.currentTime + 0.4)

    return { osc1, osc2, gain, filter }
  }

  const createRimshot = (ctx: AudioContext, destination: AudioNode) => {
    // Short, sharp rimshot sound
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = "sine"
    osc1.frequency.value = 500
    osc1.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05)

    osc2.type = "triangle"
    osc2.frequency.value = 800

    gain.gain.setValueAtTime(0.8, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(destination)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.08)
    osc2.stop(ctx.currentTime + 0.08)

    return { osc1, osc2, gain }
  }

  const createLaser = (ctx: AudioContext, destination: AudioNode) => {
    // Laser beam sound with pitch sweep
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2)

    filter.type = "lowpass"
    filter.frequency.value = 2000
    filter.frequency.exponentialRampToValueAtTime(8000, ctx.currentTime + 0.1)
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)

    gain.gain.setValueAtTime(0.6, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    return { osc, gain, filter }
  }

  const playDrum = (sound: DrumSound) => {
    if (!audioContext || !masterGain) return

    setActivePad(sound)
    setLastPlayedSound(sound)
    setTimeout(() => {
      if (activePad === sound) {
        setActivePad(null)
      }
    }, 150)

    try {
      switch (sound) {
        // Kit 1 sounds
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
        case "snare2":
          createSnare2(audioContext, masterGain)
          break
        case "siren":
          createSiren(audioContext, masterGain)
          break
        // Kit 2 sounds
        case "kick2":
          createKick2(audioContext, masterGain)
          break
        case "openhat":
          createOpenhat(audioContext, masterGain)
          break
        case "clap":
          createClap(audioContext, masterGain)
          break
        case "cowbell":
          createCowbell(audioContext, masterGain)
          break
        case "rimshot":
          createRimshot(audioContext, masterGain)
          break
        case "laser":
          createLaser(audioContext, masterGain)
          break
      }
    } catch (error) {
      console.error("Error playing drum sound:", error)
    }
  }

  const toggleRepeat = () => {
    if (isRepeating) {
      // Stop repeating
      if (repeatIntervalRef.current !== null) {
        clearInterval(repeatIntervalRef.current)
        repeatIntervalRef.current = null
      }
      setIsRepeating(false)
    } else {
      // Start repeating if there's a last played sound
      if (lastPlayedSound) {
        setIsRepeating(true)
        repeatIntervalRef.current = window.setInterval(() => {
          if (lastPlayedSound) {
            playDrum(lastPlayedSound)
          }
        }, repeatSpeed)
      }
    }
  }

  const updateRepeatSpeed = (speed: number) => {
    setRepeatSpeed(speed)
    // If currently repeating, restart the interval with new speed
    if (isRepeating && repeatIntervalRef.current !== null) {
      clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = window.setInterval(() => {
        if (lastPlayedSound) {
          playDrum(lastPlayedSound)
        }
      }, speed)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (repeatIntervalRef.current !== null) {
        clearInterval(repeatIntervalRef.current)
      }
    }
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return

      let sound: DrumSound | null = null
      
      if (activeKit === "kit1") {
        switch (e.key.toLowerCase()) {
          case "1":
            sound = "kick"
            break
          case "2":
            sound = "snare"
            break
          case "3":
            sound = "cymbal"
            break
          case "4":
            sound = "tom"
            break
          case "5":
            sound = "snare2"
            break
          case "6":
            sound = "siren"
            break
        }
      } else {
        // Kit 2 key mappings
        switch (e.key.toLowerCase()) {
          case "1":
            sound = "kick2"
            break
          case "2":
            sound = "openhat"
            break
          case "3":
            sound = "clap"
            break
          case "4":
            sound = "cowbell"
            break
          case "5":
            sound = "rimshot"
            break
          case "6":
            sound = "laser"
            break
        }
      }
      
      if (sound) {
        playDrum(sound)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [audioContext, masterGain, activeKit])

  // Define pads for each kit
  const kit1Pads = [
    { sound: "kick" as DrumSound, label: "", color: "from-blue-700 to-blue-800", keyLabel: "1" },
    { sound: "snare" as DrumSound, label: "", color: "from-green-600 to-green-700", keyLabel: "2" },
    { sound: "cymbal" as DrumSound, label: "", color: "from-yellow-600 to-yellow-700", keyLabel: "3" },
    { sound: "tom" as DrumSound, label: "", color: "from-purple-600 to-purple-700", keyLabel: "4" },
    { sound: "snare2" as DrumSound, label: "", color: "from-amber-600 to-amber-700", keyLabel: "5" },
    { sound: "siren" as DrumSound, label: "", color: "from-red-600 to-red-700", keyLabel: "6" },
  ]

  const kit2Pads = [
    { sound: "kick2" as DrumSound, label: "", color: "from-indigo-700 to-indigo-800", keyLabel: "1" },
    { sound: "openhat" as DrumSound, label: "", color: "from-teal-600 to-teal-700", keyLabel: "2" },
    { sound: "clap" as DrumSound, label: "", color: "from-pink-600 to-pink-700", keyLabel: "3" },
    { sound: "cowbell" as DrumSound, label: "", color: "from-orange-600 to-orange-700", keyLabel: "4" },
    { sound: "rimshot" as DrumSound, label: "", color: "from-cyan-600 to-cyan-700", keyLabel: "5" },
    { sound: "laser" as DrumSound, label: "", color: "from-violet-600 to-violet-700", keyLabel: "6" },
  ]

  const currentPads = activeKit === "kit1" ? kit1Pads : kit2Pads

  // Custom Toggle Component
  const CustomToggle = () => (
    <div className="flex items-center justify-between">
      <div className="text-white font-medium text-lg"></div>
      <div className="flex items-center space-x-2">
        <span className={`text-sm ${activeKit === "kit1" ? "text-blue-300 font-semibold" : "text-zinc-300"}`}>
          Classic Kit
        </span>
        <button
          onClick={() => setActiveKit(activeKit === "kit1" ? "kit2" : "kit1")}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label={`Switch to ${activeKit === "kit1" ? "Kit 2" : "Kit 1"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              activeKit === "kit2" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-sm ${activeKit === "kit2" ? "text-indigo-300 font-semibold" : "text-zinc-300"}`}>
          DJ Kit
        </span>
      </div>
    </div>
  )

  return (
    <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-xl text-center">DRUM MACHINE</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Kit selector */}
          <div className="lg:w-1/3 space-y-6">
            <div className="bg-zinc-900/95 border border-zinc-700 backdrop-blur-sm p-4 rounded-lg">
              <div className="flex flex-col space-y-4">
                <CustomToggle />
                
                <div className="space-y-2">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">
                      {activeKit === "kit1" ? "CLASSIC KIT" : "DJ KIT"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {activeKit === "kit1" ? (
                      <>
                        <div className="bg-blue-900/30 p-3 rounded-lg">
                          <div className="text-blue-300 text-sm font-semibold">KICK</div>
                          <div className="text-zinc-400 text-xs">Deep bass drum</div>
                        </div>
                        <div className="bg-green-900/30 p-3 rounded-lg">
                          <div className="text-green-300 text-sm font-semibold">SNARE</div>
                          <div className="text-zinc-400 text-xs">Acoustic snare</div>
                        </div>
                        <div className="bg-yellow-900/30 p-3 rounded-lg">
                          <div className="text-yellow-300 text-sm font-semibold">CYMBAL</div>
                          <div className="text-zinc-400 text-xs">Crash cymbal</div>
                        </div>
                        <div className="bg-purple-900/30 p-3 rounded-lg">
                          <div className="text-purple-300 text-sm font-semibold">TOM</div>
                          <div className="text-zinc-400 text-xs">Floor tom</div>
                        </div>
                        <div className="bg-amber-900/30 p-3 rounded-lg">
                          <div className="text-amber-300 text-sm font-semibold">SNARE2</div>
                          <div className="text-zinc-400 text-xs">Punchy snare</div>
                        </div>
                        <div className="bg-red-900/30 p-3 rounded-lg">
                          <div className="text-red-300 text-sm font-semibold">SIREN</div>
                          <div className="text-zinc-400 text-xs">Police siren</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-indigo-900/30 p-3 rounded-lg">
                          <div className="text-indigo-300 text-sm font-semibold">KICK2</div>
                          <div className="text-zinc-400 text-xs">Punchy electro kick</div>
                        </div>
                        <div className="bg-teal-900/30 p-3 rounded-lg">
                          <div className="text-teal-300 text-sm font-semibold">OPENHAT</div>
                          <div className="text-zinc-400 text-xs">Open hi-hat sound</div>
                        </div>
                        <div className="bg-pink-900/30 p-3 rounded-lg">
                          <div className="text-pink-300 text-sm font-semibold">CLAP</div>
                          <div className="text-zinc-400 text-xs">Multi-clap effect</div>
                        </div>
                        <div className="bg-orange-900/30 p-3 rounded-lg">
                          <div className="text-orange-300 text-sm font-semibold">COWBELL</div>
                          <div className="text-zinc-400 text-xs">Metallic percussion</div>
                        </div>
                        <div className="bg-cyan-900/30 p-3 rounded-lg">
                          <div className="text-cyan-300 text-sm font-semibold">RIMSHOT</div>
                          <div className="text-zinc-400 text-xs">Sharp rim click</div>
                        </div>
                        <div className="bg-violet-900/30 p-3 rounded-lg">
                          <div className="text-violet-300 text-sm font-semibold">LASER</div>
                          <div className="text-zinc-400 text-xs">Sci-fi laser beam</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
              <h3 className="text-white font-medium mb-2">Midi Beats</h3>
              <p className="text-zinc-300 text-sm">
                click pads or use keys <span className="font-mono text-white">1-6</span> to play sounds.
                Toggle between <span className="font-semibold text-blue-300">Classic Kit </span>
                and <span className="font-semibold text-indigo-300">DJ Kit</span>
              </p>
            </div>
          </div>
          
          {/* Right side - Drum pads */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentPads.map((pad) => (
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
                    <span className="text-white font-bold text-xl tracking-wider mb-2">{pad.label}</span>
                    <span className="text-zinc-300 text-sm font-mono bg-black/30 px-2 py-1 rounded">
                      Key: {pad.keyLabel}
                    </span>
                    <span className="text-zinc-400 text-xs mt-1 bg-black/20 px-2 py-0.5 rounded">
                      {activeKit === "kit1" ? "Kit 1" : "Kit 2"}
                    </span>
                  </div>
                  {activePad === pad.sound && (
                    <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />
                  )}
                </button>
              ))}
            </div>

            {/* DJ-style repeater controls */}
            <div className="mt-6 bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-2">Repeater</h3>
                  <p className="text-zinc-300 text-sm">
                    create automatic patterns, play a sound and set repeater.
                    Last played: <span className="font-mono text-white">
                      {lastPlayedSound ? lastPlayedSound.toUpperCase() : "None"}
                    </span>
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* Repeater speed control */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-sm">Speed:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateRepeatSpeed(Math.max(50, repeatSpeed - 50))}
                        className="px-2 py-1 bg-zinc-700 rounded text-white hover:bg-zinc-600 text-sm"
                        disabled={repeatSpeed <= 50}
                      >
                        +
                      </button>
                      <span className="text-white font-mono text-sm min-w-[60px] text-center">
                        {repeatSpeed}ms
                      </span>
                      <button
                        onClick={() => updateRepeatSpeed(Math.min(1000, repeatSpeed + 50))}
                        className="px-2 py-1 bg-zinc-700 rounded text-white hover:bg-zinc-600 text-sm"
                        disabled={repeatSpeed >= 1000}
                      >
                        - 
                      </button>
                    </div>
                  </div>

                  {/* Repeater toggle button */}
                  <button
                    onClick={toggleRepeat}
                    disabled={!lastPlayedSound}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isRepeating
                        ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                        : lastPlayedSound
                        ? "bg-indigo-600 hover:bg-green-700 text-white"
                        : "bg-orange-700 text-zinc-400 cursor-not-allowed"
                    }`}
                  >
                    {isRepeating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span>Stop Repeat</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>▶ Repeat</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Speed presets */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => updateRepeatSpeed(400)}
                  className={`px-3 py-1 text-xs rounded ${
                    repeatSpeed === 400
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Slow
                </button>
                <button
                  onClick={() => updateRepeatSpeed(200)}
                  className={`px-3 py-1 text-xs rounded ${
                    repeatSpeed === 200
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => updateRepeatSpeed(100)}
                  className={`px-3 py-1 text-xs rounded ${
                    repeatSpeed === 100
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Fast 
                </button>
                <button
                  onClick={() => updateRepeatSpeed(50)}
                  className={`px-3 py-1 text-xs rounded ${
                    repeatSpeed === 50
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Rapid 
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-4 border-t border-zinc-700">
          <p className="text-zinc-400 text-sm">
            Currently using <span className="font-semibold text-white">{activeKit === "kit1" ? "CLASSIC KIT" : "DJ KIT"}</span> • 
            Use keys <span className="font-mono text-white">1-6</span> • 
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default DrumMachine
