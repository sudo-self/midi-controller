interface PianoSynthesizerProps {
  audioContext: AudioContext
  masterGain: GainNode
  filter: BiquadFilterNode
  volume: number
  attack: number
  release: number
}

export class PianoSynthesizer {
  private audioContext: AudioContext
  private masterGain: GainNode
  private filter: BiquadFilterNode
  private settings: {
    volume: number
    attack: number
    release: number
  }

  constructor(audioContext: AudioContext, masterGain: GainNode, filter: BiquadFilterNode) {
    this.audioContext = audioContext
    this.masterGain = masterGain
    this.filter = filter
    this.settings = {
      volume: 0.5,
      attack: 0.01,
      release: 1.5,
    }
  }

  updateSettings(settings: { volume: number; attack: number; release: number }) {
    this.settings = { ...settings }
  }

  createPianoSound(frequency: number): {
    oscillators: OscillatorNode[]
    gainNode: GainNode
    noiseNode?: AudioBufferSourceNode
  } {
    const now = this.audioContext.currentTime

    // Create main gain node for this note
    const noteGain = this.audioContext.createGain()

    // Piano sound consists of multiple harmonics
    const oscillators: OscillatorNode[] = []

    // Fundamental frequency (strongest component)
    const fundamental = this.audioContext.createOscillator()
    fundamental.frequency.value = frequency
    fundamental.type = "triangle" // Warmer than sine

    const fundamentalGain = this.audioContext.createGain()
    fundamentalGain.gain.value = 0.8
    fundamental.connect(fundamentalGain)
    fundamentalGain.connect(noteGain)
    oscillators.push(fundamental)

    // Second harmonic (octave)
    const secondHarmonic = this.audioContext.createOscillator()
    secondHarmonic.frequency.value = frequency * 2
    secondHarmonic.type = "triangle"

    const secondGain = this.audioContext.createGain()
    secondGain.gain.value = 0.3
    secondHarmonic.connect(secondGain)
    secondGain.connect(noteGain)
    oscillators.push(secondHarmonic)

    // Third harmonic
    const thirdHarmonic = this.audioContext.createOscillator()
    thirdHarmonic.frequency.value = frequency * 3
    thirdHarmonic.type = "sine"

    const thirdGain = this.audioContext.createGain()
    thirdGain.gain.value = 0.15
    thirdHarmonic.connect(thirdGain)
    thirdGain.connect(noteGain)
    oscillators.push(thirdHarmonic)

    // Fourth harmonic
    const fourthHarmonic = this.audioContext.createOscillator()
    fourthHarmonic.frequency.value = frequency * 4
    fourthHarmonic.type = "sine"

    const fourthGain = this.audioContext.createGain()
    fourthGain.gain.value = 0.08
    fourthHarmonic.connect(fourthGain)
    fourthGain.connect(noteGain)
    oscillators.push(fourthHarmonic)

    // Slightly detuned oscillator for richness
    const detuned = this.audioContext.createOscillator()
    detuned.frequency.value = frequency * 1.002 // Slight detune
    detuned.type = "triangle"

    const detunedGain = this.audioContext.createGain()
    detunedGain.gain.value = 0.2
    detuned.connect(detunedGain)
    detunedGain.connect(noteGain)
    oscillators.push(detuned)

    // Add subtle noise for realism (attack transient)
    let noiseNode: AudioBufferSourceNode | undefined
    if (frequency < 1000) {
      // Only add noise to lower notes
      const noiseBuffer = this.createNoiseBuffer(0.1) // 100ms of noise
      noiseNode = this.audioContext.createBufferSource()
      noiseNode.buffer = noiseBuffer

      const noiseGain = this.audioContext.createGain()
      noiseGain.gain.setValueAtTime(0.05, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)

      const noiseFilter = this.audioContext.createBiquadFilter()
      noiseFilter.type = "lowpass"
      noiseFilter.frequency.value = frequency * 4
      noiseFilter.Q.value = 1

      noiseNode.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(noteGain)
    }

    // Piano-like envelope
    noteGain.gain.setValueAtTime(0, now)
    // Very quick attack
    noteGain.gain.linearRampToValueAtTime(this.settings.volume, now + this.settings.attack)
    // Quick initial decay
    noteGain.gain.exponentialRampToValueAtTime(this.settings.volume * 0.7, now + this.settings.attack + 0.1)

    // Connect to audio graph
    noteGain.connect(this.masterGain)

    // Start all oscillators
    oscillators.forEach((osc) => {
      try {
        osc.start(now)
      } catch (e) {
        console.warn("Error starting oscillator:", e)
      }
    })

    if (noiseNode) {
      try {
        noiseNode.start(now)
      } catch (e) {
        console.warn("Error starting noise node:", e)
      }
    }

    return { oscillators, gainNode: noteGain, noiseNode }
  }

  stopPianoSound(oscillators: OscillatorNode[], gainNode: GainNode, noiseNode?: AudioBufferSourceNode) {
    const now = this.audioContext.currentTime

    try {
      // Limit maximum release time to prevent indefinite sounds
      const effectiveRelease = Math.min(this.settings.release, 3.0)

      // Get current gain value more safely
      const currentGain = gainNode.gain.value

      // Cancel any scheduled changes and set current value
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(currentGain, now)

      // Use a smaller target value for better silence
      const targetGain = 0.0001

      // If the release time is very small, use linear ramp, otherwise exponential
      if (effectiveRelease < 0.1) {
        gainNode.gain.linearRampToValueAtTime(0, now + effectiveRelease)
      } else {
        gainNode.gain.exponentialRampToValueAtTime(targetGain, now + effectiveRelease)
      }

      // Stop oscillators with a small buffer time
      const stopTime = now + effectiveRelease + 0.1

      oscillators.forEach((osc, index) => {
        try {
          // Check if oscillator is still connected and not already stopped
          if (osc.playbackState !== "finished") {
            osc.stop(stopTime)
          }
        } catch (e) {
          // Oscillator might already be stopped, which is fine
          console.warn(`Error stopping oscillator ${index}:`, e)
        }
      })

      // Stop noise node immediately since it's short
      if (noiseNode) {
        try {
          if (noiseNode.playbackState !== "finished") {
            noiseNode.stop(now + 0.1)
          }
        } catch (e) {
          console.warn("Error stopping noise node:", e)
        }
      }

      // Disconnect and clean up after the release time
      setTimeout(
        () => {
          try {
            gainNode.disconnect()
            oscillators.forEach((osc) => {
              try {
                osc.disconnect()
              } catch (e) {
                // Already disconnected, ignore
              }
            })
            if (noiseNode) {
              try {
                noiseNode.disconnect()
              } catch (e) {
                // Already disconnected, ignore
              }
            }
          } catch (e) {
            console.warn("Error during cleanup:", e)
          }
        },
        (effectiveRelease + 0.2) * 1000,
      )
    } catch (e) {
      console.error("Error in stopPianoSound:", e)

      // Emergency cleanup - force stop everything
      try {
        gainNode.gain.setValueAtTime(0, now)
        oscillators.forEach((osc) => {
          try {
            osc.stop(now)
          } catch (e) {
            // Ignore
          }
        })
        if (noiseNode) {
          try {
            noiseNode.stop(now)
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.error("Emergency cleanup failed:", e)
      }
    }
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1 // Reduced noise volume
    }

    return buffer
  }
}

export default PianoSynthesizer
