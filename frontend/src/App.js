import React, { useEffect, useRef } from 'react';
import './App.css';

const App = () => {
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
  const lastRenderTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const debug = debugRef.current;

    gameOver.style.display = 'none';

    const appleImage = new Image();
    appleImage.src = '/static/images/apple.png';
    appleImage.onload = () => console.log('Apple image loaded successfully');

    const initHandDetection = () => {
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      handsRef.current.onResults((results) =>
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScoreRef.current)
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
        startCamera().then(() => {
          gameObjectRef.current = new SnakeGame(canvas, gameStats);
          gameStartedRef.current = true;
          lastRenderTimeRef.current = performance.now();
          gameOver.style.display = 'none';
          requestAnimationFrame(gameLoop);
        }).catch((error) => {
          alert('Camera access error: ' + error.message);
        });
      }
    };

    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        requestAnimationFrame(gameLoop);
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (cameraRef.current) cameraRef.current.stop();
        gameStartedRef.current = false;
      }
    });

    initHandDetection();

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      ctx.save();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720);
      ctx.restore();
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const fingerBase = results.multiHandLandmarks[0][5];
          const baseX = Math.floor(1280 - fingerBase.x * 1280);
          const baseY = Math.floor(fingerBase.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY, baseX, baseY);
        }
        gameObj.render(ctx);
        if (gameStartedRef.current && !gameObj.gameOver) {
          requestAnimationFrame(gameLoop);
        }
      }
      ctx.restore();
    };

    class SnakeGame {
      constructor(ctx, stats) {
        this.points = [];
        this.lengths = [];
        this.currentLength = 0;
        this.totalAllowedLength = 150;
        this.targetPosition = [640, 360];
        this.headPosition = [640, 360];
        this.fingerDetected = false;
        this.initializeSnake();
        this.foodHeight = 60;
        this.foodWidth = 60;
        this.foodLocation = [0, 0];
        this.setRandomFoodLocation();
        this.score = 0;
        this.gameOver = false;
        this.ctx = ctx;
        this.stats = stats;
      }

      initializeSnake() {
        this.points.push([640, 420]);
        this.points.push([640, 400]);
        this.points.push([640, 380]);
        this.points.push([640, 360]);
        for (let i = 1; i < this.points.length; i++) {
          const dist = Math.hypot(this.points[i - 1][0] - this.points[i][0], this.points[i - 1][1] - this.points[i][1]);
          this.lengths.push(dist);
          this.currentLength += dist;
        }
        this.headPosition = [...this.points[3]];
        this.targetPosition = [...this.headPosition];
      }

      setRandomFoodLocation() {
        const margin = this.foodWidth * 2;
        this.foodLocation = [
          Math.floor(Math.random() * (1280 - margin * 2)) + margin,
          Math.floor(Math.random() * (720 - margin * 2)) + margin,
        ];
      }

      updateFingerPosition(fingerX, fingerY, baseX, baseY) {
        if (!this.gameOver) {
          const dirX = fingerX - baseX;
          const dirY = fingerY - baseY;
          const length = Math.sqrt(dirX * dirX + dirY * dirY);
          if (length > 0) {
            this.targetPosition = [fingerX, fingerY];
            this.fingerDetected = true;
          }
        }
      }

      updateWithoutRender(deltaTime) {
        if (this.gameOver) return;
        const deltaSeconds = deltaTime / 1000;
        if (this.fingerDetected) {
          const moveSpeed = 300 * deltaSeconds;
          const dx = this.targetPosition[0] - this.headPosition[0];
          const dy = this.targetPosition[1] - this.headPosition[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 3) {
            let moveAmount = Math.min(dist, moveSpeed);
            const ux = dx / dist;
            const uy = dy / dist;
            const newX = this.headPosition[0] + ux * moveAmount;
            const newY = this.headPosition[1] + uy * moveAmount;
            this.headPosition = [newX, newY];
            const lastPoint = this.points[this.points.length - 1];
            const distToLastPoint = Math.hypot(lastPoint[0] - this.headPosition[0], lastPoint[1] - this.headPosition[1]);
            if (distToLastPoint > 5) {
              this.points.push([...this.headPosition]);
              this.lengths.push(distToLastPoint);
              this.currentLength += distToLastPoint;
              while (this.currentLength > this.totalAllowedLength && this.lengths.length > 0) {
                const removedLength = this.lengths.shift();
                this.currentLength -= removedLength;
                this.points.shift();
              }
              const [foodX, foodY] = this.foodLocation;
              const [headX, headY] = this.headPosition;
              const distToFood = Math.hypot(headX - foodX, headY - foodY);
              if (distToFood < (this.foodWidth / 2) + 10) {
                this.setRandomFoodLocation();
                this.totalAllowedLength += 50;
                this.score += 1;
                this.stats.textContent = `Score: ${this.score}`;
                try {
                  const eatSound = new Audio('/static/sounds/eat.mp3');
                  eatSound.volume = 0.5;
                  eatSound.play().catch((e) => console.log('Error playing sound:', e));
                } catch (e) {
                  console.log('Could not load or play sound:', e);
                }
              }
              if (this.points.length > 10) {
                const bodyPoints = this.points.slice(0, -10);
                for (let i = 0; i < bodyPoints.length - 1; i++) {
                  const segmentStart = bodyPoints[i];
                  const segmentEnd = bodyPoints[i + 1];
                  const dist = this.distanceToLineSegment(this.headPosition, segmentStart, segmentEnd);
                  if (dist < 15) {
                    this.gameOver = true;
                    return;
                  }
                }
              }
            }
          }
        }
      }

      // Enhance rendering with gradient snake body and eyes
      render(ctx) {
        // Set line properties for smooth snake body rendering
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        // Draw the snake body with a gradient effect
        for (let i = 1; i < this.points.length; i++) {
          const gradPercent = i / this.points.length; // Calculate gradient position
          const r = Math.floor(255 - gradPercent * 55); // Red component
          const g = Math.floor(0 + gradPercent * 0); // Green component (fixed at 0)
          const b = Math.floor(0 + gradPercent * 200); // Blue component
          ctx.beginPath();
          ctx.moveTo(this.points[i - 1][0], this.points[i - 1][1]); // Start of segment
          ctx.lineTo(this.points[i][0], this.points[i][1]); // End of segment
          ctx.lineWidth = 20; // Set thickness of the snake body
          ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`; // Apply gradient color
          ctx.stroke(); // Draw the segment
        }
        // Draw the snake head as a circle
        ctx.beginPath();
        ctx.arc(this.headPosition[0], this.headPosition[1], 13.33, 0, 2 * Math.PI);
        ctx.fillStyle = '#c800c8'; // Purple color for head
        ctx.fill();
        // Add eyes to the snake head if body exists
        if (this.points.length > 1) {
          const lastPoint = this.points[this.points.length - 2]; // Previous body point
          let dx = this.headPosition[0] - lastPoint[0]; // Direction x from last point
          let dy = this.headPosition[1] - lastPoint[1]; // Direction y from last point
          const len = Math.hypot(dx, dy); // Length of direction vector
          if (len > 0) {
            dx /= len; // Normalize x direction
            dy /= len; // Normalize y direction
            const perpX = -dy; // Perpendicular x for eye offset
            const perpY = dx; // Perpendicular y for eye offset
            const eyeOffset = 6.66; // Distance of eyes from center
            const leftEyeX = this.headPosition[0] + perpX * eyeOffset; // Left eye x
            const leftEyeY = this.headPosition[1] + perpY * eyeOffset; // Left eye y
            const rightEyeX = this.headPosition[0] - perpX * eyeOffset; // Right eye x
            const rightEyeY = this.headPosition[1] - perpY * eyeOffset; // Right eye y
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, 3, 0, 2 * Math.PI); // Draw left eye
            ctx.arc(rightEyeX, rightEyeY, 3, 0, 2 * Math.PI); // Draw right eye
            ctx.fillStyle = 'white'; // White color for eyes
            ctx.fill();
          }
        }
        // Draw the apple using the loaded image or a fallback
        if (appleImage.complete) {
          ctx.drawImage(appleImage, this.foodLocation[0] - 30, this.foodLocation[1] - 30, 60, 60);
        } else {
          ctx.beginPath();
          ctx.arc(this.foodLocation[0], this.foodLocation[1], 30, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF0000';
          ctx.fill();
        }
        this.stats.textContent = `Score: ${this.score}`;
      }

      distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point[0] - lineStart[0];
        const B = point[1] - lineStart[1];
        const C = lineEnd[0] - lineStart[0];
        const D = lineEnd[1] - lineStart[1];
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
          xx = lineStart[0];
          yy = lineStart[1];
        } else if (param > 1) {
          xx = lineEnd[0];
          yy = lineEnd[1];
        } else {
          xx = lineStart[0] + param * C;
          yy = lineStart[1] + param * D;
        }
        const dx = point[0] - xx;
        const dy = point[1] - yy;
        return Math.sqrt(dx * dx + dy * dy);
      }
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);

  return (
    <div>
      <header>
        <h1>CV Games - Hand Tracker Snake</h1>
        <p>Use your index finger to control the snake and collect apples!</p>
      </header>
      <div className="controls">
        <button id="start-btn">Start Game</button>
        <button id="restart-btn">Restart Game</button>
        <button id="test-camera-btn">Test Camera</button>
      </div>
      <div ref={debugRef} className="debug-box"></div>
      <div className="game-container">
        <canvas ref={canvasRef} width="1280" height="720"></canvas>
        <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
        <div ref={gameStatsRef} className="game-stats">Score: 0</div>
        <div ref={gameOverRef} className="game-over">
          <h2>Game Over!</h2>
          <p>Your Score: <span ref={finalScoreRef}>0</span></p>
          <button id="play-again-btn">Play Again</button>
        </div>
      </div>
      <div className="instructions">
        <h2>How to Play</h2>
        <ul>
          <li><strong>Show your hand:</strong> Make sure your hand is clearly visible to the webcam.</li>
          <li><strong>Move the snake:</strong> Use your index finger to control the snake.</li>
          <li><strong>Collect apples:</strong> Guide the snake to eat apples and grow longer.</li>
          <li><strong>Don't hit yourself:</strong> Avoid collisions with your own snake body!</li>
          <li><strong>Keyboard controls:</strong> Press 'R' to restart and 'Q' to quit.</li>
        </ul>
      </div>
      <footer>
        <p>CV Games - Hand Tracker Snake © 2025</p>
      </footer>
    </div>
  );
};

export default App;