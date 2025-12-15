"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface LoopRecorderProps {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

const LoopRecorder: React.FC<LoopRecorderProps> = ({ audioContext, masterGain }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      stopLoop()
    }
  }, [])

  const startRecording = async () => {
    if (!audioContext || !masterGain) return

    try {
      // Create a destination node to capture audio
      const destination = audioContext.createMediaStreamDestination()
      destinationRef.current = destination

      // Connect master gain to destination (this captures all audio)
      masterGain.connect(destination)

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(destination.stream)
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
        await processRecording(blob)

        // Disconnect after recording
        if (destinationRef.current) {
          masterGain.disconnect(destinationRef.current)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const startTime = Date.now()
      recordingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setRecordingTime(elapsed)

        // Auto-stop at 10 seconds
        if (elapsed >= 10) {
          stopRecording()
        }
      }, 100)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    setIsRecording(false)
  }

  const processRecording = async (blob: Blob) => {
    if (!audioContext) return

    try {
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      setRecordedBuffer(audioBuffer)
    } catch (error) {
      console.error("Error processing recording:", error)
    }
  }

  const playLoop = () => {
    if (!audioContext || !masterGain || !recordedBuffer) return

    // Stop any existing playback
    stopLoop()

    try {
      const source = audioContext.createBufferSource()
      source.buffer = recordedBuffer
      source.loop = true
      source.connect(masterGain)
      source.start(0)

      sourceNodeRef.current = source
      setIsPlaying(true)
    } catch (error) {
      console.error("Error playing loop:", error)
    }
  }

  const stopLoop = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
      } catch (error) {
        // Already stopped
      }
      sourceNodeRef.current = null
    }
    setIsPlaying(false)
  }

  const clearRecording = () => {
    stopLoop()
    setRecordedBuffer(null)
    setRecordingTime(0)
    recordedChunksRef.current = []
  }

  return (
    <Card className="bg-zinc-900 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white">Loop Recorder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-zinc-400 text-sm">
              {isRecording ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  Recording: {recordingTime.toFixed(1)}s / 10s
                </span>
              ) : recordedBuffer ? (
                <span className="text-green-400">Loop ready ({recordedBuffer.duration.toFixed(1)}s)</span>
              ) : (
                <span>No recording</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isRecording && !recordedBuffer && (
              <Button
                onClick={startRecording}
                disabled={!audioContext}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Record (10s max)
              </Button>
            )}

            {isRecording && (
              <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white">
                Stop Recording
              </Button>
            )}

            {recordedBuffer && !isRecording && (
              <>
                {!isPlaying ? (
                  <Button onClick={playLoop} className="bg-green-600 hover:bg-green-700 text-white">
                    Play Loop
                  </Button>
                ) : (
                  <Button onClick={stopLoop} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    Stop Loop
                  </Button>
                )}

                <Button
                  onClick={clearRecording}
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                >
                  Clear
                </Button>

                <Button
                  onClick={startRecording}
                  variant="outline"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                >
                  Record New
                </Button>
              </>
            )}
          </div>

          <div className="bg-zinc-800 p-3 rounded-lg">
            <p className="text-zinc-400 text-xs">
              Record up to 10 seconds of audio and play it back in a continuous loop. You can play over the loop with
              the piano keyboard while it's playing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LoopRecorder
