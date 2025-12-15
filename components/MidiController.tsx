"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Piano from "./Piano"
import ControlKnob from "./ControlKnob"
import { PianoSynthesizer } from "./PianoSynthesizer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DrumMachine from "./DrumMachine"
import LoopRecorder from "./LoopRecorder"

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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">MIDI Controller</h1>
          <p className="text-zinc-300">Web-based synthesizer with realistic piano sounds</p>
        </div>

        {/* Control Panel */}
        <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Sound Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sound Mode Selection */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white text-sm font-medium">Sound Mode:</span>
              <div className="flex gap-2">
                <Button
                  variant={soundMode === "piano" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => {
                    stopAllNotes()
                    setSoundMode("piano")
                  }}
                  className={`${
                    soundMode === "piano"
                      ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  } font-medium`}
                >
                  Piano
                </Button>
                <Button
                  variant={soundMode === "oscillator" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => {
                    stopAllNotes()
                    setSoundMode("oscillator")
                  }}
                  className={`${
                    soundMode === "oscillator"
                      ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  } font-medium`}
                >
                  Synthesizer
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={emergencyStop}
                className="ml-auto bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Stop All
              </Button>
            </div>

            {/* Control Knobs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <ControlKnob
                label="Volume"
                value={audioSettings.volume}
                min={0}
                max={1}
                onChange={(value) => updateAudioSetting("volume", value)}
              />
              <ControlKnob
                label="Attack"
                value={audioSettings.attack}
                min={0.01}
                max={1}
                onChange={(value) => updateAudioSetting("attack", value)}
                unit="s"
              />
              <ControlKnob
                label="Release"
                value={audioSettings.release}
                min={0.01}
                max={3}
                onChange={(value) => updateAudioSetting("release", value)}
                unit="s"
              />
              <ControlKnob
                label="Filter"
                value={audioSettings.filterFreq}
                min={100}
                max={8000}
                onChange={(value) => updateAudioSetting("filterFreq", value)}
                unit="Hz"
              />
              <ControlKnob
                label="Reverb"
                value={audioSettings.reverb}
                min={0}
                max={1}
                onChange={(value) => updateAudioSetting("reverb", value)}
              />
            </div>

            {/* Waveform Selection - Only show for oscillator mode */}
            {soundMode === "oscillator" && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-white text-sm font-medium">Waveform:</span>
                <div className="flex gap-2">
                  {(["sine", "square", "sawtooth", "triangle"] as OscillatorType[]).map((wave) => (
                    <Button
                      key={wave}
                      variant="secondary"
                      size="sm"
                      onClick={() => setWaveform(wave)}
                      className={`${
                        waveform === wave
                          ? "bg-zinc-600 hover:bg-zinc-500 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-white"
                      } capitalize font-medium`}
                    >
                      {wave}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Piano Mode Info */}
            {soundMode === "piano" && (
              <div className="bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
                <p className="text-zinc-200 text-sm leading-relaxed">
                  <strong>Piano mode</strong> uses multi-harmonic synthesis with realistic attack and decay
                  characteristics. The Release control adjusts how long notes sustain after being released (max 3
                  seconds). Use <strong>"Stop All"</strong> if you experience any audio issues.
                </p>
              </div>
            )}

            {/* Initialize Audio Button */}
            {!isPlaying && (
              <Button
                onClick={startAudio}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 text-base"
                size="lg"
              >
                🎵 initialize Audio
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Loop Recorder */}
        <LoopRecorder audioContext={audioContext} masterGain={masterGainRef.current} />

        {/* Drum Machine */}
        <DrumMachine audioContext={audioContext} masterGain={masterGainRef.current} />

        {/* Piano */}
        <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl text-center">Piano Keyboard</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Piano onNotePlay={playNote} onNoteStop={stopNote} />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-4">
            <p className="text-zinc-200 text-center text-base">
              Play notes by clicking the piano keys or using your computer keyboard. You may need to click{" "}
              <strong>"Initialize Audio"</strong> first due to browser audio policies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
                <h4 className="text-white font-semibold mb-3">Keyboard Controls - Lower Octave (C4-B4):</h4>
                <div className="text-zinc-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">White keys:</span>
                    <span className="font-mono text-zinc-100 bg-zinc-900 px-2 py-1 rounded text-xs">A S D F G H J</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">Black keys:</span>
                    <span className="font-mono text-zinc-100 bg-zinc-900 px-2 py-1 rounded text-xs">W E T Y U</span>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-800/60 p-4 rounded-lg border border-zinc-700">
                <h4 className="text-white font-semibold mb-3">Keyboard Controls - Higher Octave (C5-B5):</h4>
                <div className="text-zinc-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">White keys:</span>
                    <span className="font-mono text-zinc-100 bg-zinc-900 px-2 py-1 rounded text-xs">K L ; ' ↵ Z C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">Black keys:</span>
                    <span className="font-mono text-zinc-100 bg-zinc-900 px-2 py-1 rounded text-xs">O P ] \ X</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm">
            web midi controller by{" "}
            <a
              href="https://github.com/sudo-self/midi-controller"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white transition-colors duration-200 font-medium"
            >
              sudo-self
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default MidiController
