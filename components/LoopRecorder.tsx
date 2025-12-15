"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface LoopRecorderProps {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

// Define some sample tracks (you can replace these with your own)
const SAMPLE_TRACKS = [
  {
    id: 1,
    title: "Ambient Chill",
    artist: "JR's Studio",
    duration: 120, // 2 minutes
    url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
    color: "from-blue-600 to-indigo-600",
    isSample: true
  },
  {
    id: 2,
    title: "Synth Waves",
    artist: "Web MIDI",
    duration: 90, // 1.5 minutes
    url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3",
    color: "from-purple-600 to-pink-600",
    isSample: true
  }
]

interface UploadedTrack {
  id: string
  title: string
  artist: string
  duration: number
  color: string
  isSample: false
  file: File
  url: string
}

const LoopRecorder: React.FC<LoopRecorderProps> = ({ audioContext, masterGain }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  // MP3 Player states
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isMp3Playing, setIsMp3Playing] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedTracks, setUploadedTracks] = useState<UploadedTrack[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  
  // MP3 Player refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initialize audio element
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
      })
      
      audioRef.current.addEventListener('ended', () => {
        setIsMp3Playing(false)
        setCurrentTime(0)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      })
    }

    return () => {
      // Cleanup
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      stopLoop()
      stopMp3()
      
      // Clean up object URLs
      uploadedTracks.forEach(track => {
        if (!track.isSample && track.url.startsWith('blob:')) {
          URL.revokeObjectURL(track.url)
        }
      })
    }
  }, [])

  // MP3 Player functions
  const loadTrack = async (trackIndex: number) => {
    if (!audioRef.current) return
    
    setIsLoading(true)
    stopMp3()
    setCurrentTrack(trackIndex)
    setCurrentTime(0)
    
    try {
      const track = getAllTracks()[trackIndex]
      audioRef.current.src = track.url
      audioRef.current.load()
      setIsLoading(false)
    } catch (error) {
      console.error("Error loading track:", error)
      setIsLoading(false)
    }
  }

  const getAllTracks = () => {
    return [...SAMPLE_TRACKS, ...uploadedTracks]
  }

  const toggleMp3Play = () => {
    if (!audioRef.current || getAllTracks().length === 0) return
    
    if (isMp3Playing) {
      stopMp3()
    } else {
      playMp3()
    }
  }

  const playMp3 = () => {
    if (!audioRef.current) return
    
    try {
      audioRef.current.play()
      setIsMp3Playing(true)
      
      // Start progress updates
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
        }
      }, 100)
    } catch (error) {
      console.error("Error playing MP3:", error)
    }
  }

  const stopMp3 = () => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    setIsMp3Playing(false)
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  const seekMp3 = (time: number) => {
    if (!audioRef.current) return
    
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const nextTrack = () => {
    const allTracks = getAllTracks()
    if (allTracks.length === 0) return
    
    const next = (currentTrack + 1) % allTracks.length
    loadTrack(next)
    if (isMp3Playing) {
      setTimeout(playMp3, 100)
    }
  }

  const prevTrack = () => {
    const allTracks = getAllTracks()
    if (allTracks.length === 0) return
    
    const prev = (currentTrack - 1 + allTracks.length) % allTracks.length
    loadTrack(prev)
    if (isMp3Playing) {
      setTimeout(playMp3, 100)
    }
  }

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  // File upload functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    
    try {
      const file = files[0]
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file (MP3, WAV, etc.)')
        return
      }
      
      // Get audio duration
      const audio = new Audio()
      audio.src = URL.createObjectURL(file)
      
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(null)
        })
      })
      
      const duration = audio.duration
      URL.revokeObjectURL(audio.src)
      
      // Create object URL for playback
      const objectUrl = URL.createObjectURL(file)
      
      const newTrack: UploadedTrack = {
        id: `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        artist: "Your Upload",
        duration: Math.floor(duration),
        color: getRandomGradient(),
        isSample: false,
        file: file,
        url: objectUrl
      }
      
      setUploadedTracks(prev => [...prev, newTrack])
      
      // Auto-select and play the uploaded track
      const allTracks = getAllTracks()
      const newTrackIndex = allTracks.length - 1
      loadTrack(newTrackIndex)
      
    } catch (error) {
      console.error("Error uploading file:", error)
      alert('Error uploading file. Please try again.')
    } finally {
      setIsUploading(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeUploadedTrack = (trackId: string) => {
    const track = uploadedTracks.find(t => t.id === trackId)
    if (track && !track.isSample && track.url.startsWith('blob:')) {
      URL.revokeObjectURL(track.url)
    }
    
    const newTracks = uploadedTracks.filter(t => t.id !== trackId)
    setUploadedTracks(newTracks)
    
    // If we removed the current track, load the first track
    const allTracks = getAllTracks()
    if (allTracks.length > 0 && currentTrack >= allTracks.length) {
      loadTrack(0)
    } else if (allTracks.length === 0) {
      stopMp3()
      setCurrentTime(0)
    }
  }

  const getRandomGradient = () => {
    const gradients = [
      "from-emerald-600 to-teal-600",
      "from-rose-600 to-pink-600",
      "from-amber-600 to-orange-600",
      "from-violet-600 to-purple-600",
      "from-cyan-600 to-blue-600",
      "from-lime-600 to-green-600"
    ]
    return gradients[Math.floor(Math.random() * gradients.length)]
  }

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Original Loop Recorder functions
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

  // Load first track on mount
  useEffect(() => {
    if (SAMPLE_TRACKS.length > 0) {
      loadTrack(0)
    }
  }, [])

  const allTracks = getAllTracks()
  const currentTrackData = allTracks[currentTrack] || null

  return (
    <Card className="bg-gradient-to-br from-zinc-900/95 to-black border-zinc-800 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-zinc-800">
        <CardTitle className="text-white text-xl flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          LOOP RECORDER & MP3 PLAYER
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Loop Recorder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-zinc-300 text-sm">
                {isRecording ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                    Recording: {recordingTime.toFixed(1)}s / 10s
                  </span>
                ) : recordedBuffer ? (
                  <span className="text-green-400">Loop ready ({recordedBuffer.duration.toFixed(1)}s)</span>
                ) : (
                  <span>No loop recording</span>
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
                  Record Loop (10s max)
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

            <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
              <p className="text-zinc-300 text-xs">
                Record up to 10 seconds of audio and play it back in a continuous loop. 
                Mix with the piano or drum machine while playing.
              </p>
            </div>
          </div>

          {/* Right side - MP3 Player */}
          <div className="space-y-4">
            {/* Track Selection and Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">TRACK SELECT</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-xs">
                    {allTracks.length > 0 ? `${currentTrack + 1} of ${allTracks.length}` : 'No tracks'}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="audio/*"
                    className="hidden"
                    id="mp3-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs h-7 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin">⟳</span>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload MP3
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {allTracks.map((track, index) => (
                  <div key={track.id} className="relative group">
                    <button
                      onClick={() => loadTrack(index)}
                      className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                        currentTrack === index
                          ? `bg-gradient-to-br ${track.color} border-transparent text-white shadow-lg`
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1 truncate">{track.title}</div>
                      <div className="text-xs opacity-75 truncate">
                        {track.artist} {track.isSample ? '' : '(Uploaded)'}
                      </div>
                    </button>
                    
                    {/* Remove button for uploaded tracks */}
                    {!track.isSample && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeUploadedTrack(track.id)
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                        title="Remove track"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Empty state */}
                {allTracks.length === 0 && (
                  <div className="col-span-2 bg-zinc-800/30 border border-zinc-700/50 border-dashed p-4 rounded-lg text-center">
                    <p className="text-zinc-400 text-sm mb-2">No tracks loaded</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                    >
                      Upload your first MP3
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Current Track Info */}
            {currentTrackData && (
              <div className={`p-4 rounded-lg bg-gradient-to-br ${currentTrackData.color}/20 border ${currentTrackData.color}/30`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{currentTrackData.title}</div>
                    <div className="text-zinc-300 text-sm truncate">
                      {currentTrackData.artist} 
                      {!currentTrackData.isSample && <span className="text-amber-400 ml-1">• Uploaded</span>}
                    </div>
                  </div>
                  {isLoading && (
                    <div className="text-xs text-amber-400 animate-pulse ml-2">Loading...</div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(currentTrackData.duration)}</span>
                  </div>
                  <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-white to-zinc-300"
                      style={{ width: `${(currentTime / currentTrackData.duration) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={currentTrackData.duration}
                      value={currentTime}
                      onChange={(e) => seekMp3(parseFloat(e.target.value))}
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevTrack}
                      className="text-zinc-300 hover:text-white"
                      disabled={allTracks.length <= 1}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    
                    <Button
                      onClick={toggleMp3Play}
                      className={`${
                        isMp3Playing 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white px-6`}
                      disabled={isLoading || allTracks.length === 0}
                    >
                      {isMp3Playing ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextTrack}
                      className="text-zinc-300 hover:text-white"
                      disabled={allTracks.length <= 1}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    <div className="flex items-center gap-1 w-24">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => updateVolume(parseFloat(e.target.value))}
                        className="w-full accent-white"
                      />
                      <span className="text-xs text-zinc-400 w-8 text-right">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Tracks Info */}
            {uploadedTracks.length > 0 && (
              <div className="bg-zinc-800/30 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300 text-sm">Uploaded Tracks</span>
                  <span className="text-xs text-amber-400">{uploadedTracks.length} file(s)</span>
                </div>
                <div className="text-zinc-400 text-xs">
                  Uploaded tracks stay in memory until you refresh the page.
                </div>
              </div>
            )}

            {/* Player Status */}
            <div className="bg-zinc-800/30 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-sm">Player Status</span>
                <div className={`px-2 py-1 rounded text-xs ${
                  isMp3Playing ? 'bg-green-900/50 text-green-300' : 
                  isLoading ? 'bg-amber-900/50 text-amber-300' : 
                  allTracks.length === 0 ? 'bg-zinc-900/50 text-zinc-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  {isLoading ? 'LOADING' : 
                   allTracks.length === 0 ? 'NO TRACKS' :
                   isMp3Playing ? 'PLAYING' : 'STOPPED'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LoopRecorder
