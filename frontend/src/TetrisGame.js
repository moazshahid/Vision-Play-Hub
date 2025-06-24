import React, { useState, useRef } from 'react';
import './Game.css';

const TetrisGame = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);

  return (
    <div className='inter'>
      <div style={{ width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/tetris-bg.jpg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none' }}>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Tetris</h2>
            <ul>
              <li><strong>Start:</strong> Click the start button to begin.</li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ maxWidth: "40%" }}>
            <img src="static/images/pages/tetris-colour.jpg" alt="Tetris" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div style={{ maxWidth: "20%", display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5vh' }}>
            <button className="inter start-button" onClick={() => setShowGame(true)} style={{ backgroundColor: '#4CAF50', border: 'none', padding: '1em 1.5em', borderRadius: '1em', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5em', fontWeight: 600, color: "#fff" }}>Start Game</span>
              <img src="static/images/pages/play-1.svg" alt="Start Game" style={{ width: '2vw', height: 'auto' }} />
            </button>
          </div>
        </div>
      </div>
      <div style={{ width: "100%", minHeight: "95vh", display: showGame ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width="1280" height="720"></canvas>
      </div>
    </div>
  );
};

export default TetrisGame;