import React, { useEffect, useRef } from 'react';
import './Game.css';

// DessertSlash is a React component that implements a hand-tracking game where players slice desserts using their index finger.
const DessertSlash = () => {
  // Refs to manage DOM elements and game state
  const videoRef = useRef(null); // Reference to the video element for webcam feed
  const canvasRef = useRef(null); // Reference to the canvas element for rendering the game
  const gameStatsRef = useRef(null); // Reference to the div displaying score and time
  const gameOverRef = useRef(null); // Reference to the div displaying the game over screen
  const finalScoreRef = useRef(null); // Reference to the span displaying the final score on game over
  const debugRef = useRef(null); // Reference to the div for displaying debug messages (e.g., camera errors)
  const handsRef = useRef(null); // Reference to the MediaPipe Hands instance for hand tracking
  const cameraRef = useRef(null); // Reference to the MediaPipe Camera instance for webcam access
  const gameObjectRef = useRef(null); // Reference to the GameLogic instance managing game state
  const gameStartedRef = useRef(false); // Tracks whether the game has started
  const lastRenderTimeRef = useRef(0); // Stores the timestamp of the last render for calculating delta time
  const DessertImagesRef = useRef({}); // Stores loaded dessert images (ice cream, donut, cupcake)
  const bombImageRef = useRef(null); // Stores the loaded bomb image
  const powerUpImagesRef = useRef({}); // Stores loaded power-up images (freeze, double)
  const swordImageRef = useRef(null); // Stores the loaded sword image for the cursor
  const sliceSoundRef = useRef(null); // Stores the loaded sound for slicing desserts
  const bombSoundRef = useRef(null); // Stores the loaded sound for bomb explosions
  const burstSoundRef = useRef(null); // Stores the loaded sound for the Slash Burst power-up
  const bgMusicRef = useRef(null); // Stores the loaded background music
  const animationFrameIdRef = useRef(null); // Stores the ID of the current animation frame for cancellation
  const assetsLoadedRef = useRef(false); // Tracks whether all assets (images, sounds) have loaded

  // useEffect hook to set up the game, initialize hand detection, load assets, and handle cleanup
  useEffect(() => {
    // Get references to the canvas context and DOM elements
    const canvas = canvasRef.current?.getContext('2d'); // 2D rendering context for the canvas
    const video = videoRef.current; // Video element for webcam feed
    const gameStats = gameStatsRef.current; // Div for displaying score and time
    const gameOver = gameOverRef.current; // Div for displaying game over screen
    const finalScore = finalScoreRef.current; // Span for displaying final score
    const debug = debugRef.current; // Div for debug messages

    // Check if the canvas context is available; if not, log an error and exit
    if (!canvas) {
      console.error('Canvas context not initialized');
      return;
    }

    // Initialize visibility of UI elements
    gameOver.style.display = 'none'; // Hide the game over screen initially
    gameStats.style.display = 'block'; // Show the score and time display initially

    // Utility function to load an image asynchronously
    // Takes a source URL and a fallback color to use if the image fails to load
    const loadImage = (src, fallbackColor) => {
      return new Promise((resolve) => {
        const img = new Image(); // Create a new image object
        img.src = src; // Set the image source
        img.onload = () => resolve(img); // Resolve the promise with the image on successful load
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}, using fallback`);
          resolve({ complete: true, fallbackColor }); // Resolve with a fallback object if the image fails to load
        };
      });
    };

    // Utility function to load an audio file asynchronously
    // Takes a source URL, volume (default 0.5), and loop setting (default false)
    const loadAudio = (src, volume = 0.5, loop = false) => {
      return new Promise((resolve) => {
        const audio = new Audio(src); // Create a new audio object
        audio.volume = volume; // Set the volume
        audio.loop = loop; // Set whether the audio should loop
        audio.preload = 'auto'; // Preload the audio
        audio.oncanplaythrough = () => resolve(audio); // Resolve the promise when the audio is ready
        audio.onerror = () => {
          console.warn(`Failed to load audio: ${src}`);
          resolve(null); // Resolve with null if the audio fails to load
        };
      });
    };

    // Function to load all game assets (images and audio)
    const loadAssets = async () => {
      try {
        // Load dessert images (ice cream, donut, cupcake) with fallback colors
        const DessertPromises = ['icecream', 'donut', 'cupcake'].map(async (type) => {
          DessertImagesRef.current[type] = await loadImage(`/static/images/${type}.png`, {
            icecream: '#FF0000', // Red fallback for ice cream
            donut: '#FFFF00', // Yellow fallback for donut
            cupcake: '#00FF00', // Green fallback for cupcake
          }[type]);
        });
        // Load the bomb image with a black fallback
        bombImageRef.current = await loadImage('/static/images/bomb.png', '#000000');
        // Load power-up images (freeze, double) with fallback colors
        const powerUpPromises = ['freeze', 'double'].map(async (type) => {
          powerUpImagesRef.current[type] = await loadImage(`/static/images/${type}.png`, {
            freeze: '#00B7EB', // Light blue for freeze power-up
            double: '#FFD700', // Gold for double score power-up
          }[type]);
        });
        // Load the sword image with a white fallback
        swordImageRef.current = await loadImage('/static/images/sword.png', '#FFFFFF');
        // Load audio files for game sounds
        sliceSoundRef.current = await loadAudio('/static/sounds/slice.mp3'); // Sound for slicing desserts
        bombSoundRef.current = await loadAudio('/static/sounds/explosion.mp3'); // Sound for bomb explosions
        burstSoundRef.current = await loadAudio('/static/sounds/slashburst.mp3'); // Sound for Slash Burst
        bgMusicRef.current = await loadAudio('/static/sounds/dessertslash_bg.mp3', 0.3, true); // Background music, loops with 0.3 volume
        // Wait for all assets to load
        await Promise.all([...DessertPromises, ...powerUpPromises]);
        assetsLoadedRef.current = true; // Mark assets as loaded
        console.log('All assets loaded');
      } catch (error) {
        console.error('Asset loading error:', error);
      }
    };

    // Function to initialize MediaPipe Hands for hand tracking
    const initHandDetection = () => {
      try {
        if (!window.Hands) {
          console.error('MediaPipe Hands not available');
          return;
        }
        // Create a new Hands instance with the MediaPipe library
        handsRef.current = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`, // Load MediaPipe files from CDN
        });
        // Configure hand detection settings
        handsRef.current.setOptions({
          maxNumHands: 1, // Detect only one hand
          modelComplexity: 1, // Use full model complexity for better accuracy
          minDetectionConfidence: 0.7, // Minimum confidence for detecting a hand
          minTrackingConfidence: 0.7, // Minimum confidence for tracking a hand
        });
        // Set up the callback for hand detection results
        handsRef.current.onResults((results) =>
          onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore)
        );
        console.log('MediaPipe Hands initialized');
      } catch (error) {
        console.error('Hand detection error:', error);
      }
    };

    // Function to start the webcam feed using MediaPipe Camera
    const startCamera = async () => {
      try {
        // Define constraints for the webcam feed
        const constraints = {
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        };
        // Request access to the webcam
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream; // Attach the stream to the video element
        await new Promise((resolve) => (video.onloadedmetadata = resolve)); // Wait for video metadata to load
        video.play(); // Start playing the video
        // Initialize the MediaPipe Camera to process video frames
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => {
            if (handsRef.current) await handsRef.current.send({ image: video }); // Send each frame to MediaPipe Hands for processing
          },
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start(); // Start the camera
        console.log('Camera started successfully');
      } catch (error) {
        console.error('Camera error:', error.message);
        // Display a warning if camera access fails
        debug.innerHTML += `<p class="warning">Camera error: ${error.message}. Please ensure camera access is granted.</p>`;
        throw error;
      }
    };

    // Function to start the game
    const startGame = async () => {
      if (!gameStartedRef.current) { // Only start if the game hasn't already started
        if (!assetsLoadedRef.current) { // Check if assets are loaded
          console.log('Assets not loaded yet');
          return;
        }
        await startCamera(); // Start the webcam
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current); // Cancel any existing animation frame
        }
        // Create a new GameLogic instance to manage the game state
        gameObjectRef.current = new GameLogic(
          canvas,
          gameStats,
          DessertImagesRef.current,
          bombImageRef.current,
          powerUpImagesRef.current,
          swordImageRef.current
        );
        // Play background music if available
        if (bgMusicRef.current) {
          bgMusicRef.current.currentTime = 0;
          bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
        }
        gameStartedRef.current = true; // Mark the game as started
        lastRenderTimeRef.current = performance.now(); // Set the initial render time
        gameOver.style.display = 'none'; // Hide the game over screen
        gameStats.style.display = 'block'; // Ensure score and time are visible
        requestAnimationFrame(gameLoop); // Start the game loop
      }
    };

    // Main game loop to update and render the game
    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        try {
          const deltaTime = timestamp - lastRenderTimeRef.current; // Calculate time since last frame
          lastRenderTimeRef.current = timestamp; // Update last render time
          gameObjectRef.current.updateWithoutRender(deltaTime); // Update game state without rendering
          animationFrameIdRef.current = requestAnimationFrame(gameLoop); // Schedule the next frame
        } catch (error) {
          console.error('Game loop error:', error);
        }
      }
    };

    // Callback function for handling hand detection results from MediaPipe
    const onHandResults = (results, ctx, video, gameObj, started, over, finalScore) => {
      ctx.save(); // Save the canvas context state
      ctx.clearRect(0, 0, 1280, 720); // Clear the canvas
      // Draw the mirrored webcam feed as the background
      ctx.save();
      ctx.translate(1280, 0); // Mirror the video horizontally
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720); // Draw the video frame
      ctx.restore();

      // If the game is started and a game object exists, process hand tracking
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          // Get the index finger tip (landmark 8) and base (landmark 5) coordinates
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280); // Adjust for mirrored video
          const fingerY = Math.floor(indexFinger.y * 720);
          const fingerBase = results.multiHandLandmarks[0][5];
          const baseX = Math.floor(1280 - fingerBase.x * 1280);
          const baseY = Math.floor(fingerBase.y * 720);
          // Update the game cursor position based on finger coordinates
          gameObj.updateFingerPosition(fingerX, fingerY, baseX, baseY);
        }
        gameObj.render(ctx); // Render the game objects (desserts, bombs, etc.)
        if (gameStartedRef.current && !gameObj.gameOver) {
          requestAnimationFrame(gameLoop); // Continue the game loop
        }
      }
      // If the game is over, display the game over screen on the canvas
      if (gameObj && gameObj.gameOver) {
        drawGameOverOnCanvas(ctx, gameObj.score, over, finalScore);
      }
      ctx.restore(); // Restore the canvas context state
    };
    
    loadAssets();
    initHandDetection();
  }, []);



  // Render the game UI
  return (
    <div>
      <div className="slider-container">
        <div className="slider">
          {/* Instructions slide */}
          <div className="slide" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <div style={{ maxWidth: "60%", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', overflowY: 'auto' }}>
              <div className="instructions inter">
                <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Dessert Slash</h2>
                <ul>
                  <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
                  <li><strong>Slice desserts:</strong> Move your index finger to control the sword and slice desserts (icecreams, donuts, cupcakes) for points. A white trail appears when you move.</li>
                  <li><strong>Avoid bombs:</strong> Don’t slice bombs, or you’ll lose a life (3 lives total, shown as bombs in the top-right).</li>
                  <li><strong>Combos:</strong> Slice multiple desserts quickly to earn 2x or 3x score multipliers.</li>
                  <li><strong>Power-Ups:</strong> Slice special desserts for Freeze (slows desserts dramatically) or Double Score (doubles points).</li>
                  <li><strong>Slash Burst:</strong> Swipe upward or press 'S' to slice all desserts on screen (10-second cooldown), with an orange-red trail.</li>
                  <li><strong>Time Limit:</strong> Survive 60 seconds; desserts and bombs spawn faster over time.</li>
                  <li><strong>Keyboard controls:</strong> Press 'R' to restart, 'Q' to quit, 'S' for Slash Burst.</li>
                </ul>
              </div>
            </div>
            <div style={{ maxWidth: "40%" }}>
              <img src="static/images/pages/dessert-lineart.svg" alt="Dessert Slash" style={{ width: '100%', height: 'auto' }} />
            </div>
          </div>
          {/* Game slide */}
          <div className="slide" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
            <div ref={debugRef} className="debug-box" style={{ backgroundColor: "#fff" }}></div>
            <div className="game-container inter">
              <canvas ref={canvasRef} width="1280" height="720" tabIndex="0" style={{ zIndex: 10 }}></canvas>
              <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
              <div ref={gameStatsRef} className="game-stats">Score: 0 | Time: 60</div>
              <div ref={gameOverRef} className="game-over">
                <h2>Game Over!</h2>
                <p>Your Score: <span ref={finalScoreRef}>0</span></p>
                <button id="play-again-btn">Play Again</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DessertSlash;
