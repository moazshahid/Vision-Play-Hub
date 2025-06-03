import React, { useRef } from 'react';
import './Game.css';

const AirHockey = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  return (
    <div className='inter'>
      <div className='slider-container'>
        <div className='slide'>
          <div className="game-container inter">
            <canvas ref={canvasRef} style={{ width: '960px', height: '540px' }}></canvas>
            <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirHockey;