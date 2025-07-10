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
  const backgroundImageRef = useRef(null); // Reference to background Image

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
  const [showGame, setShowGame] = useState(false);

  // GameLogic class encapsulates the core game mechanics
  class GameLogic {
    constructor(ctx, stats, runnerImage, coinImage, hurdleImage, guardImage, trainImage, skateImage, backgroundImage, videoElement) {
      // Initialize game state and assets
      this.lanes = [150, 640, 1150]; // X-coordinates for three lanes
      this.currentLane = 1; // Start in the middle lane
      this.runnerY = 620; // Base Y-position of the runner
      this.jumpHeight = 0; // Current jump height
      this.isJumping = false; // Tracks if the runner is jumping
      this.isSliding = false; // Tracks if the runner is sliding
      this.jumpSpeed = 200; // Max height of jump
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
      this.objectSize = 200; // Base size of objects
      this.lastSpawnTime = 0; // Timestamp of last object spawn
      this.spawnInterval = 2000; // Minimum time between spawns (ms)
      this.lastFingerY = 360; // Last Y-position of finger for gesture detection
      this.startTime = performance.now(); // Game start timestamp
      this.minSpawnDistance = 200; // Minimum distance between spawned objects
      this.immunityActive = false; // Tracks if immunity power-up is active
      this.skateActive = false; // Tracks if skate power-up is active
      this.skateUsed = false; // Tracks if skate power-up has been used
      this.backgroundImage = backgroundImage; //used for background image
      this.curveFactor = 0.85; // Controls curvature strength
      this.startOffset = 190; // Initial x offset at z=0
      this.collisionWarnings = new Map(); // Store active warnings
      this.warningDistance = 100; // Distance at which to show warning
      this.videoElement = videoElement; // Store video element for camera preview
    }

    // New method to calculate dynamic x position based on z and lane
    getLaneX(lane, z) {
      if (lane === 1) return this.lanes[lane]; // Center lane is straight
      const t = z / 600; // Normalize z from 0 to 600 (runner position)
      let offset;
      if (lane === 0) {
        // Left lane: Start more to the right, curve left
        offset = this.startOffset * (1 - t) * this.curveFactor;
        return this.lanes[lane] + offset;
      } else {
        // Right lane: Start more to the left, curve right
        offset = this.startOffset * (1 - t) * this.curveFactor;
        return this.lanes[lane] - offset;
      }
    }

    //new method to display warnings before collision of character with object
    updateCollisionWarnings() {
      this.collisionWarnings.clear();
      this.hurdles.forEach((hurdle, index) => {
        if (hurdle.lane === this.currentLane && hurdle.z < this.warningDistance && hurdle.z > -50) {
          this.collisionWarnings.set(`hurdle_${index}`, {
            type: 'hurdle',
            object: hurdle,
            intensity: Math.max(0, 1 - (hurdle.z + 50) / (this.warningDistance + 50))
          });
        }
      });
      this.trains.forEach((train, index) => {
        if (train.lane === this.currentLane && train.z < this.warningDistance && train.z > -50) {
          this.collisionWarnings.set(`train_${index}`, {
            type: 'train',
            object: train,
            intensity: Math.max(0, 1 - (train.z + 50) / (this.warningDistance + 50))
          });
        }
      });
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
      const z = -150; // Start at z=-150 for initial offset to match background image
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
        this.updateCollisionWarnings();
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
          const coinX = this.getLaneX(coin.lane, coin.z);
          // Check for coin collection
          if (coin.lane === this.currentLane && screenY > 610 && screenY < 630 && !this.isJumping && !this.isSliding) {
            const runnerX = this.getLaneX(this.currentLane, 600);
            if (Math.abs(coinX - runnerX) < this.objectSize / 2) {
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
          }
          return true;
        });
        // Update hurdles
        this.hurdles = this.hurdles.filter((hurdle) => {
          hurdle.z += moveDistance; // Move hurdle closer
          const screenY = this.mapZToScreenY(hurdle.z);
          if (screenY > 720) return false; // Remove hurdles off screen
          const hurdleX = this.getLaneX(hurdle.lane, hurdle.z);
          if (hurdle.lane === this.currentLane && screenY > 580 && screenY < 660) {
            const runnerX = this.getLaneX(this.currentLane, 600);
            if (Math.abs(hurdleX - runnerX) < this.objectSize * 0.8) {
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
            }
          }
          return true;
        });
        
        // Update trains
        this.trains = this.trains.filter((train) => {
          train.z += moveDistance;
          const screenY = this.mapZToScreenY(train.z);
          if (screenY > 720) return false;
          const trainX = this.getLaneX(train.lane, train.z);
          if (train.lane === this.currentLane && screenY > 610 && screenY < 630) {
            const runnerX = this.getLaneX(this.currentLane, 600);
            if (Math.abs(trainX - runnerX) < this.objectSize / 2) {
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
      
      //render background image
      if (this.backgroundImage && this.backgroundImage.complete) {
        ctx.drawImage(this.backgroundImage, 0, 0, 1280, 720);
      } else {
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(0, 0, 1280, 720);
      }

      // Render coins
      this.coins.forEach((coin) => {
        const screenY = this.mapZToScreenY(coin.z);
        const scale = this.mapZToScale(coin.z);
        const size = this.objectSize * scale;
        const x = this.getLaneX(coin.lane, coin.z);
        if (this.coinImage && this.coinImage.complete) {
          ctx.drawImage(this.coinImage, x - size / 2, screenY - size / 2, size, size);
        } else {
          //fallback rendering
          ctx.beginPath();
          ctx.arc(x, screenY, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
        }
      });

      // Render hurdles
      this.hurdles.forEach((hurdle) => {
        const screenY = this.mapZToScreenY(hurdle.z);
        const scale = this.mapZToScale(hurdle.z);
        const size = this.objectSize * scale;
        const x = this.getLaneX(hurdle.lane, hurdle.z);
        if (this.hurdleImage && this.hurdleImage.complete) {
          ctx.drawImage(this.hurdleImage, x - size / 2, screenY - size / 2, size, size);
        } else {
          ctx.fillStyle = hurdle.type === 'high' ? '#FF0000' : '#FFA500';
          ctx.fillRect(x - size / 2, screenY - size / 2, size, size);
        }
      });

      // Render trains
      this.trains.forEach((train) => {
        const screenY = this.mapZToScreenY(train.z);
        const scale = this.mapZToScale(train.z);
        const size = this.objectSize * scale;
        const x = this.getLaneX(train.lane, train.z);
        if (this.trainImage && this.trainImage.complete) {
          ctx.drawImage(this.trainImage, x - size / 2, screenY - size / 2, size, size);
        } else {
          ctx.fillStyle = train.type === 'high' ? '#4682B4' : '#87CEEB';
          ctx.fillRect(x - size / 2, screenY - size / 2, size, size);
        }
      });

      this.collisionWarnings.forEach((warning) => {
        const obj = warning.object;
        const screenY = this.mapZToScreenY(obj.z);
        const scale = this.mapZToScale(obj.z);
        const size = this.objectSize * scale;
        const x = this.getLaneX(obj.lane, obj.z);
        const alpha = 0.3 + 0.4 * Math.sin(Date.now() * 0.01) * warning.intensity;
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 15 * warning.intensity;
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(x - size / 2 - 10, screenY - size / 2 - 10, size + 20, size + 20);
        ctx.setLineDash([]);
      });
      if (this.collisionWarnings.size > 0) {
        const maxIntensity = Math.max(...Array.from(this.collisionWarnings.values()).map(w => w.intensity));
        const flashAlpha = 0.1 * maxIntensity * (0.5 + 0.5 * Math.sin(Date.now() * 0.02));
        ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
        ctx.fillRect(0, 0, 1280, 720);
      }
      
      // Render runner
      const runnerX = this.getLaneX(this.currentLane, 600);
      let runnerY = this.runnerY - this.jumpHeight;
      let runnerSize = this.objectSize * this.mapZToScale(600);
      if (this.isSliding) {
        runnerY += 30; // Adjust Y-position for sliding
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
      
      // Camera preview box
      const previewBoxX = 70;
      const previewBoxY = 80;
      const previewBoxWidth = 320;
      const previewBoxHeight = 240;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);
      ctx.strokeStyle = '#1E90FF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#1E90FF';
      ctx.shadowBlur = 10;
      ctx.strokeRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CAMERA PREVIEW', previewBoxX + previewBoxWidth / 2, previewBoxY - 10);

      if (this.videoElement && this.videoElement.videoWidth > 0) {
        const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
        const boxAspect = previewBoxWidth / previewBoxHeight;
        let drawWidth, drawHeight, drawX, drawY;
        if (videoAspect > boxAspect) {
          drawHeight = previewBoxHeight;
          drawWidth = drawHeight * videoAspect;
          drawX = previewBoxX - (drawWidth - previewBoxWidth) / 2;
          drawY = previewBoxY;
        } else {
          drawWidth = previewBoxWidth;
          drawHeight = drawWidth / videoAspect;
          drawX = previewBoxX;
          drawY = previewBoxY + (previewBoxHeight - drawHeight) / 2;
        }
        ctx.save();
        ctx.rect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight);
        ctx.clip();
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(this.videoElement, -drawX - drawWidth, drawY, drawWidth, drawHeight);
        ctx.restore();
        ctx.restore();
      }

      // Control regions overlay
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(previewBoxX, previewBoxY, previewBoxWidth * 0.33, previewBoxHeight);
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(previewBoxX, previewBoxY, previewBoxWidth * 0.33, previewBoxHeight);

      ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
      ctx.fillRect(previewBoxX + previewBoxWidth * 0.67, previewBoxY, previewBoxWidth * 0.33, previewBoxHeight);
      ctx.strokeStyle = '#0000FF';
      ctx.strokeRect(previewBoxX + previewBoxWidth * 0.67, previewBoxY, previewBoxWidth * 0.33, previewBoxHeight);

      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.fillRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight * 0.25);
      ctx.strokeStyle = '#00FF00';
      ctx.strokeRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight * 0.25);

      ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
      ctx.fillRect(previewBoxX, previewBoxY + previewBoxHeight * 0.75, previewBoxWidth, previewBoxHeight * 0.25);
      ctx.strokeStyle = '#FFFF00';
      ctx.strokeRect(previewBoxX, previewBoxY + previewBoxHeight * 0.75, previewBoxWidth, previewBoxHeight * 0.25);
      ctx.setLineDash([]);

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('LEFT', previewBoxX + previewBoxWidth * 0.165, previewBoxY + previewBoxHeight / 2);
      ctx.fillText('LEFT', previewBoxX + previewBoxWidth * 0.165, previewBoxY + previewBoxHeight / 2);
      ctx.strokeText('RIGHT', previewBoxX + previewBoxWidth * 0.835, previewBoxY + previewBoxHeight / 2);
      ctx.fillText('RIGHT', previewBoxX + previewBoxWidth * 0.835, previewBoxY + previewBoxHeight / 2);
      ctx.strokeText('JUMP', previewBoxX + previewBoxWidth / 2, previewBoxY + previewBoxHeight * 0.125);
      ctx.fillText('JUMP', previewBoxX + previewBoxWidth / 2, previewBoxY + previewBoxHeight * 0.125);
      ctx.strokeText('SLIDE', previewBoxX + previewBoxWidth / 2, previewBoxY + previewBoxHeight * 0.875);
      ctx.fillText('SLIDE', previewBoxX + previewBoxWidth / 2, previewBoxY + previewBoxHeight * 0.875);

      // Instructions box
      const instructionsBoxX = 1000;
      const instructionsBoxY = 200;
      const instructionsBoxWidth = 220;
      const instructionsBoxHeight = 300;

      const gradient = ctx.createLinearGradient(instructionsBoxX, instructionsBoxY, instructionsBoxX, instructionsBoxY + instructionsBoxHeight);
      gradient.addColorStop(0, '#2a2a2a');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(instructionsBoxX, instructionsBoxY, instructionsBoxWidth, instructionsBoxHeight);
      ctx.strokeStyle = '#1E90FF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#1E90FF';
      ctx.shadowBlur = 15;
      ctx.strokeRect(instructionsBoxX, instructionsBoxY, instructionsBoxWidth, instructionsBoxHeight);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#1E90FF';
      ctx.fillRect(instructionsBoxX + 5, instructionsBoxY + 5, instructionsBoxWidth - 10, 35);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('HOW TO PLAY', instructionsBoxX + instructionsBoxWidth / 2, instructionsBoxY + 28);

      ctx.textAlign = 'left';
      const instructionItems = [
        { icon: '👈', text: 'Move finger left', subtext: 'to switch to left lane' },
        { icon: '👉', text: 'Move finger right', subtext: 'to switch to right lane' },
        { icon: '👆', text: 'Raise finger', subtext: 'to jump over obstacles' },
        { icon: '👇', text: 'Lower finger', subtext: 'to slide under obstacles' },
        { icon: '💰', text: 'Collect coins', subtext: 'for power-ups and score' },
        { icon: '⌨️', text: 'Press R to restart', subtext: 'Press Q to quit' }
      ];

      let yOffset = instructionsBoxY + 60;
      instructionItems.forEach((item) => {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(item.icon, instructionsBoxX + 15, yOffset);
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(item.text, instructionsBoxX + 45, yOffset);
        if (item.subtext) {
          ctx.font = '12px Arial';
          ctx.fillStyle = '#CCCCCC';
          ctx.fillText(item.subtext, instructionsBoxX + 45, yOffset + 15);
          yOffset += 42;
        } else {
          yOffset += 30;
        }
      });

      ctx.fillStyle = '#1E90FF';
      ctx.fillRect(instructionsBoxX + 20, instructionsBoxY + instructionsBoxHeight - 15, instructionsBoxWidth - 40, 2);

      // Stats box
      const statsBoxX = 1000;
      const statsBoxY = 70; // Position above instructions box
      const statsBoxWidth = 220;
      const statsBoxHeight = 110; // Reduced height to remove blank space

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
      ctx.fillText('STATISTICS', statsBoxX + statsBoxWidth / 2, statsBoxY + 20);

      // Score display
      ctx.fillStyle = '#FFD700'; // Gold color for score
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('SCORE', statsBoxX + 15, statsBoxY + 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(this.score.toString(), statsBoxX + statsBoxWidth - 15, statsBoxY + 40);

      // Coins display
      ctx.fillStyle = '#00FF7F'; // Spring green for coins
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('COINS', statsBoxX + 15, statsBoxY + 65);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(this.coinsCollected.toString(), statsBoxX + statsBoxWidth - 15, statsBoxY + 65);

      // Time display
      ctx.fillStyle = '#FFA500'; // Orange for time
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('TIME', statsBoxX + 15, statsBoxY + 90);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(((performance.now() - this.startTime) / 1000).toFixed(1), statsBoxX + statsBoxWidth - 15, statsBoxY + 90);
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
            skateImageRef.current,
            backgroundImageRef.current,
            videoRef.current // Pass video element to GameLogic
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

    const debug = debugRef.current; // Reference to debug element

    if (started && gameObj) {
      if (!gameObj.gameOver || gameObj.deathAnimation) {
        // Update runner position based on hand tracking
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          const indexFinger = results.multiHandLandmarks[0][8]; // Index finger tip
          const fingerX = Math.floor(1280 - indexFinger.x * 1280); // Mirror X-coordinate
          const fingerY = Math.floor(indexFinger.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY);
          debug.innerHTML = ''; // Clear debug message when hand is detected
        } else {
          console.log('No hands detected in this frame');
          debug.innerHTML = `<p class="warning">❌ No hands detected - Please ensure one hand is visible to the webcam.</p>`;
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

  // Draws the game over screen on the canvas
  const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 1280, 720); // Semi-transparent overlay
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', 640, 300);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px Arial';
    ctx.fillText(`Final Score: ${score}`, 640, 400);
    ctx.fillStyle = '#4CAF50';
    ctx.font = '40px Arial';
    ctx.fillText('Press "R" to Restart', 640, 500);
    finalScore.textContent = score;
  };

  // Restarts the game
  const restartGame = () => {
    console.log('Restarting game...');
    if (cameraRef.current) cameraRef.current.stop();
    gameStartedRef.current = false;
    gameOverRef.current.style.display = 'none';
    bgMusicRef.current.pause();
    bgMusicRef.current.currentTime = 0;
    deathSoundRef.current.pause();
    deathSoundRef.current.currentTime = 0;
    gameOverSoundRef.current.pause();
    gameOverSoundRef.current.currentTime = 0;
    immunitySoundRef.current.pause();
    immunitySoundRef.current.currentTime = 0;
    setImmunityMessage(false);
    setSkateMessage(false);
    if (runnerImageRef.current && skateImageRef.current) {
      startGame();
    } else {
      console.error('Cannot restart: character or skate not selected');
      setShowCharacterSelection(true);
      setHasSelectedCharacter(false);
      setShowSkateSelection(false);
      setHasSelectedSkate(false);
    }
  };

  // Quits the game and returns to the main menu
  const quitGame = () => {
    console.log('Quitting game...');
    if (cameraRef.current) cameraRef.current.stop();
    gameStartedRef.current = false;
    bgMusicRef.current.pause();
    bgMusicRef.current.currentTime = 0;
    deathSoundRef.current.pause();
    deathSoundRef.current.currentTime = 0;
    gameOverSoundRef.current.pause();
    gameOverSoundRef.current.currentTime = 0;
    immunitySoundRef.current.pause();
    immunitySoundRef.current.currentTime = 0;
    setImmunityMessage(false);
    setSkateMessage(false);
    setShowGame(false);
    setSelectedGame(null); // Return to game selection
  };

  // useEffect hook for initialization and cleanup
  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const gameOver = gameOverRef.current;

    gameOver.style.display = 'none'; // Hide game over screen initially

    // Load game assets
    backgroundImageRef.current = new Image();
    backgroundImageRef.current.src = '/static/images/subway.png';
    backgroundImageRef.current.onload = () => console.log('Background image loaded successfully');

    coinImageRef.current = new Image();
    coinImageRef.current.src = '/static/images/coin.png';
    coinImageRef.current.onload = () => console.log('Coin image loaded successfully');

    hurdleImageRef.current = new Image();
    hurdleImageRef.current.src = '/static/images/hurdle.png';
    hurdleImageRef.current.onload = () => console.log('Hurdle image loaded successfully');

    guardImageRef.current = new Image();
    guardImageRef.current.src = '/static/images/guard.png';
    guardImageRef.current.onload = () => console.log('Guard image loaded successfully');

    trainImageRef.current = new Image();
    trainImageRef.current.src = '/static/images/train.png';
    trainImageRef.current.onload = () => console.log('Train image loaded successfully');

    // Load audio assets
    bgMusicRef.current = new Audio('/static/sounds/bgmusic.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    bgMusicRef.current.preload = 'auto';
    bgMusicRef.current.load();

    deathSoundRef.current = new Audio('/static/sounds/death.mp3');
    deathSoundRef.current.volume = 0.5;
    deathSoundRef.current.preload = 'auto';

    gameOverSoundRef.current = new Audio('/static/sounds/gameover.mp3');
    gameOverSoundRef.current.volume = 0.5;
    gameOverSoundRef.current.preload = 'auto';

    immunitySoundRef.current = new Audio('/static/sounds/immunity.mp3');
    immunitySoundRef.current.volume = 0.5;
    immunitySoundRef.current.preload = 'auto';

    initHandDetection(); // Initialize hand-tracking

    // Set up button event listeners
    const startButton = document.getElementById('start-btn');
    const restartButton = document.getElementById('restart-btn');
    const testCameraButton = document.getElementById('test-camera-btn');
    const playAgainButton = document.getElementById('play-again-btn');

    const startHandler = () => {
      console.log('Start button clicked');
      setShowGame(true);
      startGame();
    };
    const restartHandler = () => {
      console.log('Restart button clicked');
      restartGame();
    };
    const testCameraHandler = () => {
      console.log('Test camera button clicked');
      startCamera();
    };
    const playAgainHandler = () => {
      console.log('Play again button clicked');
      restartGame();
    };

    if (startButton) startButton.addEventListener('click', startHandler);
    if (restartButton) restartButton.addEventListener('click', restartHandler);
    if (testCameraButton) testCameraButton.addEventListener('click', testCameraHandler);
    if (playAgainButton) playAgainButton.addEventListener('click', playAgainHandler);

    // Keyboard controls
    const keydownHandler = (e) => {
      if (gameObjectRef.current && !gameObjectRef.current.gameOver) {
        if (e.key === 'a' || e.key === 'A') {
          gameObjectRef.current.moveLeft();
        } else if (e.key === 'd' || e.key === 'D') {
          gameObjectRef.current.moveRight();
        } else if (e.key === ' ') {
          gameObjectRef.current.jump();
        } else if (e.key === 's' || e.key === 'S') {
          gameObjectRef.current.slide();
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        console.log('R key pressed for restart');
        restartGame();
      } else if (e.key === 'q' || e.key === 'Q') {
        console.log('Q key pressed to quit');
        quitGame();
      }
    };

    document.addEventListener('keydown', keydownHandler);

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up SurfDash');
      if (cameraRef.current) cameraRef.current.stop();
      gameStartedRef.current = false;
      gameObjectRef.current = null;
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
      deathSoundRef.current.pause();
      deathSoundRef.current.currentTime = 0;
      gameOverSoundRef.current.pause();
      gameOverSoundRef.current.currentTime = 0;
      immunitySoundRef.current.pause();
      immunitySoundRef.current.currentTime = 0;
      if (startButton) startButton.removeEventListener('click', startHandler);
      if (restartButton) restartButton.removeEventListener('click', restartHandler);
      if (testCameraButton) testCameraButton.removeEventListener('click', testCameraHandler);
      if (playAgainButton) playAgainButton.removeEventListener('click', playAgainHandler);
      document.removeEventListener('keydown', keydownHandler);
    };
  }, []);

  // JSX for rendering the game UI
  return (
    <div className='inter'>
      <div style={{ width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/surfdash-bg.png)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none' }}>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Surf Dash</h2>
            <ul>
              <li><strong>Choose character and skate:</strong> Select your character (1 or 2) and skate (1, 2, or 3) before starting.</li>
              <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
              <li><strong>Move left/right:</strong> Move your index finger left or right to switch lanes.</li>
              <li><strong>Jump:</strong> Quickly raise your hand to jump over high hurdles or trains.</li>
              <li><strong>Slide:</strong> Quickly lower your hand to slide under low hurdles or trains.</li>
              <li><strong>Collect coins:</strong> Run into coins to increase your score (10 points per coin) and coin count.</li>
              <li><strong>Skate Power-Up:</strong> Collect 5 coins to activate your chosen skate, protecting you from one hurdle or train collision and increasing speed slightly. Consumed after use.</li>
              <li><strong>Immunity Power-Up:</strong> Collect 10 coins to gain immunity, protecting you from one hurdle or train collision. Consumed after use.</li>
              <li><strong>Avoid hurdles and trains:</strong> Jump or slide to dodge hurdles and trains; hitting one ends the game unless skate or immunity is active.</li>
              <li><strong>Keyboard controls:</strong> Use 'A'/'D' to move, 'Space' to jump, 'S' to slide, 'R' to restart, 'Q' to quit.</li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ maxWidth: "40%" }}>
            <img src="static/images/pages/surfdash-lineart.svg" alt="Surf Dash" style={{ width: '100%', height: 'auto' }} />
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
        {showCharacterSelection && !hasSelectedCharacter && (
          <div className="character-selection" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            zIndex: 1000,
            border: '3px solid #4CAF50'
          }}>
            <h2 style={{ color: '#fff', fontSize: '2em', marginBottom: '30px' }}>Choose Your Character</h2>
            <div className="selection-controls" style={{
              display: 'flex',
              gap: '30px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {[1, 2].map((char) => (
                <button
                  key={char}
                  onClick={() => selectCharacter(char)}
                  onMouseEnter={() => setHoveredCharacter(char)}
                  onMouseLeave={() => setHoveredCharacter(null)}
                  style={{
                    background: 'none',
                    border: hoveredCharacter === char ? '3px solid #4CAF50' : '3px solid transparent',
                    borderRadius: '15px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img
                    src={`/static/images/character${char}.png`}
                    alt={`Character ${char}`}
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'contain'
                    }}
                  />
                </button>
              ))}
            </div>
            {selectionMessage && (
              <p style={{ color: '#4CAF50', fontSize: '1.5em', margin: '20px 0' }}>{selectionMessage}</p>
            )}
          </div>
        )}
        {showSkateSelection && hasSelectedCharacter && !hasSelectedSkate && (
          <div className="skate-selection" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            zIndex: 1000,
            border: '3px solid #FF9800'
          }}>
            <h2 style={{ color: '#fff', fontSize: '2em', marginBottom: '30px' }}>Choose Your Skate</h2>
            <div className="selection-controls" style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {[1, 2, 3].map((skate) => (
                <button
                  key={skate}
                  onClick={() => selectSkate(skate)}
                  onMouseEnter={() => setHoveredSkate(skate)}
                  onMouseLeave={() => setHoveredSkate(null)}
                  style={{
                    background: 'none',
                    border: hoveredSkate === skate ? '3px solid #FF9800' : '3px solid transparent',
                    borderRadius: '15px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img
                    src={`/static/images/skate${skate}.png`}
                    alt={`Skate ${skate}`}
                    style={{
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain'
                    }}
                  />
                </button>
              ))}
            </div>
            {selectionMessage && (
              <p style={{ color: '#FF9800', fontSize: '1.5em', margin: '20px 0' }}>{selectionMessage}</p>
            )}
          </div>
        )}
        {immunityMessage && (
          <div style={{ 
            position: 'absolute', 
            top: '40%', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            fontSize: '24px', 
            color: '#FFD700', 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <img 
              src="/static/images/immunity.png" 
              alt="Immunity Icon" 
              width="30" 
              height="30" 
              style={{ display: immunityMessage ? 'inline' : 'none' }} 
            />
            Immunity Activated!
          </div>
        )}
        {skateMessage && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            fontSize: '24px', 
            color: '#00CED1', 
            zIndex: 1000 
          }}>
            Skate Activated!
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="controls" style={{ maxWidth: "70vw", display: 'flex', flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: '20px' }}>
            <button id="restart-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/replay.svg" alt="Restart" style={{ width: '35px', height: '35px' }} />
            </button>
            <button id="start-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: showCharacterSelection || showSkateSelection ? 'none' : 'inline' }}>
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
          <div ref={gameStatsRef} className="game-stats">Score: 0 | Coins: 0</div>
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

export default SurfDash;