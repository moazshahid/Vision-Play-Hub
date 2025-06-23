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
  }

  return <div></div>;
};

export default SurfDash;