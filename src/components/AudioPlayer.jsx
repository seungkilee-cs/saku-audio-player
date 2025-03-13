import React, { useState, useRef, useEffect } from "react";

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () =>
      setCurrentTime(audio.currentTime),
    );
    return () => {
      audio.removeEventListener("loadedmetadata", () =>
        setDuration(audio.duration),
      );
      audio.removeEventListener("timeupdate", () =>
        setCurrentTime(audio.currentTime),
      );
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const handleSkipBack = () => {
    audioRef.current.currentTime = Math.max(
      audioRef.current.currentTime - 10,
      0,
    );
  };

  const handleSkipForward = () => {
    audioRef.current.currentTime = Math.min(
      audioRef.current.currentTime + 10,
      duration,
    );
  };

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} />
      <button onClick={handlePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
      <button onClick={handleStop}>Stop</button>
      <button onClick={handleSkipBack}>-10s</button>
      <button onClick={handleSkipForward}>+10s</button>
      <div>
        Current Time: {currentTime.toFixed(2)} / {duration.toFixed(2)}
      </div>
    </div>
  );
};

export default AudioPlayer;
