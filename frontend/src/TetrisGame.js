import React, { useState, useRef } from 'react';
import './Game.css';

const TetrisGame = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);

  class GameLogic {
    constructor(ctx) {
      this.gridWidth = 10;
      this.gridHeight = 20;
      this.blockSize = 30;
      this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(0));
      this.shapes = [
        [[1, 1, 1, 1]], // I
        [[1, 1], [1, 1]], // O
        [[1, 1, 1], [0, 1, 0]], // T
        [[1, 1, 1], [1, 0, 0]], // L
        [[1, 1, 1], [0, 0, 1]], // J
        [[1, 1, 0], [0, 1, 1]], // S
        [[0, 1, 1], [1, 1, 0]], // Z
      ];
      this.colors = ['cyan', 'yellow', 'purple', 'orange', 'blue', 'green', 'red'];
      this.currentPiece = this.newPiece();
      this.pieceX = Math.floor(this.gridWidth / 2) - Math.floor(this.currentPiece[0].length / 2);
      this.pieceY = 0;
      this.ctx = ctx;
    }

    newPiece() {
      const index = Math.floor(Math.random() * this.shapes.length);
      return this.shapes[index].map(row => [...row]);
    }
  }

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