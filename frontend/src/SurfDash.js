// Importing necessary React hooks for managing component state, lifecycle, and references
import React, { useEffect, useRef, useState } from 'react';
import './Game.css'; // Importing CSS for styling the game interface

// SurfDash is a React functional component that implements a lane-based runner game
// It uses hand-tracking via MediaPipe for controls and supports character/skate selection
const SurfDash = ({ setSelectedGame }) => {
  // useRef hooks to store references to DOM elements and persistent data
  // These persist across renders without triggering re-renders
  const videoRef = useRef(null); // Reference to the video element for webcam feed
  const canvasRef = useRef(null); // Reference to the canvas for rendering the game
  const gameStatsRef = useRef(null); // Reference to the DOM element displaying score and coins
  const gameOverRef = useRef(null); // Reference to the game over overlay
  const finalScoreRef = useRef(null); // Reference to the final score display
  const debugRef = useRef(null); // Reference to the debug message container
  const handsRef = useRef(null); // Reference to the MediaPipe Hands instance
  const cameraRef = useRef(null); // Reference to the MediaPipe Camera instance
  const gameObjectRef = useRef(null); // Reference to the GameLogic instance
  const gameStartedRef = useRef(false); // Tracks if the game has started
  const lastRenderTimeRef = useRef(0); // Stores the timestamp of the last render for delta time
  const runnerImageRef = useRef(null); // Reference to the runner's image
  const coinImageRef = useRef(null); // Reference to the coin image
  const hurdleImageRef = useRef(null); // Reference to the hurdle image
  const guardImageRef = useRef(null); // Reference to the guard image (used in death animation)
  const trainImageRef = useRef(null); // Reference to the train image
  const skateImageRef = useRef(null); // Reference to the skate image
  const bgMusicRef = useRef(null); // Reference to the background music audio
  const deathSoundRef = useRef(null); // Reference to the death sound audio
  const gameOverSoundRef = useRef(null); // Reference to the game over sound audio
  const immunitySoundRef = useRef(null); // Reference to the immunity sound audio

  // useState hooks for managing UI state
  const [showCharacterSelection, setShowCharacterSelection] = useState(true); // Controls character selection screen visibility
  const [hasSelectedCharacter, setHasSelectedCharacter] = useState(false); // Tracks if a character is selected
  const [showSkateSelection, setShowSkateSelection] = useState(false); // Controls skate selection screen visibility
  const [hasSelectedSkate, setHasSelectedSkate] = useState(false); // Tracks if a skate is selected
  const [selectedCharacter, setSelectedCharacter] = useState(null); // Stores the selected character ID
  const [selectedSkate, setSelectedSkate] = useState(null); // Stores the selected skate ID
  const [selectionMessage, setSelectionMessage] = useState(''); // Displays selection confirmation messages
  const [hoveredCharacter, setHoveredCharacter] = useState(null); // Tracks the currently hovered character
  const [hoveredSkate, setHoveredSkate] = useState(null); // Tracks the currently hovered skate
  const [immunityMessage, setImmunityMessage] = useState(false); // Controls immunity power-up message visibility
  const [skateMessage, setSkateMessage] = useState(false); // Controls skate power-up message visibility

  // GameLogic class encapsulates the core game mechanics
  class GameLogic {
    constructor(ctx, stats, runnerImage, coinImage, hurdleImage, guardImage, trainImage, skateImage) {
      // Initialize game state and assets
      this.lanes = [320, 640, 960]; // X-coordinates for three lanes
      this.currentLane = 1; // Start in the middle lane
      this.runnerY = 596; // Base Y-position of the runner
      this.jumpHeight = 0; // Current jump height
      this.isJumping = false; // Tracks if the runner is jumping
      this.isSliding = false; // Tracks if the runner is sliding
      this.jumpSpeed = 400; // Max height of jump
      this.jumpDuration = 800; // Duration of jump in milliseconds
      this.slideDuration = 800; // Duration of slide in milliseconds
      this.jumpStartTime = 0; // Timestamp when jump started
      this.slideStartTime = 0; // Timestamp when slide started
      this.hurdles = []; // Array of hurdle objects
      this.trains = []; // Array of train objects
      this.coins = []; // Array of coin objects
      this.score = 0; // Player's score
      this.coinsCollected = 0; // Number of coins collected
      this.gameOver = false; // Tracks if the game is over
      this.deathAnimation = false; // Tracks if death animation is playing
      this.deathStartTime = 0; // Timestamp when death animation started
      this.deathDuration = 1000; // Duration of death animation
      this.fallDistance = 200; // Distance the runner falls during death animation
      this.speed = 150; // Initial speed of objects moving toward the player
      this.maxSpeed = 400; // Maximum speed
      this.speedIncrease = 0.1; // Rate of speed increase per second
      this.ctx = ctx; // Canvas context for rendering
      this.stats = stats; // DOM element for displaying stats
      this.runnerImage = runnerImage; // Runner image
      this.coinImage = coinImage; // Coin image
      this.hurdleImage = hurdleImage; // Hurdle image
      this.guardImage = guardImage; // Guard image
      this.trainImage = trainImage; // Train image
      this.skateImage = skateImage; // Skate image
      this.objectSize = 60; // Base size of objects
      this.lastSpawnTime = 0; // Timestamp of last object spawn
      this.spawnInterval = 2000; // Minimum time between spawns (ms)
      this.lastFingerY = 360; // Last Y-position of finger for gesture detection
      this.startTime = performance.now(); // Game start timestamp
      this.minSpawnDistance = 200; // Minimum distance between spawned objects
      this.immunityActive = false; // Tracks if immunity power-up is active
      this.skateActive = false; // Tracks if skate power-up is active
      this.skateUsed = false; // Tracks if skate power-up has been used
    }

    // Spawns a new object (coin, hurdle, or train) in a random lane
    spawnObject() {
      const currentTime = performance.now();
      // Ensure enough time has passed since last spawn
      if (currentTime - this.lastSpawnTime < this.spawnInterval) return;
      // Prevent spawning if last object is too close
      const lastHurdle = this.hurdles[this.hurdles.length - 1];
      const lastTrain = this.trains[this.trains.length - 1];
      if ((lastHurdle && lastHurdle.z < this.minSpawnDistance) || (lastTrain && lastTrain.z < this.minSpawnDistance)) return;
      this.lastSpawnTime = currentTime;
      const lane = Math.floor(Math.random() * 3); // Random lane (0, 1, or 2)
      // Randomly choose object type: 50% coin, 25% hurdle, 25% train
      const type = Math.random() < 0.5 ? 'coin' : Math.random() < 0.5 ? 'hurdle' : 'train';
      const z = 0; // Start at z=0 (far end of the track)
      if (type === 'coin') {
        this.coins.push({ lane, z });
      } else if (type === 'hurdle') {
        const hurdleType = Math.random() < 0.5 ? 'high' : 'low'; // Randomly high or low hurdle
        this.hurdles.push({ lane, z, type: hurdleType });
        console.log(`Spawned hurdle: Lane ${lane}, Type: ${hurdleType}, z: ${z}`);
      } else {
        const trainType = Math.random() < 0.5 ? 'high' : 'low'; // Randomly high or low train
        this.trains.push({ lane, z, type: trainType });
        console.log(`Spawned train: Lane ${lane}, Type: ${trainType}, z: ${z}`);
      }
    }

    // Updates runner's lane and actions based on hand position
    updateFingerPosition(fingerX, fingerY) {
      if (this.gameOver) return; // Ignore input if game is over
      // Divide canvas into three sections for lane selection
      if (fingerX < 1280 / 3) {
        this.currentLane = 0;
      } else if (fingerX < (1280 * 2) / 3) {
        this.currentLane = 1;
      } else {
        this.currentLane = 2;
      }
      // Detect vertical hand movement for jump or slide
      const yDiff = this.lastFingerY - fingerY;
      if (yDiff > 30 && !this.isJumping && !this.isSliding) {
        this.jump();
        console.log(`Jump triggered: yDiff=${yDiff}, fingerY=${fingerY}`);
      } else if (yDiff < -30 && !this.isJumping && !this.isSliding) {
        this.slide();
        console.log(`Slide triggered: yDiff=${yDiff}, fingerY=${fingerY}`);
      }
      this.lastFingerY = fingerY; // Update last finger Y position
    }

    // Moves the runner left if not in the leftmost lane
    moveLeft() {
      if (this.gameOver) return;
      if (this.currentLane > 0) this.currentLane -= 1;
    }

    // Moves the runner right if not in the rightmost lane
    moveRight() {
      if (this.gameOver) return;
      if (this.currentLane < 2) this.currentLane += 1;
    }

    // Initiates a jump action
    jump() {
      if (this.gameOver || this.isJumping || this.isSliding) return;
      this.isJumping = true;
      this.jumpStartTime = performance.now();
      try {
        const moveSound = new Audio('/static/sounds/movement.mp3');
        moveSound.volume = 0.5;
        moveSound.play().catch((e) => console.log('Error playing sound:', e));
      } catch (e) {
        console.log('Could not play sound:', e);
      }
    }

    // Initiates a slide action
    slide() {
      if (this.gameOver || this.isJumping || this.isSliding) return;
      this.isSliding = true;
      this.slideStartTime = performance.now();
      try {
        const moveSound = new Audio('/static/sounds/movement.mp3');
        moveSound.volume = 0.5;
        moveSound.play().catch((e) => console.log('Error playing sound:', e));
      } catch (e) {
        console.log('Could not play sound:', e);
      }
    }

    // Plays death and game over sounds sequentially
    playGameOverSounds() {
      try {
        deathSoundRef.current.play().catch((e) => console.log('Error playing death sound:', e));
        deathSoundRef.current.onended = () => {
          gameOverSoundRef.current.play().catch((e) => console.log('Error playing game over sound:', e));
          // Reset sounds after 10 seconds to prevent overlap
          setTimeout(() => {
            deathSoundRef.current.pause();
            deathSoundRef.current.currentTime = 0;
            gameOverSoundRef.current.pause();
            gameOverSoundRef.current.currentTime = 0;
          }, 10000);
        };
      } catch (e) {
        console.log('Could not play game over sounds:', e);
      }
    }

    // Plays immunity sound when activated
    playImmunitySound() {
      try {
        immunitySoundRef.current.play().catch((e) => console.log('Error playing immunity sound:', e));
        immunitySoundRef.current.onended = () => {
          immunitySoundRef.current.pause();
          immunitySoundRef.current.currentTime = 0;
        };
      } catch (e) {
        console.log('Could not play immunity sound:', e);
      }
    }

    // Updates game state without rendering (called each frame)
    updateWithoutRender(deltaTime, setImmunityMessage, setSkateMessage) {
      if (this.gameOver && !this.deathAnimation) return; // Stop updating if game over and no death animation
      const deltaSeconds = deltaTime / 1000; // Convert delta time to seconds
      if (!this.gameOver) {
        // Adjust speed based on skate power-up
        const currentSpeed = this.skateActive ? this.speed * 1.2 : this.speed;
        // Gradually increase speed up to max
        this.speed = Math.min(this.speed + this.speedIncrease * deltaSeconds, this.maxSpeed);
        this.spawnObject(); // Attempt to spawn new objects
        // Handle jumping animation
        if (this.isJumping) {
          const jumpTime = performance.now() - this.jumpStartTime;
          const t = jumpTime / this.jumpDuration;
          if (t >= 1) {
            this.isJumping = false;
            this.jumpHeight = 0;
          } else {
            // Parabolic jump trajectory
            this.jumpHeight = this.jumpSpeed * (1 - Math.pow(t - 1, 2));
          }
        }
        // Handle sliding animation
        if (this.isSliding) {
          const slideTime = performance.now() - this.slideStartTime;
          if (slideTime >= this.slideDuration) {
            this.isSliding = false;
          }
        }
        const moveDistance = currentSpeed * deltaSeconds; // Distance objects move this frame
        // Update coins
        this.coins = this.coins.filter((coin) => {
          coin.z += moveDistance; // Move coin closer
          const screenY = this.mapZToScreenY(coin.z); // Convert z to screen Y
          if (screenY > 720) return false; // Remove coins off screen
          // Check for coin collection
          if (coin.lane === this.currentLane && screenY > 590 && screenY < 610 && !this.isJumping && !this.isSliding) {
            this.coinsCollected += 1;
            this.score += 10;
            this.stats.textContent = `Score: ${this.score} | Coins: ${this.coinsCollected}`;
            try {
              const coinSound = new Audio('/static/sounds/coin.mp3');
              coinSound.volume = 0.5;
              coinSound.play().catch((e) => console.log('Error playing sound:', e));
            } catch (e) {
              console.log('Could not play sound:', e);
            }
            // Activate immunity at 10 coins
            if (this.coinsCollected >= 10 && !this.immunityActive) {
              this.immunityActive = true;
              this.playImmunitySound();
              setImmunityMessage(true);
              console.log('Immunity activated at 10 coins collected!');
              setTimeout(() => {
                setImmunityMessage(false);
                console.log('Immunity message hidden');
              }, 3000);
            }
            // Activate skate at 5 coins
            if (this.coinsCollected >= 5 && !this.skateActive && !this.skateUsed) {
              this.skateActive = true;
              this.skateUsed = true;
              setSkateMessage(true);
              console.log('Skate power-up activated at 5 coins collected!');
              setTimeout(() => {
                setSkateMessage(false);
                console.log('Skate message hidden');
              }, 3000);
            }
            return false; // Remove collected coin
          }
          return true;
        });
        // Update hurdles
        this.hurdles = this.hurdles.filter((hurdle) => {
          hurdle.z += moveDistance; // Move hurdle closer
          const screenY = this.mapZToScreenY(hurdle.z);
          if (screenY > 720) return false; // Remove hurdles off screen
          // Check for collision
          if (hurdle.lane === this.currentLane && screenY > 590 && screenY < 610) {
            const isHighHurdle = hurdle.type === 'high';
            const isLowHurdle = hurdle.type === 'low';
            const jumpBuffer = (performance.now() - this.jumpStartTime) < this.jumpDuration + 100;
            const slideBuffer = (performance.now() - this.slideStartTime) < this.slideDuration + 100;
            const avoided = (isHighHurdle && (this.isJumping || jumpBuffer)) || (isLowHurdle && (this.isSliding || slideBuffer));
            console.log(`Hurdle at screenY: ${screenY.toFixed(2)}, Type: ${hurdle.type}, isJumping: ${this.isJumping}, isSliding: ${this.isSliding}, jumpBuffer: ${jumpBuffer}, slideBuffer: ${slideBuffer}, Avoided: ${avoided}`);
            if (!avoided && this.skateActive) {
              this.skateActive = false; // Consume skate power-up
              console.log('Skate used to avoid hurdle collision!');
              return false;
            } else if (!avoided && this.immunityActive) {
              this.immunityActive = false; // Consume immunity
              this.playImmunitySound();
              console.log('Immunity used to avoid hurdle collision!');
              return false;
            } else if (!avoided) {
              console.log(`Collision detected with hurdle! Game Over. Lane: ${hurdle.lane}, Runner Lane: ${this.currentLane}, Hurdle Y: ${screenY.toFixed(2)}, z: ${hurdle.z.toFixed(2)}`);
              this.gameOver = true;
              this.deathAnimation = true;
              this.deathStartTime = performance.now();
              bgMusicRef.current.pause();
              bgMusicRef.current.currentTime = 0;
              this.playGameOverSounds();
              return false;
            } else {
              console.log(`Hurdle avoided successfully!`);
            }
          }
          return true;
        });
        // Update trains (similar to hurdles)
        this.trains = this.trains.filter((train) => {
          train.z += moveDistance;
          const screenY = this.mapZToScreenY(train.z);
          if (screenY > 720) return false;
          if (train.lane === this.currentLane && screenY > 590 && screenY < 610) {
            const isHighTrain = train.type === 'high';
            const isLowTrain = train.type === 'low';
            const jumpBuffer = (performance.now() - this.jumpStartTime) < this.jumpDuration + 100;
            const slideBuffer = (performance.now() - this.slideStartTime) < this.slideDuration + 100;
            const avoided = (isHighTrain && (this.isJumping || jumpBuffer)) || (isLowTrain && (this.isSliding || slideBuffer));
            console.log(`Train at screenY: ${screenY.toFixed(2)}, Type: ${train.type}, isJumping: ${this.isJumping}, isSliding: ${this.isSliding}, jumpBuffer: ${jumpBuffer}, slideBuffer: ${slideBuffer}, Avoided: ${avoided}`);
            if (!avoided && this.skateActive) {
              this.skateActive = false;
              console.log('Skate used to avoid train collision!');
              return false;
            } else if (!avoided && this.immunityActive) {
              this.immunityActive = false;
              this.playImmunitySound();
              console.log('Immunity used to avoid train collision!');
              return false;
            } else if (!avoided) {
              console.log(`Collision detected with train! Game Over. Lane: ${train.lane}, Runner Lane: ${this.currentLane}, Train Y: ${screenY.toFixed(2)}, z: ${train.z.toFixed(2)}`);
              this.gameOver = true;
              this.deathAnimation = true;
              this.deathStartTime = performance.now();
              bgMusicRef.current.pause();
              bgMusicRef.current.currentTime = 0;
              this.playGameOverSounds();
              return false;
            } else {
              console.log(`Train avoided successfully!`);
            }
          }
          return true;
        });
        // Increment score based on distance traveled
        this.score += Math.floor(moveDistance / 10);
        this.stats.textContent = `Score: ${this.score} | Coins: ${this.coinsCollected}`;
      }
      // Handle death animation
      if (this.deathAnimation) {
        const deathTime = performance.now() - this.deathStartTime;
        if (deathTime >= this.deathDuration) {
          this.deathAnimation = false;
        }
      }
    }

    // Converts z-depth to screen Y-coordinate for perspective
    mapZToScreenY(z) {
      const horizonY = 100; // Horizon line at top
      const bottomY = 720; // Bottom of canvas
      const runnerZ = 600; // Runner's z-position
      return horizonY + (bottomY - horizonY) * ((z + runnerZ) / 1000);
    }

    // Scales objects based on z-depth for perspective
    mapZToScale(z) {
      return 0.5 + 0.5 * (1000 - z) / 1000;
    }

    // Renders the game scene to the canvas
    render(ctx) {
      // Draw road with gradient
      const roadGradient = ctx.createLinearGradient(0, 100, 0, 720);
      roadGradient.addColorStop(0, '#A9A9A9');
      roadGradient.addColorStop(1, '#696969');
      ctx.fillStyle = roadGradient;
      ctx.beginPath();
      ctx.moveTo(200, 720);
      ctx.lineTo(480, 100);
      ctx.lineTo(800, 100);
      ctx.lineTo(1080, 720);
      ctx.closePath();
      ctx.fill();

      // Draw lane lines
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      for (let i = 0; i < 3; i++) {
        const x = this.lanes[i];
        ctx.beginPath();
        ctx.moveTo(x, 720);
        ctx.lineTo(x, 100);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Render coins
      this.coins.forEach((coin) => {
        const screenY = this.mapZToScreenY(coin.z);
        const scale = this.mapZToScale(coin.z);
        const size = this.objectSize * scale;
        if (this.coinImage && this.coinImage.complete) {
          ctx.drawImage(this.coinImage, this.lanes[coin.lane] - size / 2, screenY - size / 2, size, size);
        } else {
          // Fallback rendering
          ctx.beginPath();
          ctx.arc(this.lanes[coin.lane], screenY, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
        }
      });

      // Render hurdles
      this.hurdles.forEach((hurdle) => {
        const screenY = this.mapZToScreenY(hurdle.z);
        const scale = this.mapZToScale(hurdle.z);
        const size = this.objectSize * scale;
        if (this.hurdleImage && this.hurdleImage.complete) {
          ctx.drawImage(this.hurdleImage, this.lanes[hurdle.lane] - size / 2, screenY - size / 2, size, size);
        } else {
          ctx.fillStyle = hurdle.type === 'high' ? '#FF0000' : '#FFA500';
          ctx.fillRect(this.lanes[hurdle.lane] - size / 2, screenY - size / 2, size, size);
        }
      });

      // Render trains
      this.trains.forEach((train) => {
        const screenY = this.mapZToScreenY(train.z);
        const scale = this.mapZToScale(train.z);
        const size = this.objectSize * scale;
        if (this.trainImage && this.trainImage.complete) {
          ctx.drawImage(this.trainImage, this.lanes[train.lane] - size / 2, screenY - size / 2, size, size);
        } else {
          ctx.fillStyle = train.type === 'high' ? '#4682B4' : '#87CEEB';
          ctx.fillRect(this.lanes[train.lane] - size / 2, screenY - size / 2, size, size);
        }
      });

      // Render runner
      const runnerX = this.lanes[this.currentLane];
      let runnerY = this.runnerY - this.jumpHeight;
      let runnerSize = this.objectSize * this.mapZToScale(600);
      if (this.isSliding) {
        runnerY += 20; // Adjust Y-position for sliding
      }
      if (this.deathAnimation) {
        const deathTime = performance.now() - this.deathStartTime;
        const t = Math.min(deathTime / this.deathDuration, 1);
        runnerY += this.fallDistance * t; // Fall during death animation
        runnerSize *= 1.5; // Enlarge runner
        if (this.runnerImage && this.runnerImage.complete) {
          ctx.drawImage(this.runnerImage, runnerX - runnerSize / 2, runnerY - runnerSize / 2, runnerSize, runnerSize);
        } else {
          ctx.beginPath();
          ctx.arc(runnerX, runnerY, runnerSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#00FF00';
          ctx.fill();
        }
        // Render guard in death animation
        if (this.guardImage && this.guardImage.complete) {
          ctx.drawImage(this.guardImage, runnerX + runnerSize / 2, runnerY - runnerSize / 2, runnerSize, runnerSize);
        } else {
          ctx.fillStyle = '#800080';
          ctx.fillRect(runnerX + runnerSize / 2, runnerY - runnerSize / 2, runnerSize, runnerSize);
        }
      } else if (!this.gameOver) {
        // Render skate if active
        if (this.skateActive && this.skateImage && this.skateImage.complete) {
          ctx.drawImage(this.skateImage, runnerX - runnerSize / 2, runnerY + runnerSize / 4, runnerSize, runnerSize * 0.3);
        } else if (this.skateActive) {
          ctx.fillStyle = '#00CED1';
          ctx.fillRect(runnerX - runnerSize / 2, runnerY + runnerSize / 4, runnerSize, runnerSize * 0.3);
        }
        // Render runner
        if (this.runnerImage && this.runnerImage.complete) {
          ctx.drawImage(this.runnerImage, runnerX - runnerSize / 2, runnerY - runnerSize / 2, runnerSize, this.isSliding ? runnerSize * 0.6 : runnerSize);
        } else {
          ctx.beginPath();
          ctx.arc(runnerX, runnerY, runnerSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#00FF00';
          ctx.fill();
        }
      }  
    }
  }

  // Handles character selection
  const selectCharacter = (character) => {
    console.log(`Selecting character ${character}`);
    runnerImageRef.current = new Image();
    runnerImageRef.current.src = `/static/images/character${character}.png`;
    runnerImageRef.current.onload = () => {
      console.log(`Character ${character} image loaded successfully`);
      setSelectedCharacter(character);
      setSelectionMessage(`Yay, you chose Character ${character}!`);
      setHoveredCharacter(character);
      setTimeout(() => {
        setShowCharacterSelection(false);
        setHasSelectedCharacter(true);
        setShowSkateSelection(true);
        setSelectionMessage('');
        setHoveredCharacter(null);
      }, 2000); // Transition to skate selection after 2 seconds
    };
  };

  // Handles skate selection
  const selectSkate = (skate) => {
    console.log(`Selecting skate ${skate}`);
    skateImageRef.current = new Image();
    skateImageRef.current.src = `/static/images/skate${skate}.png`;
    skateImageRef.current.onload = () => {
      console.log(`Skate ${skate} image loaded successfully`);
      setSelectedSkate(skate);
      setSelectionMessage(`Yay, you chose Skate ${skate}!`);
      setHoveredSkate(skate);
      setTimeout(() => {
        setShowSkateSelection(false);
        setHasSelectedSkate(true);
        setSelectionMessage('');
        setHoveredSkate(null);
      }, 2000); // Transition to game after 2 seconds
    };
  };

  // Initializes MediaPipe Hands for hand-tracking
  const initHandDetection = () => {
    try {
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1, // Track one hand
        modelComplexity: 1, // Higher complexity for better accuracy
        minDetectionConfidence: 0.7, // Confidence thresholds
        minTrackingConfidence: 0.7,
      });
      handsRef.current.onResults((results) =>
        onHandResults(results, canvasRef.current.getContext('2d'), videoRef.current, gameObjectRef.current, gameStartedRef.current, gameOverRef.current, finalScoreRef.current)
      );
      console.log('MediaPipe Hands initialized');
    } catch (error) {
      debugRef.current.innerHTML = `<p class="warning">Hand detection error: ${error.message}</p>`;
    }
  };

  // Starts the webcam feed
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
      });
      videoRef.current.srcObject = stream;
      await new Promise((resolve) => (videoRef.current.onloadedmetadata = resolve));
      videoRef.current.play();
      cameraRef.current = new window.Camera(videoRef.current, {
        onFrame: async () => await handsRef.current.send({ image: videoRef.current }),
        width: 1280,
        height: 720,
      });
      await cameraRef.current.start();
      console.log('Camera started successfully');
    } catch (error) {
      debugRef.current.innerHTML = `<p class="warning">Camera error: ${error.message}</p>`;
      alert('Camera access error: ' + error.message);
    }
  };

  // Starts the game after assets are loaded
  const startGame = () => {
    if (!gameStartedRef.current && runnerImageRef.current && skateImageRef.current) {
      console.log('Starting game...');
      startCamera()
        .then(() => {
          gameObjectRef.current = new GameLogic(
            canvasRef.current.getContext('2d'),
            gameStatsRef.current,
            runnerImageRef.current,
            coinImageRef.current,
            hurdleImageRef.current,
            guardImageRef.current,
            trainImageRef.current,
            skateImageRef.current
          );
          gameStartedRef.current = true;
          lastRenderTimeRef.current = performance.now();
          gameOverRef.current.style.display = 'none';
          bgMusicRef.current.play().catch((e) => console.log('Error playing background music:', e));
          requestAnimationFrame(gameLoop); // Start game loop
          console.log('Game started successfully');
        })
        .catch((error) => {
          console.error('Start game error:', error);
          alert('Failed to start game: ' + error.message);
        });
    } else {
      console.log('Game not started: already running or assets not selected');
    }
  };

  // Game loop to update and render the game
  const gameLoop = (timestamp) => {
    if (gameStartedRef.current && gameObjectRef.current) {
      const deltaTime = timestamp - lastRenderTimeRef.current;
      lastRenderTimeRef.current = timestamp;
      gameObjectRef.current.updateWithoutRender(deltaTime, setImmunityMessage, setSkateMessage);
      requestAnimationFrame(gameLoop); // Continue loop
    }
  };

  // Processes hand-tracking results and updates game
  const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
    ctx.save();
    ctx.clearRect(0, 0, 1280, 720); // Clear canvas
    ctx.save();
    ctx.translate(1280, 0);
    ctx.scale(-1, 1); // Mirror video feed
    ctx.drawImage(results.image, 0, 0, 1280, 720);
    ctx.restore();
    if (started && gameObj) {
      if (!gameObj.gameOver || gameObj.deathAnimation) {
        // Update runner position based on hand tracking
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          const indexFinger = results.multiHandLandmarks[0][8]; // Index finger tip
          const fingerX = Math.floor(1280 - indexFinger.x * 1280); // Mirror X-coordinate
          const fingerY = Math.floor(indexFinger.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY);
        }
        gameObj.render(ctx); // Render game
      }
      // Display game over screen
      if (gameObj.gameOver && !gameObj.deathAnimation) {
        drawGameOverOnCanvas(ctx, gameObj.score, over, score);
      }
    }
    ctx.restore();
  };

  return <div></div>;
};

export default SurfDash;