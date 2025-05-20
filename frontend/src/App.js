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
      }
      ctx.restore();
    };

    // Define the SnakeGame class to manage game logic
    class SnakeGame {
      constructor(ctx, stats) {
        // Initialize array to store snake body points
        this.points = [];
        // Initialize array to store distances between points
        this.lengths = [];
        // Track the current length of the snake
        this.currentLength = 0;
        // Set the maximum allowed length before trimming
        this.totalAllowedLength = 150;
        // Set initial target and head positions for movement
        this.targetPosition = [640, 360];
        this.headPosition = [640, 360];
        // Flag to track if a finger is detected
        this.fingerDetected = false;
        // Initialize the snake at the start
        this.initializeSnake();
        // Define food dimensions
        this.foodHeight = 60;
        this.foodWidth = 60;
        // Set initial food location
        this.foodLocation = [0, 0];
        this.setRandomFoodLocation();
        // Initialize game score and state
        this.score = 0;
        this.gameOver = false;
        // Store canvas context and stats display
        this.ctx = ctx;
        this.stats = stats;
      }

      // Method to set up the initial snake body
      initializeSnake() {
        this.points.push([640, 420]); // Starting point 1
        this.points.push([640, 400]); // Starting point 2
        this.points.push([640, 380]); // Starting point 3
        this.points.push([640, 360]); // Head position
        // Calculate initial lengths between points
        for (let i = 1; i < this.points.length; i++) {
          const dist = Math.hypot(this.points[i - 1][0] - this.points[i][0], this.points[i - 1][1] - this.points[i][1]);
          this.lengths.push(dist);
          this.currentLength += dist;
        }
        this.headPosition = [...this.points[3]];
        this.targetPosition = [...this.headPosition];
      }

      // Method to place food at a random location
      setRandomFoodLocation() {
        const margin = this.foodWidth * 2; // Ensure food stays within bounds
        this.foodLocation = [
          Math.floor(Math.random() * (1280 - margin * 2)) + margin,
          Math.floor(Math.random() * (720 - margin * 2)) + margin,
        ];
      }

      // Method to update snake direction based on finger position
      updateFingerPosition(fingerX, fingerY, baseX, baseY) {
        if (!this.gameOver) {
          const dirX = fingerX - baseX; // Calculate x-direction from base to finger
          const dirY = fingerY - baseY; // Calculate y-direction from base to finger
          const length = Math.sqrt(dirX * dirX + dirY * dirY); // Distance between points
          if (length > 0) {
            this.targetPosition = [fingerX, fingerY]; // Update target position
            this.fingerDetected = true; // Mark finger as detected
          }
        }
      }

      // Method to update game state without rendering
      updateWithoutRender(deltaTime) {
        if (this.gameOver) return; // Exit if game is over
        const deltaSeconds = deltaTime / 1000; // Convert deltaTime to seconds
        if (this.fingerDetected) {
          const moveSpeed = 300 * deltaSeconds; // Set movement speed based on time
          const dx = this.targetPosition[0] - this.headPosition[0]; // X distance to target
          const dy = this.targetPosition[1] - this.headPosition[1]; // Y distance to target
          const dist = Math.sqrt(dx * dx + dy * dy); // Total distance to target
          if (dist > 3) { // Only move if distance is significant
            let moveAmount = Math.min(dist, moveSpeed); // Limit movement to speed
            const ux = dx / dist; // Unit vector x component
            const uy = dy / dist; // Unit vector y component
            const newX = this.headPosition[0] + ux * moveAmount; // New x position
            const newY = this.headPosition[1] + uy * moveAmount; // New y position
            this.headPosition = [newX, newY]; // Update head position
            const lastPoint = this.points[this.points.length - 1]; // Get last body point
            const distToLastPoint = Math.hypot(lastPoint[0] - this.headPosition[0], lastPoint[1] - this.headPosition[1]);
            if (distToLastPoint > 5) { // Add new point if distance is sufficient
              this.points.push([...this.headPosition]); // Add new head position
              this.lengths.push(distToLastPoint); // Record new segment length
              this.currentLength += distToLastPoint; // Update total length
              // Trim snake if it exceeds allowed length
              while (this.currentLength > this.totalAllowedLength && this.lengths.length > 0) {
                const removedLength = this.lengths.shift();
                this.currentLength -= removedLength;
                this.points.shift();
              }
              const [foodX, foodY] = this.foodLocation; // Current food position
              const [headX, headY] = this.headPosition; // Current head position
              const distToFood = Math.hypot(headX - foodX, headY - foodY); // Distance to food
              if (distToFood < (this.foodWidth / 2) + 10) { // Check if snake ate food
                this.setRandomFoodLocation(); // Move food to new location
                this.totalAllowedLength += 50; // Increase allowed length
                this.score += 1; // Increment score
                this.stats.textContent = `Score: ${this.score}`; // Update score display
                // Attempt to play eat sound effect
                try {
                  const eatSound = new Audio('/static/sounds/eat.mp3');
                  eatSound.volume = 0.5;
                  eatSound.play().catch((e) => console.log('Error playing sound:', e));
                } catch (e) {
                  console.log('Could not load or play sound:', e);
                }
              }
              // Check for self-collision with body segments
              if (this.points.length > 10) {
                const bodyPoints = this.points.slice(0, -10); // Exclude last 10 points
                for (let i = 0; i < bodyPoints.length - 1; i++) {
                  const segmentStart = bodyPoints[i];
                  const segmentEnd = bodyPoints[i + 1];
                  const dist = this.distanceToLineSegment(this.headPosition, segmentStart, segmentEnd);
                  if (dist < 15) { // If head is too close to body
                    this.gameOver = true; // End the game
                    return; // Exit update loop
                  }
                }
              }
            }
          }
        }
      }

      // Placeholder for rendering (to be enhanced in later commits)
      render(ctx) {
        ctx.fillStyle = '#FF0000'; // Set red color for food
        ctx.fillRect(this.foodLocation[0] - 30, this.foodLocation[1] - 30, 60, 60); // Draw food as rectangle
        ctx.fillStyle = '#c800c8'; // Set purple color for snake head
        ctx.fillRect(this.headPosition[0] - 10, this.headPosition[1] - 10, 20, 20); // Draw snake head
      }

      // Method to calculate distance from point to line segment
      distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point[0] - lineStart[0]; // X difference from point to start
        const B = point[1] - lineStart[1]; // Y difference from point to start
        const C = lineEnd[0] - lineStart[0]; // X component of line
        const D = lineEnd[1] - lineStart[1]; // Y component of line
        const dot = A * C + B * D; // Dot product for projection
        const lenSq = C * C + D * D; // Square of line length
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq; // Parameter along line
        let xx, yy;
        if (param < 0) {
          xx = lineStart[0]; // Clamp to start if before line
          yy = lineStart[1];
        } else if (param > 1) {
          xx = lineEnd[0]; // Clamp to end if beyond line
          yy = lineEnd[1];
        } else {
          xx = lineStart[0] + param * C; // Project onto line
          yy = lineStart[1] + param * D;
        }
        const dx = point[0] - xx; // X difference to closest point
        const dy = point[1] - yy; // Y difference to closest point
        return Math.sqrt(dx * dx + dy * dy); // Return Euclidean distance
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