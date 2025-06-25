import React, { useState, useEffect, useRef } from 'react';
import './Game.css';

const TetrisGame = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);
  const gameObjectRef = useRef(null);
  const gameStartedRef = useRef(false);
  const lastRenderTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');

    const startGame = () => {
      if (!gameStartedRef.current) {
        gameObjectRef.current = new GameLogic(canvas);
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        requestAnimationFrame(gameLoop);
      }
    };

    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        gameObjectRef.current.render(canvas);
        requestAnimationFrame(gameLoop);
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);

    return () => {
      gameStartedRef.current = false;
    };
  }, []);

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
      this.lastDropTime = 0;
      this.dropSpeed = 800;
    }

    newPiece() {
      const index = Math.floor(Math.random() * this.shapes.length);
      return this.shapes[index].map(row => [...row]);
    }

    isValidMove(piece, x, y) {
      for (let py = 0; py < piece.length; py++) {
        for (let px = 0; px < piece[0].length; px++) {
          if (piece[py][px]) {
            const gridX = x + px;
            const gridY = y + py;
            if (
              gridX < 0 || gridX >= this.gridWidth ||
              gridY >= this.gridHeight ||
              (gridY >= 0 && this.grid[gridY][gridX])
            ) {
              return false;
            }
          }
        }
      }
      return true;
    }

    updateWithoutRender(deltaTime) {
      this.lastDropTime += deltaTime;
      if (this.lastDropTime >= this.dropSpeed) {
        if (this.isValidMove(this.currentPiece, this.pieceX, this.pieceY + 1)) {
          this.pieceY++;
        } else {
          this.mergePiece();
        }
        this.lastDropTime = 0;
      }
    }

    mergePiece() {
      for (let py = 0; py < this.currentPiece.length; py++) {
        for (let px = 0; px < this.currentPiece[0].length; px++) {
          if (this.currentPiece[py][px]) {
            const gridY = this.pieceY + py;
            if (gridY < 0) return;
            if (gridY < this.gridHeight) {
              this.grid[gridY][this.pieceX + px] = 1;
            }
          }
        }
        this.currentPiece = this.newPiece();
        this.pieceX = Math.floor(this.gridWidth / 2) - Math.floor(this.currentPiece[0].length / 2);
        this.pieceY = 0;
      }
    }

    render(ctx) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(450, 100, this.gridWidth * this.blockSize + 10, this.gridHeight * this.blockSize + 10);
      ctx.strokeStyle = '#1E90FF';
      ctx.lineWidth = 5;
      ctx.strokeRect(450, 100, this.gridWidth * this.blockSize + 10, this.gridHeight * this.blockSize + 10);
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          if (this.grid[y][x]) {
            ctx.fillStyle = 'gray';
            ctx.fillRect(450 + 5 + x * this.blockSize, 100 + 5 + y * this.blockSize, this.blockSize - 2, this.blockSize - 2);
          }
        }
      }
      const shapeIndex = this.shapes.findIndex(shape => shape.every((row, y) => row.every((cell, x) => cell === this.currentPiece[y]?.[x]))) || 0;
      ctx.fillStyle = this.colors[shapeIndex] || 'white';
      for (let py = 0; py < this.currentPiece.length; py++) {
        for (let px = 0; px < this.currentPiece[0].length; px++) {
          if (this.currentPiece[py][px]) {
            ctx.fillRect(450 + 5 + (this.pieceX + px) * this.blockSize, 100 + 5 + (this.pieceY + py) * this.blockSize, this.blockSize - 2, this.blockSize - 2);
          }
        }
      }
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