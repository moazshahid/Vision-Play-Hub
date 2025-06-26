import React, { useState, useEffect, useRef } from 'react';
import './Game.css';
import { submitScore } from './utils/api';

const TetrisGame = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const gameStatsRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const debugRef = useRef(null);
  const gameObjectRef = useRef(null);
  const gameStartedRef = useRef(false);
  const lastRenderTimeRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastFistDetectedRef = useRef(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;
    const audio = audioRef.current;

    gameOver.style.display = 'none';

    const initHandDetection = () => {
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.9,
        minTrackingConfidence: 0.9,
      });
      handsRef.current.onResults((results) =>
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore)
      );
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        });
        video.srcObject = stream;
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play();
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => await handsRef.current.send({ image: video }),
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start();
        console.log('Camera started successfully');
      } catch (error) {
        debug.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    const startGame = () => {
      if (!gameStartedRef.current) {
        startCamera()
          .then(() => {
            gameObjectRef.current = new GameLogic(canvas, gameStats);
            gameStartedRef.current = true;
            lastRenderTimeRef.current = performance.now();
            gameOver.style.display = 'none';
            audio.play().catch((error) => console.error('Audio playback error:', error.message));
            requestAnimationFrame(gameLoop);
          })
          .catch((error) => {
            alert('Camera access error: ' + error.message);
          });
      }
    };

    const playAgain = () => {
      if (cameraRef.current) cameraRef.current.stop();
      gameStartedRef.current = false;
      audio.pause();
      audio.currentTime = 0;
      startGame();
    };

    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver && !gameObjectRef.current.gameWon) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        requestAnimationFrame(gameLoop);
      }
    };

    const isFistGesture = (landmarks) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const wrist = landmarks[0];

      const dist = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      const thumbToWrist = dist(thumbTip, wrist);
      const indexToWrist = dist(indexTip, wrist);
      const middleToWrist = dist(middleTip, wrist);
      const ringToWrist = dist(ringTip, wrist);
      const pinkyToWrist = dist(pinkyTip, wrist);

      return (
        indexToWrist < thumbToWrist &&
        middleToWrist < thumbToWrist &&
        ringToWrist < thumbToWrist &&
        pinkyToWrist < thumbToWrist
      );
    };

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      if (started && gameObj && !gameObj.gameOver && !gameObj.gameWon) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const indexFinger = landmarks[8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const isFist = isFistGesture(landmarks);
          const wasFist = lastFistDetectedRef.current;
          lastFistDetectedRef.current = isFist;
          gameObj.updateFingerPosition(fingerX, fingerY, isFist && !wasFist);
          gameObj.render(ctx);
        } else {
          lastFistDetectedRef.current = false;
          gameObj.render(ctx);
        }
      }
      if (gameObj && (gameObj.gameOver || gameObj.gameWon)) {
        drawGameOverOnCanvas(ctx, gameObj.score, gameObj.linesCleared, over, score, gameObj.gameWon);
      }
      ctx.restore();
    };

    const drawGameOverOnCanvas = (ctx, score, linesCleared, over, finalScore, gameWon) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = gameWon ? '#00FF00' : '#FF0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameWon ? 'YOU WIN!' : 'GAME OVER', 640, 300);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`Score: ${score} Lines: ${linesCleared}`, 640, 400);
      finalScore.textContent = score;
      over.style.display = 'block';
      if (!gameObjectRef.current.scoreSubmitted) {
        submitScore('Tetris Game', score)
          .then(() => {
            gameObjectRef.current.scoreSubmitted = true;
          })
          .catch((error) => {
            console.error('Failed to submit score:', error.message);
          });
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);

    initHandDetection();

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      gameStartedRef.current = false;
      audio.pause();
    };
  }, []);

  class GameLogic {
    constructor(ctx, stats) {
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
      this.nextPiece = this.newPiece();
      this.ctx = ctx;
      this.stats = stats;
      this.lastDropTime = 0;
      this.dropSpeed = 800;
      this.score = 0;
      this.linesCleared = 0;
      this.gameOver = false;
      this.gameWon = false;
      this.scoreSubmitted = false;
      this.linesToWin = 10;
      this.moveCooldown = 0;
      this.rotationCooldown = 0;
      this.stats.textContent = `Score: ${this.score} Lines: ${this.linesCleared}`;
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

    mergePiece() {
      for (let py = 0; py < this.currentPiece.length; py++) {
        for (let px = 0; px < this.currentPiece[0].length; px++) {
          if (this.currentPiece[py][px]) {
            const gridY = this.pieceY + py;
            if (gridY < 0) {
              this.gameOver = true;
              return;
            }
            if (gridY < this.gridHeight) {
              this.grid[gridY][this.pieceX + px] = 1;
            }
          }
        }
        this.clearLines();
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.newPiece();
        this.pieceX = Math.floor(this.gridWidth / 2) - Math.floor(this.currentPiece[0].length / 2);
        this.pieceY = 0;
        if (!this.isValidMove(this.currentPiece, this.pieceX, this.pieceY)) {
          this.gameOver = true;
        }
      }
    }

    clearLines() {
      let lines = 0;
      for (let y = this.gridHeight - 1; y >= 0; y--) {
        if (this.grid[y].every(cell => cell)) {
          this.grid.splice(y, 1);
          this.grid.unshift(Array(this.gridWidth).fill(0));
          lines++;
        }
      }
      if (lines > 0) {
        this.linesCleared += lines;
        this.score += lines * 100 * (lines > 1 ? lines : 1);
        this.stats.textContent = `Score: ${this.score} Lines: ${this.linesCleared}`;
        if (this.linesCleared >= this.linesToWin) {
          this.gameWon = true;
        }
      }
    }

    rotatePiece() {
      const newPiece = Array(this.currentPiece[0].length).fill().map(() => []);
      for (let y = 0; y < this.currentPiece.length; y++) {
        for (let x = 0; x < this.currentPiece[0].length; x++) {
          newPiece[x][this.currentPiece.length - 1 - y] = this.currentPiece[y][x];
        }
      }
      let newX = this.pieceX;
      if (newX + newPiece[0].length > this.gridWidth) {
        newX = this.gridWidth - newPiece[0].length;
      } else if (newX < 0) {
        newX = 0;
      }
      if (this.isValidMove(newPiece, newX, this.pieceY)) {
        this.currentPiece = newPiece;
        this.pieceX = newX;
      }
    }

    updateFingerPosition(fingerX, fingerY, triggerRotate) {
      const gridCenter = 640;
      const gridWidthPixels = this.gridWidth * this.blockSize;
      const normalizedX = (fingerX - (gridCenter - gridWidthPixels / 2)) / this.blockSize;
      const targetX = Math.max(0, Math.min(this.gridWidth - this.currentPiece[0].length, Math.round(normalizedX)));
      if (this.moveCooldown <= 0 && targetX !== this.pieceX && this.isValidMove(this.currentPiece, targetX, this.pieceY)) {
        this.pieceX = targetX;
        this.moveCooldown = 30;
      }
      if (triggerRotate && this.rotationCooldown <= 0) {
        this.rotatePiece();
        this.rotationCooldown = 500;
      }
      this.moveCooldown = Math.max(0, this.moveCooldown - 16);
      this.rotationCooldown = Math.max(0, this.rotationCooldown - 16);
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
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(900, 100, 160, 160);
      ctx.strokeStyle = '#1E90FF';
      ctx.strokeRect(900, 100, 160, 160);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Next Block', 980, 80);
      const nextShapeIndex = this.shapes.findIndex(shape => shape.every((row, y) => row.every((cell, x) => cell === this.nextPiece[y]?.[x]))) || 0;
      ctx.fillStyle = this.colors[nextShapeIndex] || 'white';
      const maxSize = Math.max(this.nextPiece.length, this.nextPiece[0].length);
      const scale = 100 / maxSize;
      const offsetX = 900 + (160 - this.nextPiece[0].length * scale) / 2;
      const offsetY = 100 + (160 - this.nextPiece.length * scale) / 2;
      for (let py = 0; py < this.nextPiece.length; py++) {
        for (let px = 0; px < this.nextPiece[0].length; px++) {
          if (this.nextPiece[py][px]) {
            ctx.fillRect(offsetX + px * scale, offsetY + py * scale, scale - 2, scale - 2);
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
              <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
              <li><strong>Move the piece:</strong> Move your index finger left or right to shift the piece.</li>
              <li><strong>Rotate the piece:</strong> Close your hand into a fist to rotate.</li>
              <li><strong>Fast drop:</strong> Lower your finger below your wrist to drop faster.</li>
              <li><strong>Clear lines:</strong> Complete rows to score points (100 per line).</li>
              <li><strong>Win/Lose:</strong> Clear 10 lines to win; lose if blocks reach the top.</li>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="controls" style={{ maxWidth: "70vw", display: 'flex', flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: '20px' }}>
            <button id="start-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/play.svg" alt="Play" style={{ width: '40px', height: '40px' }} />
            </button>
            <button id="test-camera-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/testing.svg" alt="Test Camera" style={{ width: '35px', height: '35px' }} />
            </button>
          </div>
        </div>
        <div ref={debugRef} className="debug-box" style={{ backgroundColor: "transparent" }}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} width="1280" height="720"></canvas>
          <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
          <audio ref={audioRef} src="static/audio/tetris-theme.mp3" loop />
          <div ref={gameStatsRef} className="game-stats">Score: 0 Lines: 0</div>
          <div ref={gameOverRef} className="game-over">
            <h2>{gameObjectRef.current?.gameWon ? 'You Win!' : 'Game Over!'}</h2>
            <p>Your Score: <span ref={finalScoreRef}>0</span></p>
            <button id="play-again-btn">Play Again</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;