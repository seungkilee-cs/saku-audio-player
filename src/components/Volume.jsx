import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';

const Volume = ({
  volume, 
  onVolumeIconClick
}) => (
  <div className="volume">
    <button
      type="button"
      className="pause"
      onClick={() => onVolumeIconClick(false)}
      aria-label="Pause"
    >

    </button>
  </div>
);

export default Volume;