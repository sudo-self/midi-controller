"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface LoopRecorderProps {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

/* =========================
    SAMPLE TRACKS
   ========================= */

const SAMPLE_TRACKS = [
  {
    id: 1,
    title: "KING OF EVERYTHING",
    artist: "Wiz K.",
    duration: 0,
    url: "https://raw.githubusercontent.com/sudo-self/mp3-web/4e59b2d5673c433d18edfc2522c7279fa3b97192/Wiz%20Khalifa%20-%20King%20of%20Everything%20%5BOfficial%20Video%5D%20%5B8d0cm_hcQes%5D.mp3",
    color: "from-blue-600 to-indigo-600",
    isSample: true
  },
  {
    id: 2,
    title: "ENEMIES",
    artist: "Azi Azi Gibson",
    duration: 0,
    url: "https://raw.githubusercontent.com/sudo-self/mp3-web/4e59b2d5673c433d18edfc2522c7279fa3b97192/Azizi%20Gibson%20-%20Enemies%20(Prod.%20KAMANDI)%20%5BvUkMSXteHNY%5D.mp3",
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

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getAllTracks = () => [...SAMPLE_TRACKS, ...uploadedTracks]

  /* =========================
     AUDIO INIT
     ========================= */

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume

    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current?.currentTime ?? 0)
    }

    audioRef.current.onended = () => {
      setIsMp3Playing(false)
      setCurrentTime(0)
    }

    audioRef.current.onloadedmetadata = () => {
      const tracks = getAllTracks()
      const track = tracks[currentTrack]
      if (track) track.duration = audioRef.current?.duration ?? 0
    }

    return () => {
      uploadedTracks.forEach(t => {
        if (t.url.startsWith("blob:")) URL.revokeObjectURL(t.url)
      })
    }
  }, [])

  /* =========================
     MP3 CONTROLS
     ========================= */

  const loadTrack = (index: number) => {
    if (!audioRef.current) return
    const tracks = getAllTracks()
    if (!tracks[index]) return

    setIsLoading(true)
    setIsMp3Playing(false)
    setCurrentTrack(index)
    setCurrentTime(0)

    audioRef.current.src = tracks[index].url
    audioRef.current.load()

    audioRef.current.oncanplay = () => setIsLoading(false)
  }

  const playMp3 = async () => {
    if (!audioRef.current) return
    await audioRef.current.play()
    setIsMp3Playing(true)
  }

  const stopMp3 = () => {
    audioRef.current?.pause()
    setIsMp3Playing(false)
  }

  const seekMp3 = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time
  }

  const nextTrack = () => {
    const tracks = getAllTracks()
    if (!tracks.length) return
    loadTrack((currentTrack + 1) % tracks.length)
    if (isMp3Playing) setTimeout(playMp3, 100)
  }

  const prevTrack = () => {
    const tracks = getAllTracks()
    if (!tracks.length) return
    loadTrack((currentTrack - 1 + tracks.length) % tracks.length)
    if (isMp3Playing) setTimeout(playMp3, 100)
  }

  const updateVolume = (v: number) => {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  /* =========================
     FILE UPLOAD
     ========================= */

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("audio/")) return

    setIsUploading(true)

    const url = URL.createObjectURL(file)
    const temp = new Audio(url)
    await new Promise(res => (temp.onloadedmetadata = res))

    setUploadedTracks(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Your Upload",
        duration: temp.duration,
        color: getRandomGradient(),
        isSample: false,
        file,
        url
      }
    ])

    loadTrack(getAllTracks().length)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const getRandomGradient = () => {
    const g = [
      "from-emerald-600 to-teal-600",
      "from-rose-600 to-pink-600",
      "from-amber-600 to-orange-600",
      "from-violet-600 to-purple-600",
      "from-cyan-600 to-blue-600"
    ]
    return g[Math.floor(Math.random() * g.length)]
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  useEffect(() => {
    if (SAMPLE_TRACKS.length) loadTrack(0)
  }, [])

  const tracks = getAllTracks()
  const track = tracks[currentTrack]
  const duration = track?.duration || 1

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">MP3 PLAYER + LOOP RECORDER</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="text-white">
          {track?.title} — {track?.artist}
        </div>

        <div className="flex justify-between text-xs text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={e => seekMp3(+e.target.value)}
          className="w-full"
        />

        <div className="flex gap-2">
          <Button onClick={isMp3Playing ? stopMp3 : playMp3}>
            {isMp3Playing ? "Pause" : "Play"}
          </Button>

          <Button onClick={prevTrack}>Prev</Button>
          <Button onClick={nextTrack}>Next</Button>

          <Button onClick={() => fileInputRef.current?.click()}>
            Upload MP3
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            hidden
          />
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          onChange={e => updateVolume(+e.target.value)}
        />
      </CardContent>
    </Card>
  )
}

export default LoopRecorder

