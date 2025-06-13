import './Game.css';
import React, { useState, useEffect, useRef } from 'react';

// Define the SnakeGame component for the Hand Tracker Snake game
const SnakeGame = () => {
  const [showGame, setShowGame] = useState(false); // State to control game visibility
  // Initialize refs for DOM elements and game state
  const videoRef = useRef(null); // Ref for the video element (webcam feed)
  const canvasRef = useRef(null); // Ref for the canvas element (game rendering)
  const gameStatsRef = useRef(null); // Ref for the score display
  const gameOverRef = useRef(null); // Ref for the game over overlay
  const finalScoreRef = useRef(null); // Ref for the final score display
  const debugRef = useRef(null); // Ref for the debug messages
  const handsRef = useRef(null); // Ref for MediaPipe Hands instance
  const cameraRef = useRef(null); // Ref for MediaPipe Camera instance
  const gameObjectRef = useRef(null); // Ref for the GameLogic instance
  const gameStartedRef = useRef(false); // Track if the game has started
  const lastRenderTimeRef = useRef(0); // Track the last render timestamp for deltaTime

  // Use effect to set up the game environment when the component mounts
  useEffect(() => {
    // Get DOM elements and context from refs
    const canvas = canvasRef.current.getContext('2d'); // 2D rendering context for the canvas
    const video = videoRef.current; // Video element for webcam feed
    const gameStats = gameStatsRef.current; // Score display element
    const gameOver = gameOverRef.current; // Game over overlay element
    const finalScore = finalScoreRef.current; // Final score display element
    const debug = debugRef.current; // Debug message element

    // Hide the game over screen initially
    gameOver.style.display = 'none';

    // Load the apple image for food rendering
    const appleImage = new Image();
    appleImage.src = '/static/images/apple.png';
    appleImage.onload = () => console.log('Apple image loaded successfully');

    // Initialize MediaPipe Hands for hand tracking
    const initHandDetection = () => {
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1, // Detect only one hand for simplicity
        modelComplexity: 1, // Balance between speed and accuracy
        minDetectionConfidence: 0.7, // Confidence threshold for detection
        minTrackingConfidence: 0.7, // Confidence threshold for tracking
      });
      // Set up callback to process hand detection results
      handsRef.current.onResults((results) =>
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore)
      );
    };

    // Start the webcam and set up the camera feed
    const startCamera = async () => {
      try {
        // Request webcam access with specified resolution and frame rate
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        });
        video.srcObject = stream; // Set the video source to the webcam stream
        // Wait for video metadata to load
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play(); // Start playing the video
        // Initialize MediaPipe Camera to process video frames
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => await handsRef.current.send({ image: video }), // Send each frame for hand detection
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start(); // Start the camera
        console.log('Camera started successfully');
      } catch (error) {
        // Display camera errors in the debug box
        debug.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    // Start the game, including camera initialization
    const startGame = () => {
      if (!gameStartedRef.current) {
        startCamera()
          .then(() => {
            // Initialize a new GameLogic instance
            gameObjectRef.current = new GameLogic(canvas, gameStats);
            gameStartedRef.current = true; // Mark the game as started
            lastRenderTimeRef.current = performance.now(); // Set initial timestamp
            gameOver.style.display = 'none'; // Hide game over screen
            requestAnimationFrame(gameLoop); // Start the game loop
          })
          .catch((error) => {
            alert('Camera access error: ' + error.message);
          });
      }
    };

    // Game loop to handle continuous updates and rendering
    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        const deltaTime = timestamp - lastRenderTimeRef.current; // Calculate time since last frame
        lastRenderTimeRef.current = timestamp; // Update last render time
        gameObjectRef.current.updateWithoutRender(deltaTime); // Update game state
        requestAnimationFrame(gameLoop); // Schedule the next frame
      }
    };

    // Add event listeners for game controls
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
      // Restart the game when the restart button is clicked
      gameObjectRef.current = new GameLogic(canvas, gameStats); // Create a new game instance
      gameOver.style.display = 'none'; // Hide game over screen
      gameStartedRef.current = true; // Mark game as started
      lastRenderTimeRef.current = performance.now(); // Reset timestamp
      requestAnimationFrame(gameLoop); // Restart the game loop
    });
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      // Restart the game when the play again button is clicked
      gameObjectRef.current = new GameLogic(canvas, gameStats);
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        // Restart game with 'R' key
        gameObjectRef.current = new GameLogic(canvas, gameStats);
        gameOver.style.display = 'none';
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        requestAnimationFrame(gameLoop);
      }
      if (e.key === 'q' || e.key === 'Q') {
        // Quit game with 'Q' key
        if (cameraRef.current) cameraRef.current.stop();
        gameStartedRef.current = false;
      }
    });

    // Initialize hand detection on component mount
    initHandDetection();

    // Process hand detection results and update the game
    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save(); // Save the canvas state
      ctx.clearRect(0, 0, 1280, 720); // Clear the canvas
      // Draw the mirrored webcam feed
      ctx.save();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720);
      ctx.restore();
      // Update and render the game if it has started
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          // Extract index finger and base positions for snake movement
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const fingerBase = results.multiHandLandmarks[0][5];
          const baseX = Math.floor(1280 - fingerBase.x * 1280);
          const baseY = Math.floor(fingerBase.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY, baseX, baseY); // Update snake direction
        }
        gameObj.render(ctx); // Render the game state
        // Continue the game loop if the game is active
        if (gameStartedRef.current && !gameObj.gameOver) {
          requestAnimationFrame(gameLoop);
        }
      }
      // Show game over screen if the game has ended
      if (gameObj && gameObj.gameOver) {
        drawGameOverOnCanvas(ctx, gameObj.score, over, score);
      }
      ctx.restore(); // Restore the canvas state
    };

    // Draw the game over screen on the canvas
    const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
      // Draw a semi-transparent black overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 720);
      // Draw "GAME OVER" text in red
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', 640, 300);
      // Display the final score in white
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`Final Score: ${score}`, 640, 400);
      // Add restart instruction in green
      ctx.fillStyle = '#4CAF50';
      ctx.font = '40px Arial';
      ctx.fillText('Press "R" to Restart', 640, 500);
      // Update the DOM game over overlay
      finalScore.textContent = score;
      over.style.display = 'block';
    };

    // Define the GameLogic class to manage game logic (renamed to avoid conflict with component name)
    class GameLogic {
      constructor(ctx, stats) {
        // Initialize snake body points and lengths
        this.points = [];
        this.lengths = [];
        this.currentLength = 0;
        this.totalAllowedLength = 150; // Initial max length of the snake
        // Set initial target and head positions (center of canvas)
        this.targetPosition = [640, 360];
        this.headPosition = [640, 360];
        this.fingerDetected = false; // Track if a finger is detected
        this.initializeSnake(); // Set up the initial snake body
        // Define food dimensions and position
        this.foodHeight = 60;
        this.foodWidth = 60;
        this.foodLocation = [0, 0];
        this.setRandomFoodLocation(); // Place food at a random location
        // Initialize game state
        this.score = 0;
        this.gameOver = false;
        this.ctx = ctx; // Canvas context for rendering
        this.stats = stats; // DOM element for score display
      }

      // Initialize the snake with starting points
      initializeSnake() {
        // Add initial points to form a short vertical snake
        this.points.push([640, 420]);
        this.points.push([640, 400]);
        this.points.push([640, 380]);
        this.points.push([640, 360]); // Head position
        // Calculate distances between points and total length
        for (let i = 1; i < this.points.length; i++) {
          const dist = Math.hypot(this.points[i - 1][0] - this.points[i][0], this.points[i - 1][1] - this.points[i][1]);
          this.lengths.push(dist);
          this.currentLength += dist;
        }
        this.headPosition = [...this.points[3]]; // Set head position
        this.targetPosition = [...this.headPosition]; // Set initial target
      }

      // Place food at a random location within canvas bounds
      setRandomFoodLocation() {
        const margin = this.foodWidth * 2; // Ensure food stays within bounds
        this.foodLocation = [
          Math.floor(Math.random() * (1280 - margin * 2)) + margin,
          Math.floor(Math.random() * (720 - margin * 2)) + margin,
        ];
      }

      // Update snake direction based on finger position
      updateFingerPosition(fingerX, fingerY, baseX, baseY) {
        if (!this.gameOver) {
          const dirX = fingerX - baseX; // Calculate direction from base to finger
          const dirY = fingerY - baseY;
          const length = Math.sqrt(dirX * dirX + dirY * dirY); // Distance between points
          if (length > 0) {
            this.targetPosition = [fingerX, fingerY]; // Update target position
            this.fingerDetected = true; // Mark finger as detected
          }
        }
      }

      // Update game state without rendering
      updateWithoutRender(deltaTime) {
        if (this.gameOver) return; // Exit if game is over
        const deltaSeconds = deltaTime / 1000; // Convert deltaTime to seconds
        if (this.fingerDetected) {
          const moveSpeed = 300 * deltaSeconds; // Movement speed scaled by time
          const dx = this.targetPosition[0] - this.headPosition[0]; // X distance to target
          const dy = this.targetPosition[1] - this.headPosition[1]; // Y distance to target
          const dist = Math.sqrt(dx * dx + dy * dy); // Total distance to target
          if (dist > 3) { // Move only if distance is significant
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
              // Check if snake ate the food
              const [foodX, foodY] = this.foodLocation;
              const [headX, headY] = this.headPosition;
              const distToFood = Math.hypot(headX - foodX, headY - foodY);
              if (distToFood < (this.foodWidth / 2) + 10) { // Collision with food
                this.setRandomFoodLocation(); // Move food to new location
                this.totalAllowedLength += 50; // Increase snake length
                this.score += 1; // Increment score
                this.stats.textContent = `Score: ${this.score}`; // Update score display
                // Play eat sound effect
                try {
                  const eatSound = new Audio('/static/sounds/eat.mp3');
                  eatSound.volume = 0.5;
                  eatSound.play().catch((e) => console.log('Error playing sound:', e));
                } catch (e) {
                  console.log('Could not load or play sound:', e);
                }
              }
              // Check for self-collision with body
              if (this.points.length > 10) {
                const bodyPoints = this.points.slice(0, -10); // Exclude last 10 points to avoid head collision
                for (let i = 0; i < bodyPoints.length - 1; i++) {
                  const segmentStart = bodyPoints[i];
                  const segmentEnd = bodyPoints[i + 1];
                  const dist = this.distanceToLineSegment(this.headPosition, segmentStart, segmentEnd);
                  if (dist < 15) { // If head collides with body
                    this.gameOver = true; // End the game
                    return;
                  }
                }
              }
            }
          }
        }
      }

      // Render the game state on the canvas
      render(ctx) {
        // Set line properties for smooth rendering
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
          ctx.lineWidth = 20; // Thickness of the snake body
          ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`; // Apply gradient color
          ctx.stroke(); // Draw the segment
        }
        // Draw the snake head as a circle
        ctx.beginPath();
        ctx.arc(this.headPosition[0], this.headPosition[1], 13.33, 0, 2 * Math.PI);
        ctx.fillStyle = '#c800c8'; // Purple color for head
        ctx.fill();
        // Add eyes to the snake head
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
        this.stats.textContent = `Score: ${this.score}`; // Update score display
      }

      // Calculate distance from a point to a line segment (for collision detection)
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

    // Clean up camera resources when the component unmounts
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);

  // Render the game UI
  return (
    <div className='inter'> 
      <div style={{Width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/snake-bg.svg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none'}}>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0}}>Snake</h2>
            <ul>
              <li><strong>Show your hand:</strong> Make sure your hand is clearly visible to the webcam.</li>
              <li><strong>Move the snake:</strong> Use your index finger to control the snake.</li>
              <li><strong>Collect apples:</strong> Guide the snake to eat apples and grow longer.</li>
              <li><strong>Don't hit yourself:</strong> Avoid collisions with your own snake body!</li>
              <li><strong>Keyboard controls:</strong> Press 'R' to restart and 'Q' to quit.</li>
            </ul>
          </div>
        </div>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{maxWidth:"40%"}}>
            <img src="static/images/pages/snake-lineart.svg" alt="Whack A Mole" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div style={{maxWidth:"20%", display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5vh'}}>
            <button className="inter start-button" onClick={() => setShowGame(true)} style={{ backgroundColor: '#4CAF50', border: 'none', padding: '1em 1.5em', borderRadius: '1em', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5em', fontWeight: 600 , color: "#fff"}}>Start Game</span>
              <img src="static/images/pages/play-1.svg" alt="Start Game" style={{ width: '2vw', height: 'auto' }} />
            </button>
          </div>
        </div>
      </div>
      <div style={{Width: "100%", minHeight: "95vh", display: showGame ? 'flex' : 'none' , flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
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
        <div ref={debugRef} className="debug-box" style={{backgroundColor:"transparent"}}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} width="1280" height="720"></canvas>
          <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
          <div ref={gameStatsRef} className="game-stats">Score: 0</div>
          <div ref={gameOverRef} className="game-over">
            <h2>Game Over!</h2>
            <p>Your Score: <span ref={finalScoreRef}>0</span></p>
            <button id="play-again-btn">Play Again</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;