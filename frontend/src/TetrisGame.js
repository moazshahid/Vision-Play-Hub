import React, { useRef } from 'react';
import './Game.css';

const TetrisGame = () => {
  const canvasRef = useRef(null);

  return (
    <div className='inter'>
      <div style={{ width: "100%", minHeight: "95vh", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <button id="start-btn">Start Game</button>
        <canvas ref={canvasRef} width="1280" height="720"></canvas>
      </div>
    </div>
  );
};

export default TetrisGame;