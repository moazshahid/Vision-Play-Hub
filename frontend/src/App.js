import React, { useEffect, useRef } from 'react';
import './App.css';

// Define the main App component to handle the game interface
const App = () => {
  // Initialize refs for video feed, canvas, game stats, game over display, final score, and debug output
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gameStatsRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const debugRef = useRef(null);
  // Add refs for hand detection setup, camera control, game object, game state, and last render timestamp
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const gameObjectRef = useRef(null);
  const gameStartedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);

  // Use effect hook to set up the game environment when the component mounts
  useEffect(() => {
    // Retrieve the 2D rendering context from the canvas and other DOM elements
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const debug = debugRef.current;

    // Hide the game over screen by default
    gameOver.style.display = 'none';

    // Function to initialize MediaPipe Hands for hand tracking
    const initHandDetection = () => {
      // Create a new Hands instance with CDN-hosted files
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      // Configure hand detection options for optimal performance
      handsRef.current.setOptions({
        maxNumHands: 1, // Limit to one hand for simplicity
        modelComplexity: 1, // Use a balanced model for speed and accuracy
        minDetectionConfidence: 0.7, // Minimum confidence for hand detection
        minTrackingConfidence: 0.7, // Minimum confidence for hand tracking
      });
      // Set up a callback to process hand detection results
      handsRef.current.onResults((results) =>
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScoreRef.current)
      );
    };

    // Function to start the webcam and set up the camera feed
    const startCamera = async () => {
      try {
        // Request access to the user's webcam with specified resolution and frame rate
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        });
        video.srcObject = stream;
        // Wait for video metadata to load before proceeding
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play();
        // Initialize the Camera utility with a callback to send frames for hand detection
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => await handsRef.current.send({ image: video }),
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start();
        console.log('Camera started successfully');
      } catch (error) {
        // Display any camera-related errors in the debug box
        debug.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    // Function to start the game, including camera initialization
    const startGame = () => {
      if (!gameStartedRef.current) {
        startCamera().then(() => {
          // Create a new SnakeGame instance as a placeholder
          gameObjectRef.current = new SnakeGame(canvas, gameStats);
          gameStartedRef.current = true;
          lastRenderTimeRef.current = performance.now();
          gameOver.style.display = 'none';
          // Start the initial game loop
          requestAnimationFrame(gameLoop);
        }).catch((error) => {
          alert('Camera access error: ' + error.message);
        });
      }
    };

    // Game loop to handle continuous updates
    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        // Update game state without rendering (stubbed for now)
        gameObjectRef.current.updateWithoutRender(deltaTime);
        // Schedule the next frame
        requestAnimationFrame(gameLoop);
      }
    };

    // Add event listeners for game controls
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    // Listen for 'Q' key to quit the game
    document.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (cameraRef.current) cameraRef.current.stop();
        gameStartedRef.current = false;
      }
    });

    // Initialize hand detection when the component loads
    initHandDetection();

    // Function to process hand detection results and update the game
    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      // Save the current canvas state
      ctx.save();
      // Clear the canvas for the new frame
      ctx.clearRect(0, 0, 1280, 720);
      // Flip the video horizontally for a mirror effect
      ctx.save();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720);
      ctx.restore();
      // Process game logic if the game has started
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          // Extract index finger and base positions for movement
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const fingerBase = results.multiHandLandmarks[0][5];
          const baseX = Math.floor(1280 - fingerBase.x * 1280);
          const baseY = Math.floor(fingerBase.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY, baseX, baseY);
        }
        // Render the game state (stubbed for now)
        gameObj.render(ctx);
      }
      // Restore the canvas state
      ctx.restore();
    };

    // Define a stubbed SnakeGame class for initial setup
    class SnakeGame {
      constructor(ctx, stats) {
        // Initialize basic game properties
        this.ctx = ctx;
        this.stats = stats;
        this.gameOver = false;
        this.score = 0;
      }

      // Placeholder for updating finger position
      updateFingerPosition(fingerX, fingerY, baseX, baseY) {
        // To be implemented in later commits
      }

      // Placeholder for updating game state
      updateWithoutRender(deltaTime) {
        // To be implemented in later commits
      }

      // Placeholder for rendering game elements
      render(ctx) {
        // To be implemented in later commits
      }
    }

    // Clean up camera resources when the component unmounts
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