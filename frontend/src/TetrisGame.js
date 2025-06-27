import React, { useState, useEffect, useRef } from 'react';
import './Game.css';
import { submitScore } from './utils/api';

const TetrisGame = () => {
  const [showGame, setShowGame] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gameStatsRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const debugRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const gameObjectRef = useRef(null);
  const gameStartedRef = useRef(false);
  const lastRenderTimeRef = useRef(null);
  const bgMusicRef = useRef(null);
  const lastFistDetectedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;

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
            bgMusicRef.current = new Audio('/static/sounds/background.mp3');
            bgMusicRef.current.volume = 0.3;
            bgMusicRef.current.loop = true;
            bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
            gameStartedRef.current = true;
            lastRenderTimeRef.current = performance.now();
            gameOver.style.display = 'none';
            requestAnimationFrame(gameLoop);
          })
          .catch((error) => {
            alert('Camera access error: ' + error.message);
          });
      }
    };

    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver && !gameObjectRef.current.gameWon) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        requestAnimationFrame(gameLoop);
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
      if (bgMusicRef.current) bgMusicRef.current.pause();
      gameObjectRef.current = new GameLogic(canvas, gameStats);
      bgMusicRef.current = new Audio('/static/sounds/background.mp3');
      bgMusicRef.current.volume = 0.3;
      bgMusicRef.current.loop = true;
      bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      if (bgMusicRef.current) bgMusicRef.current.pause();
      gameObjectRef.current = new GameLogic(canvas, gameStats);
      bgMusicRef.current = new Audio('/static/sounds/background.mp3');
      bgMusicRef.current.volume = 0.3;
      bgMusicRef.current.loop = true;
      bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (bgMusicRef.current) bgMusicRef.current.pause();
        gameObjectRef.current = new GameLogic(canvas, gameStats);
        bgMusicRef.current = new Audio('/static/sounds/background.mp3');
        bgMusicRef.current.volume = 0.3;
        bgMusicRef.current.loop = true;
        bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
        gameOver.style.display = 'none';
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        requestAnimationFrame(gameLoop);
      }
      if (e.key === 'q' || e.key === 'Q') {
        if (cameraRef.current) cameraRef.current.stop();
        if (bgMusicRef.current) bgMusicRef.current.pause();
        gameStartedRef.current = false;
      }
    });

    initHandDetection();

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

      const fingersCurled = (
        indexToWrist < thumbToWrist &&
        middleToWrist < thumbToWrist &&
        ringToWrist < thumbToWrist &&
        pinkyToWrist < thumbToWrist
      );

      return fingersCurled;
    };

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);

      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver && !gameObj.gameWon) {
          const landmarks = results.multiHandLandmarks[0];
          const indexFinger = landmarks[8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);

          const isFist = isFistGesture(landmarks);
          const wasFist = lastFistDetectedRef.current;
          lastFistDetectedRef.current = isFist;

          gameObj.updateFingerPosition(fingerX, fingerY, isFist && !wasFist);
        } else {
          lastFistDetectedRef.current = false;
        }
        gameObj.render(ctx);
        if (gameStartedRef.current && !gameObj.gameOver && !gameObj.gameWon) {
          requestAnimationFrame(gameLoop);
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
      
      if (!gameWon && !gameObjectRef.current.gameOverSoundPlayed) {
        gameObjectRef.current.gameOverSoundPlayed = true;
        try {
          const gameOverSound = new Audio('/static/sounds/game-over.mp3');
          gameOverSound.volume = 0.6;
          gameOverSound.play().catch((e) => console.log('Error playing game over sound:', e));
        } catch (e) {
          console.log('Could not load or play game over sound:', e);
        }
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`Score: ${score} Lines: ${linesCleared}`, 640, 400);
      ctx.fillStyle = '#1E90FF';
      ctx.font = '40px Arial';
      ctx.fillText('Press "R" to Restart', 640, 500);
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
        this.score = 0;
        this.linesCleared = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.ctx = ctx;
        this.stats = stats;
        this.moveCooldown = 0;
        this.rotationCooldown = 0;
        this.dropSpeed = 800;
        this.lastDropTime = 0;
        this.scoreSubmitted = false;
        this.linesToWin = 10;
        this.lastFingerX = null;
        this.fastDropActive = false;
        this.fastDropDebounce = 0;
        this.backgroundImage = new Image();
        this.backgroundImage.src = '/static/images/bg.png';
        this.backgroundImageLoaded = false;
        this.backgroundImage.onload = () => {
          this.backgroundImageLoaded = true;
        };
        this.gameOverSoundPlayed = false;
      }

      newPiece() {
        const index = Math.floor(Math.random() * this.shapes.length);
        return this.shapes[index].map(row => [...row]);
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
        try {
          const placeSound = new Audio('/static/sounds/place-block.mp3');
          placeSound.volume = 1.0;
          placeSound.play().catch((e) => console.log('Error playing place sound:', e));
        } catch (e) {
          console.log('Could not load or play place sound:', e);
        }
        for (let py = 0; py < this.currentPiece.length; py++) {
          for (let px = 0; px < this.currentPiece[0].length; px++) {
            if (this.currentPiece[py][px]) {
              const gridY = this.pieceY + py;
              const gridX = this.pieceX + px;
              if (gridY < 0) {
                this.gameOver = true;
                return;
              }
              if (gridY < this.gridHeight) {
                this.grid[gridY][gridX] = 1;
              }
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
          this.dropSpeed = Math.max(300, this.dropSpeed - lines * 50);
          try {
            const clearSound = new Audio('/static/sounds/clear.mp3');
            clearSound.volume = 0.5;
            clearSound.play().catch((e) => console.log('Error playing clear sound:', e));
          } catch (e) {
            console.log('Could not load or play clear sound:', e);
          }
          if (this.linesCleared >= this.linesToWin) {
            this.gameWon = true;
          }
        }
      }

      updateFingerPosition(fingerX, fingerY, triggerRotate) {
        if (this.gameOver || this.gameWon) return;
        const gridCenter = 640;
        const gridWidthPixels = this.gridWidth * this.blockSize;
        const normalizedX = (fingerX - (gridCenter - gridWidthPixels / 2)) / this.blockSize;
        const targetX = Math.max(0, Math.min(this.gridWidth - this.currentPiece[0].length, Math.round(normalizedX)));
        if (this.moveCooldown <= 0 && targetX !== this.pieceX && this.isValidMove(this.currentPiece, targetX, this.pieceY)) {
          this.pieceX = targetX;
          this.moveCooldown = 30;
        }
        this.lastFingerX = fingerX;
        if (fingerY > 600 && this.fastDropDebounce <= 0) {
          this.fastDropActive = true;
          this.fastDropDebounce = 500;
        } else if (fingerY <= 600 && this.fastDropActive) {
          this.fastDropActive = false;
          this.fastDropDebounce = 0;
        }
        if (triggerRotate && this.rotationCooldown <= 0) {
          this.rotatePiece();
          this.rotationCooldown = 500;
          try {
            const rotateSound = new Audio('/static/sounds/rotate.mp3');
            rotateSound.volume = 0.5;
            rotateSound.play().catch((e) => console.log('Error playing rotate sound:', e));
          } catch (e) {
            console.log('Could not load or play rotate sound:', e);
          }
        }
        this.fastDropDebounce = Math.max(0, this.fastDropDebounce - 16);
      }

      updateWithoutRender(deltaTime) {
        if (this.gameOver || this.gameWon) return;
        this.moveCooldown -= deltaTime;
        this.rotationCooldown -= deltaTime;
        this.lastDropTime += deltaTime;
        this.dropSpeed = this.fastDropActive ? 100 : (800 - Math.floor(this.linesCleared / 2) * 50);
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
        // Draw background image or fallback color
        if (this.backgroundImageLoaded) {
          ctx.drawImage(this.backgroundImage, 0, 0, 1280, 720);
        } else {
          ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
          ctx.fillRect(0, 0, 1280, 720);
        }
        const boardX = 450;
        const boardY = 100;
        const boardWidth = this.gridWidth * this.blockSize + 10;
        const boardHeight = this.gridHeight * this.blockSize + 10;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
        ctx.strokeStyle = '#1E90FF';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#1E90FF';
        ctx.shadowBlur = 10;
        ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);
        ctx.shadowBlur = 0;
        for (let y = 0; y < this.gridHeight; y++) {
          for (let x = 0; x < this.gridWidth; x++) {
            if (this.grid[y][x]) {
              ctx.fillStyle = 'gray';
              ctx.fillRect(boardX + 5 + x * this.blockSize, boardY + 5 + y * this.blockSize, this.blockSize - 2, this.blockSize - 2);
              ctx.strokeStyle = '#333';
              ctx.strokeRect(boardX + 5 + x * this.blockSize, boardY + 5 + y * this.blockSize, this.blockSize - 2, this.blockSize - 2);
            }
          }
        }
        const shapeIndex = this.shapes.findIndex(shape => shape.every((row, y) => row.every((cell, x) => cell === this.currentPiece[y]?.[x]))) || 0;
        ctx.fillStyle = this.colors[shapeIndex] || 'white';
        for (let py = 0; py < this.currentPiece.length; py++) {
          for (let px = 0; px < this.currentPiece[0].length; px++) {
            if (this.currentPiece[py][px]) {
              const gridY = this.pieceY + py;
              if (gridY >= 0 && gridY < this.gridHeight) {
                ctx.fillRect(boardX + 5 + (this.pieceX + px) * this.blockSize, boardY + 5 + (this.pieceY + py) * this.blockSize, this.blockSize - 2, this.blockSize - 2);
                ctx.strokeStyle = '#333';
                ctx.strokeRect(boardX + 5 + (this.pieceX + px) * this.blockSize, boardY + 5 + (this.pieceY + py) * this.blockSize, this.blockSize - 2, this.blockSize - 2);
              }
            }
          }
        }
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(900, 100, 160, 160);
        ctx.strokeStyle = '#1E90FF';
        ctx.shadowColor = '#1E90FF';
        ctx.shadowBlur = 10;
        ctx.strokeRect(900, 100, 160, 160);
        ctx.shadowBlur = 0;
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
        // Stats box 
        const statsBoxX = 900;
        const statsBoxY = 280; // Position below next block box
        const statsBoxWidth = 200;
        const statsBoxHeight = 120;

        // Draw stats box background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight);

        // Draw stats box border with glow effect
        ctx.strokeStyle = '#1E90FF';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#1E90FF';
        ctx.shadowBlur = 10;
        ctx.strokeRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight);
        ctx.shadowBlur = 0;

        // Stats box title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('STATISTICS', statsBoxX + statsBoxWidth/2, statsBoxY + 25);

        // Score display
        ctx.fillStyle = '#FFD700'; // Gold color for score
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', statsBoxX + 15, statsBoxY + 50);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(this.score.toString(), statsBoxX + statsBoxWidth - 15, statsBoxY + 50);

        // Lines display
        ctx.fillStyle = '#00FF7F'; // Spring green for lines
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Lines Cleared', statsBoxX + 15, statsBoxY + 80);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(this.linesCleared.toString(), statsBoxX + statsBoxWidth - 15, statsBoxY + 80);

      }
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (bgMusicRef.current) bgMusicRef.current.pause();
    };
  }, []);

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
              <li><strong>Keyboard controls:</strong> Press 'R' to restart and 'Q' to quit.</li>
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
            <button id="restart-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/replay.svg" alt="Restart" style={{ width: '35px', height: '35px' }} />
            </button>
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