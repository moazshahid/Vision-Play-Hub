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

    // Function to draw the game over screen on the canvas
    const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
      ctx.fillRect(0, 0, 1280, 720); // Cover the entire canvas
      ctx.fillStyle = '#FF0000'; // Red text for "GAME OVER"
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', 640, 300); // Display "GAME OVER" in the center
      ctx.fillStyle = '#FFFFFF'; // White text for the final score
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`Final Score: ${score}`, 640, 400); // Display the final score
      ctx.fillStyle = '#4CAF50'; // Green text for restart instructions
      ctx.font = '40px Arial';
      ctx.fillText('Press "R" to Restart', 640, 500); // Display restart instructions
      finalScore.textContent = score; // Update the final score in the DOM
      over.style.display = 'block'; // Show the game over screen in the DOM
    };

    // GameLogic class to manage the game state and logic
    class GameLogic {
      constructor(ctx, stats, DessertImages, bombImage, powerUpImages, swordImage) {
        this.initializeGame(ctx, stats, DessertImages, bombImage, powerUpImages, swordImage);
      }

      // Initialize the game state
      initializeGame(ctx, stats, DessertImages, bombImage, powerUpImages, swordImage) {
        this.objects = []; // Array to store game objects (desserts, bombs, power-ups)
        this.score = 0; // Player's score
        this.lives = 3; // Number of lives (lose one per bomb sliced)
        this.gameOver = false; // Tracks if the game is over
        this.ctx = ctx; // Canvas context for rendering
        this.stats = stats; // DOM element for displaying score and time
        this.DessertImages = DessertImages; // Loaded dessert images
        this.bombImage = bombImage; // Loaded bomb image
        this.powerUpImages = powerUpImages; // Loaded power-up images
        this.swordImage = swordImage; // Loaded sword image for the cursor
        this.objectSize = 60; // Size of game objects (pixels)
        this.gameDuration = 60000; // Game duration in milliseconds (60 seconds)
        this.startTime = performance.now(); // Time when the game starts
        this.lastSpawnTime = 0; // Time of the last object spawn
        this.spawnInterval = 1500; // Initial interval between spawns (ms)
        this.cursorPosition = [640, 360]; // Initial cursor position (center of canvas)
        this.cursorTrail = []; // Array to store cursor trail positions for drawing
        this.maxTrailLength = 5; // Maximum length of the cursor trail
        this.fingerPositions = []; // Array to store recent finger positions for smoothing
        this.maxFingerPositions = 3; // Maximum number of finger positions to average
        this.maxObjects = 2; // Maximum number of objects on screen at once
        this.comboCount = 0; // Number of consecutive slices for combo multiplier
        this.lastSliceTime = 0; // Time of the last slice
        this.comboMultiplier = 1; // Multiplier for combo scoring
        this.freezeActive = false; // Tracks if the freeze power-up is active
        this.freezeStartTime = 0; // Time when the freeze power-up was activated
        this.freezeDuration = 5000; // Duration of the freeze power-up (ms)
        this.doubleScoreActive = false; // Tracks if the double score power-up is active
        this.doubleScoreStartTime = 0; // Time when the double score power-up was activated
        this.doubleScoreDuration = 5000; // Duration of the double score power-up (ms)
        this.slashBurstActive = false; // Tracks if the Slash Burst power-up is active
        this.slashBurstStartTime = 0; // Time when the Slash Burst was activated
        this.slashBurstDuration = 3000; // Duration of the Slash Burst effect (ms)
        this.slashBurstCooldown = 10000; // Cooldown for the Slash Burst (ms)
        this.lastSlashBurstTime = -this.slashBurstCooldown; // Time of the last Slash Burst
        this.lastFingerX = 640; // Last known X position of the finger
        this.lastFingerY = 360; // Last known Y position of the finger
        this.lastStatsUpdate = 0; // Time of the last stats update
        this.statsUpdateInterval = 1000; // Interval for updating stats display (ms)
      }

      // Function to spawn a new game object (dessert, bomb, or power-up)
      spawnObject() {
        const currentTime = performance.now();
        if (this.objects.length >= this.maxObjects) return; // Don't spawn if max objects reached
        if (currentTime - this.lastSpawnTime < this.spawnInterval) return; // Wait for spawn interval
        if (Math.random() < 0.3) return; // 30% chance to skip spawning for randomness
        const progress = Math.min((currentTime - this.startTime) / this.gameDuration, 1); // Game progress (0 to 1)
        this.spawnInterval = 1500 * (1 - 0.3 * progress); // Decrease spawn interval over time
        this.lastSpawnTime = currentTime; // Update last spawn time

        // Define object types and their spawn weights
        const types = ['icecream', 'donut', 'cupcake', 'bomb', 'freeze', 'double'];
        const weights = [0.3, 0.3, 0.2, 0.1 + 0.1 * progress, 0.05, 0.05]; // Weights adjust over time
        const type = this.weightedRandom(types, weights); // Select a type based on weights
        // Spawn the object within the canvas bounds
        const x = Math.random() * (1080 - 200) + 100;
        const y = Math.random() * (520 - 200) + 100;
        const angle = Math.random() * 2 * Math.PI; // Random direction
        const speed = 80 * (1 + progress); // Increase speed over time
        // Add the new object to the game
        this.objects.push({
          type,
          x,
          y,
          vx: Math.cos(angle) * speed, // X velocity
          vy: Math.sin(angle) * speed, // Y velocity
          sliced: false, // Tracks if the object has been sliced
          sliceTime: 0, // Time when the object was sliced
        });
      }

      // Utility function to select a random item based on weights
      weightedRandom(items, weights) {
        const total = weights.reduce((sum, w) => sum + w, 0); // Sum of all weights
        let r = Math.random() * total; // Random value between 0 and total weight
        for (let i = 0; i < items.length; i++) {
          r -= weights[i];
          if (r <= 0) return items[i]; // Return the selected item
        }
        return items[items.length - 1]; // Fallback to the last item
      }

      // Function to update the cursor position based on finger movement
      updateFingerPosition(fingerX, fingerY, baseX, baseY) {
        if (this.gameOver) return; // Don't update if the game is over

        const dirX = fingerX - baseX; // Direction from finger base to tip (X)
        const dirY = fingerY - baseY; // Direction from finger base to tip (Y)
        const length = Math.sqrt(dirX * dirX + dirY * dirY); // Distance between base and tip
        if (length > 0) {
          // Smooth the cursor position by averaging recent finger positions
          this.fingerPositions.push({ x: fingerX, y: fingerY });
          if (this.fingerPositions.length > this.maxFingerPositions) {
            this.fingerPositions.shift(); // Remove oldest position
          }
          const avgX = this.fingerPositions.reduce((sum, pos) => sum + pos.x, 0) / this.fingerPositions.length;
          const avgY = this.fingerPositions.reduce((sum, pos) => sum + pos.y, 0) / this.fingerPositions.length;
          this.cursorPosition = [avgX, avgY]; // Update cursor position

          // Update the cursor trail for visual effect
          this.cursorTrail.push([avgX, avgY, performance.now()]);
          if (this.cursorTrail.length > this.maxTrailLength) {
            this.cursorTrail.shift(); // Remove oldest trail point
          }

          // Check for a fast upward swipe to trigger Slash Burst
          const yDiff = this.lastFingerY - fingerY; // Vertical movement
          const xDiff = fingerX - this.lastFingerX; // Horizontal movement
          const speed = Math.hypot(xDiff, yDiff) / (performance.now() - lastRenderTimeRef.current || 1); // Swipe speed
          if (
            yDiff > 50 && // Upward swipe of at least 50 pixels
            speed > 0.5 && // Sufficient speed
            performance.now() - this.lastSlashBurstTime > this.slashBurstCooldown && // Cooldown elapsed
            !this.slashBurstActive // Slash Burst not already active
          ) {
            console.log('Slash Burst triggered by swipe');
            this.slashBurstActive = true;
            this.slashBurstStartTime = performance.now();
            this.lastSlashBurstTime = performance.now();
            // Slice all non-bomb objects on the screen
            this.objects.forEach((obj) => {
              if (obj.type !== 'bomb' && !obj.sliced) {
                this.sliceObject(obj, true);
              }
            });
            // Play the Slash Burst sound
            if (burstSoundRef.current) {
              burstSoundRef.current.currentTime = 0;
              burstSoundRef.current.play().catch((e) => console.log('Error playing sound:', e));
            }
          }
          this.lastFingerX = fingerX; // Update last finger position
          this.lastFingerY = fingerY;

          // Check for collisions between the cursor and game objects
          this.objects.forEach((obj) => {
            if (obj.sliced) return; // Skip already sliced objects
            const distX = Math.abs(avgX - obj.x); // Distance on X axis
            const distY = Math.abs(avgY - obj.y); // Distance on Y axis
            if (distX > this.objectSize && distY > this.objectSize) return; // Skip if too far
            const dist = Math.hypot(distX, distY); // Euclidean distance
            if (dist < this.objectSize / 2) { // Collision detected
              this.sliceObject(obj, false); // Slice the object
            }
          });
        }
      }

      // Function to handle slicing an object (dessert, bomb, or power-up)
      sliceObject(obj, isBurst) {
        if (obj.sliced) return; // Don't slice an already sliced object
        obj.sliced = true; // Mark the object as sliced
        obj.sliceTime = performance.now(); // Record the slice time
        const currentTime = performance.now();

        // Check for combos (multiple slices within 1 second)
        if (currentTime - this.lastSliceTime < 1000 && !isBurst) {
          this.comboCount += 1; // Increment combo count
          this.comboMultiplier = this.comboCount >= 4 ? 3 : this.comboCount >= 3 ? 2 : 1; // Set multiplier based on combo count
        } else {
          this.comboCount = 1; // Reset combo count
          this.comboMultiplier = 1; // Reset multiplier
        }
        this.lastSliceTime = currentTime; // Update last slice time

        // Handle different object types
        if (obj.type === 'bomb') {
          this.lives -= 1; // Lose a life
          if (bombSoundRef.current) {
            bombSoundRef.current.currentTime = 0;
            bombSoundRef.current.play().catch((e) => console.log('Error playing sound:', e));
          }
          if (this.lives <= 0) {
            this.gameOver = true; // End the game if no lives remain
          }
        } else if (obj.type === 'freeze') {
          console.log('Freeze power-up activated');
          this.freezeActive = true;
          this.freezeStartTime = currentTime;
          // Slow down all non-sliced objects
          this.objects.forEach((otherObj) => {
            if (!otherObj.sliced) {
              otherObj.vx *= 0.1; // Reduce X velocity by 90%
              otherObj.vy *= 0.1; // Reduce Y velocity by 90%
            }
          });
          if (sliceSoundRef.current) {
            sliceSoundRef.current.currentTime = 0;
            sliceSoundRef.current.play().catch((e) => console.log('Error playing sound:', e));
          }
        } else if (obj.type === 'double') {
          console.log(`Double Score power-up activated, base points: ${obj.type === 'icecream' ? 10 : obj.type === 'donut' ? 15 : 20}, multiplier: ${this.comboMultiplier}`);
          this.doubleScoreActive = true;
          this.doubleScoreStartTime = currentTime;
          // Double the points for the sliced object
          const points = (obj.type === 'icecream' ? 10 : obj.type === 'donut' ? 15 : 20) * 2 * this.comboMultiplier;
          this.score += points; // Add points to the score
          console.log(`Points awarded: ${points}, Total score: ${this.score}`);
          if (sliceSoundRef.current) {
            sliceSoundRef.current.currentTime = 0;
            sliceSoundRef.current.play().catch((e) => console.log('Error playing sound:', e));
          }
        } else {
          // Handle dessert slicing (ice cream, donut, cupcake)
          const basePoints = obj.type === 'icecream' ? 10 : obj.type === 'donut' ? 15 : 20; // Base points for each dessert
          const points = basePoints * (this.doubleScoreActive ? 2 : 1) * this.comboMultiplier; // Apply double score and combo multiplier
          this.score += points; // Add points to the score
          console.log(`Sliced ${obj.type}, Base points: ${basePoints}, Double: ${this.doubleScoreActive ? 2 : 1}, Combo: ${this.comboMultiplier}, Points awarded: ${points}, Total score: ${this.score}`);
          if (sliceSoundRef.current) {
            sliceSoundRef.current.currentTime = 0;
            sliceSoundRef.current.play().catch((e) => console.log('Error playing sound:', e));
          }
        }
      }

      // Function to update the game state without rendering
      updateWithoutRender(deltaTime) {
        if (this.gameOver) return; // Don't update if the game is over
        const deltaSeconds = deltaTime / 1000; // Convert delta time to seconds
        const currentTime = performance.now();
        if (currentTime - this.startTime > this.gameDuration) { // Check if the game time is up
          this.gameOver = true;
          return;
        }

        // Check if power-ups have expired
        if (this.freezeActive && currentTime - this.freezeStartTime > this.freezeDuration) {
          console.log('Freeze power-up deactivated');
          this.freezeActive = false;
        }
        if (this.doubleScoreActive && currentTime - this.doubleScoreStartTime > this.doubleScoreDuration) {
          console.log('Double Score power-up deactivated');
          this.doubleScoreActive = false;
        }
        if (this.slashBurstActive && currentTime - this.slashBurstStartTime > this.slashBurstDuration) {
          console.log('Slash Burst deactivated');
          this.slashBurstActive = false;
        }

        this.spawnObject(); // Spawn new objects as needed
        // Update object positions and remove off-screen or sliced objects
        this.objects = this.objects.filter((obj) => {
          obj.x += obj.vx * deltaSeconds; // Update X position
          obj.vy += 200 * deltaSeconds; // Apply gravity to Y velocity
          obj.y += obj.vy * deltaSeconds; // Update Y position
          if (obj.sliced && currentTime - obj.sliceTime > 500) return false; // Remove sliced objects after 500ms
          // Remove objects that are off-screen
          if (obj.x < -this.objectSize || obj.x > 1280 + this.objectSize || obj.y > 720 + this.objectSize || obj.y < -this.objectSize) return false;
          return true; // Keep the object
        });

        // Update the score and time display every second
        if (currentTime - this.lastStatsUpdate >= this.statsUpdateInterval) {
          this.stats.textContent = `Score: ${this.score} | Time: ${Math.max(0, Math.floor((this.gameDuration - (currentTime - this.startTime)) / 1000))}`;
          this.lastStatsUpdate = currentTime;
        }
      }


    
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
