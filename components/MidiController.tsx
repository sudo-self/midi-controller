"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Piano from "./Piano"
import ControlKnob from "./ControlKnob"
import { PianoSynthesizer } from "./PianoSynthesizer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoopRecorder from "./LoopRecorder"
import DrumMachine from "./DrumMachine"

interface AudioSettings {
  volume: number
  attack: number
  release: number
  filterFreq: number
  reverb: number
}

type SoundMode = "oscillator" | "piano"

const MidiController: React.FC = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [soundMode, setSoundMode] = useState<SoundMode>("piano")

  // For oscillator mode
  const activeOscillators = useRef<Map<string, { osc: OscillatorNode; gain: GainNode }>>(new Map())

  // For piano mode
  const activePianoNotes = useRef<
    Map<string, { oscillators: OscillatorNode[]; gainNode: GainNode; noiseNode?: AudioBufferSourceNode }>
  >(new Map())
  const pianoSynthRef = useRef<PianoSynthesizer | null>(null)

  const masterGainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const reverbRef = useRef<ConvolverNode | null>(null)

  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 0.5,
    attack: 0.01,
    release: 1.5,
    filterFreq: 1000,
    reverb: 0.2,
  })

  const [waveform, setWaveform] = useState<OscillatorType>("sine")

  useEffect(() => {
    initializeAudio()
    return () => {
      // Cleanup all active notes before closing audio context
      stopAllNotes()
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [])

  const stopAllNotes = () => {
    // Stop all piano notes
    activePianoNotes.current.forEach((note, noteName) => {
      if (pianoSynthRef.current) {
        pianoSynthRef.current.stopPianoSound(note.oscillators, note.gainNode, note.noiseNode)
      }
    })
    activePianoNotes.current.clear()

    // Stop all oscillator notes
    activeOscillators.current.forEach((note, noteName) => {
      try {
        note.gain.gain.setValueAtTime(0, audioContext?.currentTime || 0)
        note.osc.stop()
      } catch (e) {
        // Ignore errors on cleanup
      }
    })
    activeOscillators.current.clear()
  }

  const initializeAudio = async () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create master gain
      const masterGain = context.createGain()
      masterGain.gain.value = audioSettings.volume

      // Create filter
      const filter = context.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = audioSettings.filterFreq
      filter.Q.value = 1

      // Create reverb (simple delay for demonstration)
      const reverb = context.createConvolver()
      const reverbBuffer = createReverbImpulse(context, 2, 2, false)
      reverb.buffer = reverbBuffer

      // Connect audio graph
      masterGain.connect(filter)
      filter.connect(reverb)
      reverb.connect(context.destination)
      filter.connect(context.destination) // Dry signal

      masterGainRef.current = masterGain
      filterRef.current = filter
      reverbRef.current = reverb

      // Initialize piano synthesizer
      pianoSynthRef.current = new PianoSynthesizer(context, masterGain, filter)

      setAudioContext(context)
    } catch (error) {
      console.error("Failed to initialize audio:", error)
    }
  }

  const createReverbImpulse = (context: AudioContext, duration: number, decay: number, reverse: boolean) => {
    const length = context.sampleRate * duration
    const impulse = context.createBuffer(2, length, context.sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay)
      }
    }

    return impulse
  }

  const playNote = (frequency: number, note: string) => {
    if (!audioContext || !masterGainRef.current) return

    // Stop existing note if playing (important for retriggering)
    stopNote(note)

    if (soundMode === "piano" && pianoSynthRef.current) {
      // Use piano synthesizer
      pianoSynthRef.current.updateSettings({
        volume: audioSettings.volume,
        attack: audioSettings.attack,
        release: audioSettings.release,
      })

      try {
        const pianoSound = pianoSynthRef.current.createPianoSound(frequency)
        activePianoNotes.current.set(note, pianoSound)
      } catch (error) {
        console.error("Error creating piano sound:", error)
      }
    } else {
      // Use original oscillator mode
      try {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = waveform
        oscillator.frequency.value = frequency

        // ADSR envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(audioSettings.volume, audioContext.currentTime + audioSettings.attack)

        oscillator.connect(gainNode)
        gainNode.connect(masterGainRef.current)

        oscillator.start()

        activeOscillators.current.set(note, { osc: oscillator, gain: gainNode })
      } catch (error) {
        console.error("Error creating oscillator sound:", error)
      }
    }
  }

  const stopNote = (note: string) => {
    if (soundMode === "piano" && pianoSynthRef.current) {
      // Stop piano note
      const activePianoNote = activePianoNotes.current.get(note)
      if (activePianoNote) {
        try {
          pianoSynthRef.current.stopPianoSound(
            activePianoNote.oscillators,
            activePianoNote.gainNode,
            activePianoNote.noiseNode,
          )
        } catch (error) {
          console.error("Error stopping piano sound:", error)
        } finally {
          // Always remove from the map, even if stopping failed
          activePianoNotes.current.delete(note)
        }
      }
    } else {
      // Stop oscillator note
      const activeNote = activeOscillators.current.get(note)
      if (activeNote && audioContext) {
        try {
          const { osc, gain } = activeNote

          const releaseTime = Math.min(audioSettings.release, 2.0) // Limit release time
          gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + releaseTime)
          osc.stop(audioContext.currentTime + releaseTime)
        } catch (error) {
          console.error("Error stopping oscillator:", error)
        } finally {
          activeOscillators.current.delete(note)
        }
      }
    }
  }

  const updateAudioSetting = (setting: keyof AudioSettings, value: number) => {
    setAudioSettings((prev) => ({ ...prev, [setting]: value }))

    if (setting === "volume" && masterGainRef.current) {
      masterGainRef.current.gain.value = value
    } else if (setting === "filterFreq" && filterRef.current) {
      filterRef.current.frequency.value = value
    }
  }

  const startAudio = async () => {
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }
    setIsPlaying(true)
  }

  // Add emergency stop function
  const emergencyStop = () => {
    stopAllNotes()
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(0, audioContext?.currentTime || 0)
      setTimeout(() => {
        if (masterGainRef.current) {
          masterGainRef.current.gain.setValueAtTime(audioSettings.volume, audioContext?.currentTime || 0)
        }
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header with DJ-style branding */}
        <div className="text-center space-y-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent blur-xl"></div>
            <h1 className="relative text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
              WEB MIDI MUSIC
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3 text-zinc-300">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">LIVE</span>
            </div>
            <span className="text-sm">•</span>
            <p className="text-sm">SYNTHESIZER • PIANO • DRUM MACHINES</p>
            <span className="text-sm">•</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">REC</span>
            </div>
          </div>
        </div>

        {/* Main Control Deck - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Synthesizer Controls */}
          <div className="lg:col-span-1 space-y-5">
            <Card className="bg-gradient-to-br from-zinc-900/95 to-black border-zinc-800 backdrop-blur-sm">
              <CardHeader className="pb-4 border-b border-zinc-800">
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                  SYNTHESIZER
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Sound Mode Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">MODE SELECT</span>
                    <div className="flex gap-1 bg-zinc-800 p-1 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          stopAllNotes()
                          setSoundMode("piano")
                        }}
                        className={`${
                          soundMode === "piano"
                            ? "bg-zinc-700 hover:bg-zinc-600 text-white shadow-inner"
                            : "bg-transparent hover:bg-zinc-700/50 text-zinc-400"
                        } font-medium text-xs px-3`}
                      >
                        PIANO
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          stopAllNotes()
                          setSoundMode("oscillator")
                        }}
                        className={`${
                          soundMode === "oscillator"
                            ? "bg-zinc-700 hover:bg-zinc-600 text-white shadow-inner"
                            : "bg-transparent hover:bg-zinc-700/50 text-zinc-400"
                        } font-medium text-xs px-3`}
                      >
                        SYNTH
                      </Button>
                    </div>
                  </div>
                  
                  {/* Waveform Selection */}
                  {soundMode === "oscillator" && (
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white text-sm font-medium">WAVEFORM</span>
                        <span className="text-cyan-300 text-xs font-mono">{waveform.toUpperCase()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["sine", "square", "sawtooth", "triangle"] as OscillatorType[]).map((wave) => (
                          <Button
                            key={wave}
                            variant="outline"
                            size="sm"
                            onClick={() => setWaveform(wave)}
                            className={`${
                              waveform === wave
                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                                : "bg-zinc-800/30 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50"
                            } capitalize font-medium text-xs h-8`}
                          >
                            {wave}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Knobs - Vertical Layout */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ControlKnob
                      label="VOLUME"
                      value={audioSettings.volume}
                      min={0}
                      max={1}
                      onChange={(value) => updateAudioSetting("volume", value)}
                    />
                    <ControlKnob
                      label="FILTER"
                      value={audioSettings.filterFreq}
                      min={100}
                      max={8000}
                      onChange={(value) => updateAudioSetting("filterFreq", value)}
                      unit="Hz"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ControlKnob
                      label="ATTACK"
                      value={audioSettings.attack}
                      min={0.01}
                      max={1}
                      onChange={(value) => updateAudioSetting("attack", value)}
                      unit="s"
                    />
                    <ControlKnob
                      label="RELEASE"
                      value={audioSettings.release}
                      min={0.01}
                      max={3}
                      onChange={(value) => updateAudioSetting("release", value)}
                      unit="s"
                    />
                  </div>
                  <ControlKnob
                    label="REVERB"
                    value={audioSettings.reverb}
                    min={0}
                    max={1}
                    onChange={(value) => updateAudioSetting("reverb", value)}
                  />
                </div>

                {/* Control Buttons */}
                <div className="space-y-3">
                  {!isPlaying ? (
                    <Button
                      onClick={startAudio}
                      className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold py-4 text-base shadow-lg shadow-indigo-500/25"
                      size="lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span>POWER ON</span>
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-green-900/20 border border-green-800 rounded-lg">
                        <div className="text-green-400 text-xs mb-1">STATUS</div>
                        <div className="text-white text-sm font-bold">ACTIVE</div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={emergencyStop}
                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-4 h-auto"
                      >
                        STOP ALL
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mode Info */}
                {soundMode === "piano" && (
                  <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-4 rounded-lg border border-blue-800/30">
                    <p className="text-blue-200 text-xs leading-relaxed">
                      <strong>PIANO MODE</strong> • Multi-harmonic synthesis with realistic attack and decay characteristics. Perfect for melodic playing.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Main Instruments */}
          <div className="lg:col-span-2 space-y-5">
            {/* Drum Machine */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 blur-lg rounded-xl"></div>
              <DrumMachine audioContext={audioContext} masterGain={masterGainRef.current} />
            </div>

            {/* Piano */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-lg rounded-xl"></div>
              <Card className="bg-gradient-to-br from-zinc-900/95 to-black border-zinc-800 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-zinc-800">
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                    PIANO KEYBOARD
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                  <Piano onNotePlay={playNote} onNoteStop={stopNote} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Row - Loop Recorder and Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Loop Recorder - Now with MP3 Player on right side */}
          <div className="lg:col-span-2">
            <LoopRecorder audioContext={audioContext} masterGain={masterGainRef.current} />
          </div>

          {/* Instructions Panel */}
          <div>
            <Card className="bg-gradient-to-br from-zinc-900/95 to-black border-zinc-800 backdrop-blur-sm h-full">
              <CardHeader className="pb-4 border-b border-zinc-800">
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  CONTROLS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold text-sm">KEYBOARD MAPPING</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-800/50 p-3 rounded-lg">
                        <div className="text-cyan-300 text-xs font-semibold mb-1">OCTAVE 1</div>
                        <div className="space-y-1">
                          <div className="text-zinc-300 text-xs">White: <span className="font-mono text-white">A S D F G H J</span></div>
                          <div className="text-zinc-300 text-xs">Black: <span className="font-mono text-white">W E T Y U</span></div>
                        </div>
                      </div>
                      <div className="bg-zinc-800/50 p-3 rounded-lg">
                        <div className="text-purple-300 text-xs font-semibold mb-1">OCTAVE 2</div>
                        <div className="space-y-1">
                          <div className="text-zinc-300 text-xs">White: <span className="font-mono text-white">K L ; ' ↵ Z C</span></div>
                          <div className="text-zinc-300 text-xs">Black: <span className="font-mono text-white">O P ] \ X</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 p-3 rounded-lg border border-amber-800/30">
                    <h4 className="text-amber-300 font-semibold text-sm mb-2">QUICK TIPS</h4>
                    <ul className="text-zinc-300 text-xs space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">▶</span>
                        <span>Click "POWER ON" to start audio</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">▶</span>
                        <span>Use Drum Machine repeater for patterns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">▶</span>
                        <span>Switch between Piano/Synth modes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">▶</span>
                        <span>Record loops with Loop Recorder</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400">▶</span>
                        <span>Play MP3 tracks for background music</span>
                      </li>
                    </ul>
                  </div>

                  {/* Audio Status */}
                  <div className="bg-zinc-800/30 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-medium">AUDIO STATUS</span>
                      <div className={`px-2 py-1 rounded text-xs ${isPlaying ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {isPlaying ? 'ACTIVE' : 'STANDBY'}
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-300"
                        style={{ width: isPlaying ? '100%' : '30%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-zinc-500 text-sm">
              WEB MIDI MUSIC v1.0 • Built with Web Audio API
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/sudo-self/midi-controller"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <div className="text-zinc-600 text-sm">•</div>
              <div className="text-zinc-400 text-sm">
                <span className="text-cyan-400">♫♪</span> JRs Web MIDI Controller <span className="text-cyan-400">♫♪</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MidiController
