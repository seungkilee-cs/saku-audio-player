import React, { useEffect, useRef } from "react";
import { IoMdVolumeHigh, IoMdVolumeOff, IoMdVolumeLow } from "react-icons/io";
import "../styles/VolumeControl.css";

const VolumeControl = ({ volume, onVolumeChange }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") {
        onVolumeChange(Math.min(volume + 0.1, 1));
      } else if (e.key === "ArrowDown") {
        onVolumeChange(Math.max(volume - 0.1, 0));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [volume, onVolumeChange]);

  const handleClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.right - rect.left;
    const clickX = e.clientX - rect.left;
    const newVolume = clickX / width;
    onVolumeChange(Math.max(0, Math.min(1, newVolume)));
  };

  return (
    <div className="volume-control" ref={containerRef} onClick={handleClick}>
      <div className="volume-bar">
        <div
          className="volume-fill"
          style={{ width: `${volume * 100}%` }}
        ></div>
        <div className="volume-100-mark"></div>
      </div>
      <div className="volume-percentage">{Math.round(volume * 100)}%</div>
      {volume === 0 ? (
        <IoMdVolumeOff size={25} />
      ) : volume < 0.5 ? (
        <IoMdVolumeLow size={25} />
      ) : (
        <IoMdVolumeHigh size={25} />
      )}
    </div>
  );
};

export default VolumeControl;
