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
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef, gameOver, finalScore, video)
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
            gameObjectRef.current = new GameLogic(canvas, gameStats, video);
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
      gameObjectRef.current = new GameLogic(canvas, gameStats, video);
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
      gameObjectRef.current = new GameLogic(canvas, gameStats, video);
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
        gameObjectRef.current = new GameLogic(canvas, gameStats, video);
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
        gameStartedRef.current = false;
        gameObjectRef.current = null;
        
        // Stop camera and cleanup
        if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
        }
        if (handsRef.current) {
          handsRef.current.close();
          handsRef.current = null;
        }
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
        
        // Stop background music
        if (bgMusicRef.current) {
          bgMusicRef.current.pause();
          bgMusicRef.current = null;
        }
        
        // Show quit message
        canvas.clearRect(0, 0, 1280, 720);
        canvas.fillStyle = 'rgba(0, 0, 0, 0.9)';
        canvas.fillRect(0, 0, 1280, 720);
        canvas.fillStyle = '#FFFFFF';
        canvas.font = 'bold 48px Arial';
        canvas.textAlign = 'center';
        canvas.textBaseline = 'middle';
        canvas.fillText('Game Quit', 640, 320);
        canvas.font = '24px Arial';
        canvas.fillText('Refresh the page to play again', 640, 380);
        
        console.log('Game quit via Q key');
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

    const onHandResults = (results, ctx, video, gameObj, started, over, score, videoElement) => {
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
          debug.innerHTML = ''; // Clear warning when hand is detected
        } else {
          debug.innerHTML = '<p class="warning">❌ No hands detected - Please ensure one hand is visible to the webcam</p>';
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
      // over.style.display = 'block'; (Commented out this line to remove green screen from win/loss screens)
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
      constructor(ctx, stats, videoElement) {
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
        this.videoElement = videoElement;
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

        // Camera preview box 
        const previewBoxX = 50;
        const previewBoxY = 100;
        const previewBoxWidth = 320;
        const previewBoxHeight = 240; // 4:3 aspect ratio

        // Draw camera preview background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);

        // Draw camera preview border
        ctx.strokeStyle = '#1E90FF';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#1E90FF';
        ctx.shadowBlur = 10;
        ctx.strokeRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);
        ctx.shadowBlur = 0;

        // Camera preview title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CAMERA PREVIEW', previewBoxX + previewBoxWidth/2, previewBoxY - 10);

        // Calculate proper aspect ratio for video
        if (this.videoElement && this.videoElement.videoWidth > 0) {
          const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
          const boxAspect = previewBoxWidth / previewBoxHeight;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (videoAspect > boxAspect) {
            // Video is wider, fit to height
            drawHeight = previewBoxHeight;
            drawWidth = drawHeight * videoAspect;
            drawX = previewBoxX - (drawWidth - previewBoxWidth) / 2;
            drawY = previewBoxY;
          } else {
            // Video is taller, fit to width
            drawWidth = previewBoxWidth;
            drawHeight = drawWidth / videoAspect;
            drawX = previewBoxX;
            drawY = previewBoxY + (previewBoxHeight - drawHeight) / 2;
          }
          
          // Clip to preview box area
          ctx.save();
          ctx.rect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);
          ctx.clip();
          
          // Draw the video feed (flipped horizontally like a mirror)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(this.videoElement, -drawX - drawWidth, drawY, drawWidth, drawHeight);
          ctx.restore();
          
          ctx.restore();
        }

        // Draw control regions overlay
        // Left region (red)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(previewBoxX, previewBoxY, previewBoxWidth * 0.3, previewBoxHeight);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(previewBoxX, previewBoxY, previewBoxWidth * 0.3, previewBoxHeight);

        // Right region (blue)
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        ctx.fillRect(previewBoxX + previewBoxWidth * 0.7, previewBoxY, previewBoxWidth * 0.3, previewBoxHeight);
        ctx.strokeStyle = '#0000FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(previewBoxX + previewBoxWidth * 0.7, previewBoxY, previewBoxWidth * 0.3, previewBoxHeight);

        // Fast drop region (green - bottom area)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(previewBoxX, previewBoxY + previewBoxHeight * 0.75, previewBoxWidth, previewBoxHeight * 0.25);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(previewBoxX, previewBoxY + previewBoxHeight * 0.75, previewBoxWidth, previewBoxHeight * 0.25);
        ctx.setLineDash([]);

        // Region labels with better styling
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';

        // Left label
        ctx.strokeText('MOVE LEFT', previewBoxX + previewBoxWidth * 0.15, previewBoxY + previewBoxHeight/2);
        ctx.fillText('MOVE LEFT', previewBoxX + previewBoxWidth * 0.15, previewBoxY + previewBoxHeight/2);

        // Right label
        ctx.strokeText('MOVE RIGHT', previewBoxX + previewBoxWidth * 0.85, previewBoxY + previewBoxHeight/2);
        ctx.fillText('MOVE RIGHT', previewBoxX + previewBoxWidth * 0.85, previewBoxY + previewBoxHeight/2);

        // Fast drop label
        ctx.strokeText('FAST DROP', previewBoxX + previewBoxWidth/2, previewBoxY + previewBoxHeight * 0.87);
        ctx.fillText('FAST DROP', previewBoxX + previewBoxWidth/2, previewBoxY + previewBoxHeight * 0.87);

        // Instructions box (right side)
        const instructionsBoxX = 900;
        const instructionsBoxY = 420;
        const instructionsBoxWidth = 250; 
        const instructionsBoxHeight = 300; 

        // Draw instructions box background with gradient effect
        const gradient = ctx.createLinearGradient(instructionsBoxX, instructionsBoxY, instructionsBoxX, instructionsBoxY + instructionsBoxHeight);
        gradient.addColorStop(0, '#2a2a2a');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(instructionsBoxX, instructionsBoxY, instructionsBoxWidth, instructionsBoxHeight);

        // Draw instructions box border with glow
        ctx.strokeStyle = '#1E90FF';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#1E90FF';
        ctx.shadowBlur = 15;
        ctx.strokeRect(instructionsBoxX, instructionsBoxY, instructionsBoxWidth, instructionsBoxHeight);
        ctx.shadowBlur = 0;

        // Instructions title with background
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(instructionsBoxX + 5, instructionsBoxY + 5, instructionsBoxWidth - 10, 35); 
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial'; 
        ctx.textAlign = 'center';
        ctx.fillText('HOW TO PLAY', instructionsBoxX + instructionsBoxWidth/2, instructionsBoxY + 28);

        // Instructions with icons and better formatting
        ctx.textAlign = 'left';
        const instructionItems = [
          { icon: '👆', text: 'Move finger left/right', subtext: 'to control piece position' },
          { icon: '✊', text: 'Make a fist', subtext: 'to rotate the piece' },
          { icon: '⬇️', text: 'Lower your finger', subtext: 'for fast drop' },
          { icon: '🎯', text: 'Clear 10 lines to WIN!', subtext: '' },
          { icon: '⌨️', text: 'Press R to restart', subtext: 'Press Q to quit' }
        ];

        let yOffset = instructionsBoxY + 60; 
        instructionItems.forEach((item, index) => {
          // Icon
          ctx.font = '20px Arial'; 
          ctx.fillStyle = '#FFD700';
          ctx.fillText(item.icon, instructionsBoxX + 15, yOffset);
          
          // Main text
          ctx.font = 'bold 14px Arial'; 
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(item.text, instructionsBoxX + 45, yOffset); 
          
          // Subtext
          if (item.subtext) {
            ctx.font = '12px Arial'; 
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText(item.subtext, instructionsBoxX + 45, yOffset + 15);
            yOffset += 42; 
          } else {
            yOffset += 30; 
          }
        });

        // Add a decorative bottom border
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(instructionsBoxX + 20, instructionsBoxY + instructionsBoxHeight - 15, instructionsBoxWidth - 40, 2);

      }
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (bgMusicRef.current) bgMusicRef.current.pause();
    };
  }, []);

  return (
    <div className='inter'>
      <div style={{ width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/tetris-bg.svg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none' }}>
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
            <img src="static/images/pages/tetris-colour.svg" alt="Tetris" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div style={{ maxWidth: "20%", display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5vh' }}>
            <button className="inter start-button" onClick={() => setShowGame(true)} style={{ backgroundColor: `${localStorage.getItem('colorFilter') == "colorblind" ?'#01fefcff': '#4CAF50'}`, border: 'none', padding: '1em 1.5em', borderRadius: '1em', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
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