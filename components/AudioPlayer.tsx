"use client";

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

interface AudioPlayerProps {
  audioBase64: string;
}

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ audioBase64 }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      play: () => {
        const audio = audioRef.current;
        if (audio) {
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      },
      pause: () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          setIsPlaying(false);
        }
      },
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleLoadedMetadata = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("ended", handleEnded);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("ended", handleEnded);
      };
    }, [audioBase64]);

    const togglePlay = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, [isPlaying]);

    const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const audioSrc = `data:audio/wav;base64,${audioBase64}`;

    return (
      <div className="flex items-center gap-3">
        <audio ref={audioRef} src={audioSrc} preload="auto" />
        <button
          onClick={togglePlay}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
            isPlaying
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800"
          }`}
        >
          {isPlaying ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          <div className="relative h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
            {isPlaying && (
              <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }
);

export default AudioPlayer;
