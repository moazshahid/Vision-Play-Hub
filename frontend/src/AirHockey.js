import './Game.css';
import React, { useEffect, useRef, useState } from 'react';

// Define the AirHockey component for the hand-tracking Air Hockey game
const AirHockey = () => {
  const [showGame, setShowGame] = useState(false); 
  // Initialize refs for DOM elements and game state
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
  const fingerPositionRef = useRef({ player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } });

  // State to manage game mode, difficulty, UI, and confirmation message
  const [gameMode, setGameMode] = useState(null); // null, 'single', or 'two'
  const [difficulty, setDifficulty] = useState(null); // null means not selected yet
  const [modeSelected, setModeSelected] = useState(false);
  const [showModeOverlay, setShowModeOverlay] = useState(true); // Controls mode selection overlay
  const [showDifficultyOverlay, setShowDifficultyOverlay] = useState(false); // Controls difficulty selection overlay
  const [confirmationMessage, setConfirmationMessage] = useState(''); // Confirmation message after selection

  // Preload MediaPipe Hands script and sound files to reduce initialization lag
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.async = true;
    script.onload = () => console.log('MediaPipe Hands script preloaded');
    document.head.appendChild(script);

    const hitSound = new Audio('/static/sounds/airhockey/hit.mp3');
    const goalSound = new Audio('/static/sounds/airhockey/goal.mp3');
    hitSound.preload = 'auto';
    goalSound.preload = 'auto';

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Helper function to handle game mode selection
  const selectGameMode = (selectedMode) => {
    if (!gameStartedRef.current) { // Remove modeSelected check
      setGameMode(selectedMode);
      setShowModeOverlay(false);
      if (selectedMode === 'single') {
        setShowDifficultyOverlay(true);
        setConfirmationMessage('Mode selected: Single Player');
        setTimeout(() => {
          setConfirmationMessage('');
        }, 2000);
      } else {
        setDifficulty(null);
        setShowDifficultyOverlay(false);
        setConfirmationMessage('Mode selected: Two Player');
        console.log('Mode selected: Two Player');
        setTimeout(() => {
          setConfirmationMessage('');
          setModeSelected(true);
          // Auto-start the game after two player selection
          setTimeout(() => {
            document.getElementById('start-btn').click();
          }, 500);
        }, 2000);
      }
      console.log(`Mode selected: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Player`);
    }
  };

  // Helper function to handle difficulty selection
  const selectDifficulty = (selectedDifficulty) => {
    if (gameMode === 'single' && !gameStartedRef.current) {
      setDifficulty(selectedDifficulty);
      setShowDifficultyOverlay(false);
      setConfirmationMessage(`Difficulty selected: ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
      console.log(`Difficulty selected: ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
      setTimeout(() => {
        setConfirmationMessage('');
        setModeSelected(true);
        // Auto-start the game after difficulty selection
        setTimeout(() => {
          document.getElementById('start-btn').click();
        }, 500);
      }, 2000);
    }
  };

  // Use effect to set up the game environment when the component mounts
  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;

    canvasRef.current.width = 960;
    canvasRef.current.height = 540;
    gameOver.style.display = 'none';

    const initHandDetection = async () => {
      try {
        // Ensure any existing instance is properly cleaned up
        if (handsRef.current) {
          handsRef.current.close();
          handsRef.current = null;
        }
        
        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        handsRef.current = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        handsRef.current.setOptions({
          maxNumHands: gameMode === 'two' ? 2 : 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        handsRef.current.onResults((results) => onHandResults(results, gameObjectRef.current, gameStartedRef.current));
        await handsRef.current.initialize();
        console.log('Hand detection initialized');
      } catch (error) {
        console.error('Hand detection initialization failed:', error);
        debug.innerHTML = `<p class="warning">❌ Hand detection init error: ${error.message}</p>`;
      }
    };

    const startCamera = async () => {
      try {
        // Stop existing camera if any
        if (cameraRef.current) {
          await cameraRef.current.stop();
          cameraRef.current = null;
        }
        
        // Stop existing video stream
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
        
        // Add delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540, facingMode: 'user', frameRate: 30 },
        });
        video.srcObject = stream;
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play();
        
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => {
            if (handsRef.current && gameStartedRef.current) {
              try {
                await handsRef.current.send({ image: video });
              } catch (error) {
                console.error('Error processing video frame:', error);
                debug.innerHTML = `<p class="warning">❌ Frame processing error: ${error.message}</p>`;
              }
            }
          },
          width: 960,
          height: 540,
        });
        await cameraRef.current.start();
        console.log('Camera started successfully');
      } catch (error) {
        debug.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
        console.error('Camera initialization failed:', error);
      }
    };

    const startGame = async () => {
      if (!gameStartedRef.current && (modeSelected || (gameMode && (gameMode === 'two' || difficulty)))) {
        setShowModeOverlay(false);
        setShowDifficultyOverlay(false);
        debug.innerHTML = `<p>Loading game, please wait...</p>`;
        
        // Clean up any existing instances first
        if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
        }
        if (handsRef.current) {
          handsRef.current = null;
        }
        
        await Promise.all([initHandDetection(), startCamera()])
          .then(() => {
            gameObjectRef.current = new GameLogic(canvas, gameStats, video, difficulty, gameMode);
            gameStartedRef.current = true;
            lastRenderTimeRef.current = performance.now();
            gameOver.style.display = 'none';
            requestAnimationFrame(gameLoop);
            debug.innerHTML = `<p>Game started! Mode: ${gameMode === 'two' ? 'Two Player' : 'Single Player'}${gameMode === 'single' ? `, Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}` : ''}</p>`;
            console.log('Game started');
          })
          .catch((error) => {
            alert('Camera access error: ' + error.message);
            console.error('Start game failed:', error);
          });
      } else if (!modeSelected) {
        setShowModeOverlay(true);
        debug.innerHTML = `<p>Please select a game mode (1 or 2).</p>`;
      }
    };

    const gameLoop = (timestamp) => {
      if (!gameStartedRef.current || !gameObjectRef.current || gameObjectRef.current.gameOver) {
        return;
      }

      const deltaTime = timestamp - lastRenderTimeRef.current;
      lastRenderTimeRef.current = timestamp;

      try {
        gameObjectRef.current.updateWithoutRender(deltaTime, fingerPositionRef.current);
        gameObjectRef.current.render();
        if (gameObjectRef.current.gameOver) {
          drawGameOverOnCanvas(canvas, gameObjectRef.current.playerScore, gameObjectRef.current.opponentScore, gameOver, finalScore);
          console.log('Game over displayed');
          return;
        }
        requestAnimationFrame(gameLoop);
      } catch (error) {
        console.error('Error in game loop:', error);
        debug.innerHTML = `<p class="warning">❌ Game loop error: ${error.message}</p>`;
        gameStartedRef.current = false;
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', async () => {
      // Stop camera and reset everything
      gameStartedRef.current = false;
      
      if (cameraRef.current) {
        await cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      
      // Stop video stream
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      
      gameObjectRef.current = null;
      
      // Reset all state
      setGameMode(null);
      setDifficulty(null);
      setModeSelected(false);
      setShowModeOverlay(true);
      setShowDifficultyOverlay(false);
      setConfirmationMessage('');
      gameOver.style.display = 'none';
      
      // Clear debug messages
      debug.innerHTML = '';
      
      console.log('Game reset to mode selection via restart button');
    });
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas, gameStats, video, difficulty, gameMode);
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
      console.log('Game restarted via play again button');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        // Stop camera and reset everything
        gameStartedRef.current = false;
        
        if (cameraRef.current) {
          cameraRef.current.stop().then(() => {
            cameraRef.current = null;
          });
        }
        if (handsRef.current) {
          handsRef.current.close();
          handsRef.current = null;
        }
        
        // Stop video stream
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
        
        gameObjectRef.current = null;
        
        // Reset all state
        setGameMode(null);
        setDifficulty(null);
        setModeSelected(false);
        setShowModeOverlay(true);
        setShowDifficultyOverlay(false);
        setConfirmationMessage('');
        gameOver.style.display = 'none';
        
        // Clear debug messages
        debug.innerHTML = '';
        
        console.log('Game reset to mode selection via R key');
      }
      if (e.key === 'q' || e.key === 'Q') {
        // Stop camera completely
        if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
        }
        if (handsRef.current) {
          handsRef.current = null;
        }
        
        // Stop video stream
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
        
        gameStartedRef.current = false;
        gameObjectRef.current = null;
        
        // Clear canvas
        canvas.clearRect(0, 0, 960, 540);
        
        debug.innerHTML = '<p>Game quit. Refresh page to restart.</p>';
        console.log('Game quit via Q key');
      }
    });

    const onHandResults = (results, gameObj, started) => {
      try {
        if (started && gameObj && !gameObj.gameOver) {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // In Single Player Mode, track the first detected hand for the blue paddle
            if (gameMode === 'single') {
              const playerFinger = results.multiHandLandmarks[0][8]; // Index finger of first hand
              const playerFingerX = (1 - playerFinger.x) * 960; // Invert x due to canvas mirroring
              const playerFingerY = playerFinger.y * 540;
              const playerDx = playerFingerX - fingerPositionRef.current.player.x;
              const playerDy = playerFingerY - fingerPositionRef.current.player.y;
              const deadZone = 10;
              if (Math.abs(playerDx) > deadZone || Math.abs(playerDy) > deadZone) {
                const smoothing = 0.7; // Original smoothing for Single Player
                fingerPositionRef.current.player.x = fingerPositionRef.current.player.x * (1 - smoothing) + playerFingerX * smoothing;
                fingerPositionRef.current.player.y = fingerPositionRef.current.player.y * (1 - smoothing) + playerFingerY * smoothing;
              }
              console.log('Player hand detected (Single Player):', { fingerX: fingerPositionRef.current.player.x, fingerY: fingerPositionRef.current.player.y });
            }
            // In Two Player Mode, assign hands based on side of the table
            else if (gameMode === 'two') {
              let leftHandAssigned = false;
              let rightHandAssigned = false;

              // Iterate through all detected hands
              for (const landmarks of results.multiHandLandmarks) {
                const finger = landmarks[8]; // Index finger
                const fingerX = (1 - finger.x) * 960; // Invert x due to canvas mirroring
                const fingerY = finger.y * 540;

                // Hand on left side (x < 480) controls red paddle (opponent)
                if (fingerX < 480) {
                  const opponentDx = fingerX - fingerPositionRef.current.opponent.x;
                  const opponentDy = fingerY - fingerPositionRef.current.opponent.y;
                  const deadZone = 10;
                  if (Math.abs(opponentDx) > deadZone || Math.abs(opponentDy) > deadZone) {
                    const smoothing = 0.5; // Increased smoothing for Two Player
                    fingerPositionRef.current.opponent.x = fingerPositionRef.current.opponent.x * (1 - smoothing) + fingerX * smoothing;
                    fingerPositionRef.current.opponent.y = fingerPositionRef.current.opponent.y * (1 - smoothing) + fingerY * smoothing;
                  }
                  console.log('Opponent hand (red paddle) detected on left side:', { fingerX: fingerPositionRef.current.opponent.x, fingerY: fingerPositionRef.current.opponent.y });
                  leftHandAssigned = true;
                }
                // Hand on right side (x > 480) controls blue paddle (player)
                else {
                  const playerDx = fingerX - fingerPositionRef.current.player.x;
                  const playerDy = fingerY - fingerPositionRef.current.player.y;
                  const deadZone = 10;
                  if (Math.abs(playerDx) > deadZone || Math.abs(playerDy) > deadZone) {
                    const smoothing = 0.5; // Increased smoothing for Two Player
                    fingerPositionRef.current.player.x = fingerPositionRef.current.player.x * (1 - smoothing) + fingerX * smoothing;
                    fingerPositionRef.current.player.y = fingerPositionRef.current.player.y * (1 - smoothing) + fingerY * smoothing;
                  }
                  console.log('Player hand (blue paddle) detected on right side:', { fingerX: fingerPositionRef.current.player.x, fingerY: fingerPositionRef.current.player.y });
                  rightHandAssigned = true;
                }
              }

              // Show debug warning if either hand is missing
              if (!leftHandAssigned || !rightHandAssigned) {
                debug.innerHTML = `<p class="warning">Please ensure one hand is visible on each side of the screen.</p>`;
              } else {
                debug.innerHTML = `<p>Both hands detected!</p>`;
              }
            }
          } else {
            console.log('No hands detected in this frame');
            debug.innerHTML = `<p class="warning">No hands detected - please ensure at least one hand is visible to the webcam.</p>`;
          }
        }
      } catch (error) {
        console.error('Error in onHandResults:', error);
        debug.innerHTML = `<p class="warning">❌ Hand detection error: ${error.message}</p>`;
      }
    };

    const drawGameOverOnCanvas = (ctx, playerScore, opponentScore, over, finalScore) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', 480, 220);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px Arial';
      
      if (gameMode === 'two') {
        ctx.fillText(`Player 1: ${opponentScore}  Player 2: ${playerScore}`, 480, 300);
        ctx.fillStyle = playerScore > opponentScore ? '#00FF00' : '#FF0000';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(playerScore > opponentScore ? 'Player 2 Wins!' : 'Player 1 Wins!', 480, 360);
        finalScore.textContent = `Player 1: ${opponentScore}  Player 2: ${playerScore}`;
      } else {
        ctx.fillText(`Player: ${playerScore}  Opponent: ${opponentScore}`, 480, 300);
        ctx.fillStyle = playerScore > opponentScore ? '#00FF00' : '#FF0000';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(playerScore > opponentScore ? 'Player Wins!' : 'Opponent Wins!', 480, 360);
        finalScore.textContent = `Player: ${playerScore}  Opponent: ${opponentScore}`;
      }
      
      ctx.fillStyle = '#4CAF50';
      ctx.font = '30px Arial';
      ctx.fillText('Press "R" to Restart', 480, 420);
      over.style.display = 'block';
    };

    class GameLogic {
      constructor(ctx, stats, video, difficulty, gameMode) {
        this.canvasWidth = 960;
        this.canvasHeight = 540;
        this.ctx = ctx;
        this.stats = stats;
        this.video = video;
        this.difficulty = difficulty;
        this.gameMode = gameMode;

        // Game state
        this.playerScore = 0;
        this.opponentScore = 0;
        this.gameOver = false;
        this.winningScore = 5;

        // Puck properties
        this.puck = {
          x: this.canvasWidth / 2,
          y: this.canvasHeight / 2,
          radius: 12,
          speedX: 0,
          speedY: 0,
          maxSpeed: 500,
        };

        // Paddle properties
        this.playerPaddle = {
          x: this.canvasWidth - 80,
          y: this.canvasHeight / 2,
          radius: 30,
          speed: 400,
        };
        this.opponentPaddle = {
          x: 80,
          y: this.canvasHeight / 2,
          radius: 30,
          speed: gameMode === 'two' ? 400 : (difficulty === 'easy' ? 250 : difficulty === 'medium' ? 350 : 450), // Same speed as player in two player
          targetX: 80,
          targetY: this.canvasHeight / 2,
        };

        // Goal properties
        this.goalWidth = 150;
        this.goalHeight = gameMode === 'two' ? 200 : (difficulty === 'easy' ? 240 : difficulty === 'medium' ? 200 : 160); // Default for two player
        this.playerGoal = { x: this.canvasWidth - this.goalWidth, y: (this.canvasHeight - this.goalHeight) / 2 };
        this.opponentGoal = { x: 0, y: (this.canvasHeight - this.goalHeight) / 2 };

        // Border properties
        this.borderWidth = 8;
        this.borderGlowColor = 'rgba(0, 255, 255, 0.8)';

        // Sound effects
        this.hitSound = new Audio('/static/sounds/airhockey/hit.mp3');
        this.goalSound = new Audio('/static/sounds/airhockey/goal.mp3');
        this.hitSound.preload = 'auto';
        this.goalSound.preload = 'auto';

        this.resetPuck();
      }

      resetPuck() {
        this.puck.x = this.canvasWidth / 2;
        this.puck.y = this.canvasHeight / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = this.gameMode === 'two' ? 300 : (this.difficulty === 'easy' ? 250 : this.difficulty === 'medium' ? 300 : 350);
        this.puck.speedX = Math.cos(angle) * speed;
        this.puck.speedY = Math.sin(angle) * speed;
        console.log('Puck reset:', this.puck);
      }

      updatePaddlePosition(fingerPosition) {
        if (!this.gameOver) {
          this.playerPaddle.x = Math.max(this.canvasWidth / 2, Math.min(this.canvasWidth - this.playerPaddle.radius, fingerPosition.player.x));
          this.playerPaddle.y = Math.max(this.playerPaddle.radius, Math.min(this.canvasHeight - this.playerPaddle.radius, fingerPosition.player.y));
          if (this.gameMode === 'two') {
            this.opponentPaddle.x = Math.max(this.borderWidth + this.opponentPaddle.radius, Math.min(this.canvasWidth / 2 - this.opponentPaddle.radius, fingerPosition.opponent.x));
            this.opponentPaddle.y = Math.max(this.opponentPaddle.radius, Math.min(this.canvasHeight - this.opponentPaddle.radius, fingerPosition.opponent.y));
          }
        }
      }

      updateWithoutRender(deltaTime, fingerPosition) {
        if (this.gameOver) return;
        const deltaSeconds = deltaTime / 1000;

        this.puck.x += this.puck.speedX * deltaSeconds;
        this.puck.y += this.puck.speedY * deltaSeconds;

        if (this.puck.y - this.puck.radius < this.borderWidth) {
          this.puck.speedY = -this.puck.speedY;
          this.puck.y = this.borderWidth + this.puck.radius;
        }
        if (this.puck.y + this.puck.radius > this.canvasHeight - this.borderWidth) {
          this.puck.speedY = -this.puck.speedY;
          this.puck.y = this.canvasHeight - this.borderWidth - this.puck.radius;
        }

        if (
          this.puck.x - this.puck.radius < this.borderWidth &&
          this.puck.y > this.opponentGoal.y &&
          this.puck.y < this.opponentGoal.y + this.goalHeight
        ) {
          this.playerScore += 1;
          this.goalSound.play().catch((error) => console.error('Goal sound playback failed:', error));
          this.resetPuck();
          this.checkGameOver();
          console.log('Player scored on opponent:', { playerScore: this.playerScore, opponentScore: this.opponentScore });
        } else if (
          this.puck.x + this.puck.radius > this.canvasWidth - this.borderWidth &&
          this.puck.y > this.playerGoal.y &&
          this.puck.y < this.playerGoal.y + this.goalHeight
        ) {
          this.opponentScore += 1;
          this.goalSound.play().catch((error) => console.error('Goal sound playback failed:', error));
          this.resetPuck();
          this.checkGameOver();
          console.log('Opponent scored on player:', { playerScore: this.playerScore, opponentScore: this.opponentScore });
        }

        if (
          this.puck.x - this.puck.radius < this.borderWidth &&
          (this.puck.y < this.opponentGoal.y || this.puck.y > this.opponentGoal.y + this.goalHeight)
        ) {
          this.puck.speedX = -this.puck.speedX;
          this.puck.x = this.borderWidth + this.puck.radius;
        }
        if (
          this.puck.x + this.puck.radius > this.canvasWidth - this.borderWidth &&
          (this.puck.y < this.playerGoal.y || this.puck.y > this.playerGoal.y + this.goalHeight)
        ) {
          this.puck.speedX = -this.puck.speedX;
          this.puck.x = this.canvasWidth - this.borderWidth - this.puck.radius;
        }

        this.updatePaddlePosition(fingerPosition);
        if (this.gameMode === 'single') {
          this.updateOpponentPaddle(deltaSeconds);
        }
        this.handlePaddleCollision(this.playerPaddle);
        this.handlePaddleCollision(this.opponentPaddle);
        if (this.gameMode === 'two') {
          this.stats.textContent = `Player 1: ${this.opponentScore}  Player 2: ${this.playerScore}`;
        } else {
          this.stats.textContent = `Player: ${this.playerScore}  Opponent: ${this.opponentScore}`;
        }
      }

      updateOpponentPaddle(deltaSeconds) {
        if (this.gameOver || this.gameMode === 'two') return;
      
        let targetX = this.opponentPaddle.x;
        let targetY = this.opponentPaddle.y;
      
        // Difficulty-based parameters
        const trackingAccuracy = this.difficulty === 'easy' ? 0.4 : this.difficulty === 'medium' ? 0.7 : 0.9;
        const reactionSpeed = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'medium' ? 0.6 : 0.8;
        const maxX = this.canvasWidth / 2 - this.opponentPaddle.radius - 20;
        const minX = this.borderWidth + this.opponentPaddle.radius + 20;
      
        // Only track the puck if it's moving towards the opponent or is on opponent's side
        if (this.puck.speedX < 0 || this.puck.x < this.canvasWidth / 2) {
          // Calculate where the puck will be
          const timeToReachOpponent = Math.abs((minX - this.puck.x) / this.puck.speedX);
          let predictedY = this.puck.y + this.puck.speedY * timeToReachOpponent;
          
          // Clamp predicted Y within bounds
          predictedY = Math.max(this.opponentPaddle.radius + 20, 
          Math.min(this.canvasHeight - this.opponentPaddle.radius - 20, predictedY));
          
          // Apply tracking accuracy (some randomness for easier difficulties)
          const randomOffset = (Math.random() - 0.5) * (1 - trackingAccuracy) * 100;
          targetY = predictedY * trackingAccuracy + (this.canvasHeight / 2) * (1 - trackingAccuracy) + randomOffset;
          targetX = Math.min(maxX, Math.max(minX, this.puck.x * 0.8 + minX * 0.2));
        } else {
          // Return to center when puck is moving away
          targetX = minX + 50;
          targetY = this.canvasHeight / 2;
        }
      
        // Smooth movement towards target
        const dx = targetX - this.opponentPaddle.x;
        const dy = targetY - this.opponentPaddle.y;
        
        const moveSpeed = this.opponentPaddle.speed * deltaSeconds * reactionSpeed;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          const moveX = (dx / distance) * Math.min(moveSpeed, distance);
          const moveY = (dy / distance) * Math.min(moveSpeed, distance);
          
          this.opponentPaddle.x += moveX;
          this.opponentPaddle.y += moveY;
        }
      
        // Keep within bounds
        this.opponentPaddle.x = Math.max(minX, Math.min(maxX, this.opponentPaddle.x));
        this.opponentPaddle.y = Math.max(this.opponentPaddle.radius, 
        Math.min(this.canvasHeight - this.opponentPaddle.radius, this.opponentPaddle.y));
      }

      handlePaddleCollision(paddle) {
        const dx = this.puck.x - paddle.x;
        const dy = this.puck.y - paddle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.puck.radius + paddle.radius;

        if (distance < minDistance) {
          const angle = Math.atan2(dy, dx);
          const speed = Math.sqrt(this.puck.speedX * this.puck.speedX + this.puck.speedY * this.puck.speedY);
          const newSpeed = Math.min(this.puck.maxSpeed, speed * 1.1);
          this.puck.speedX = Math.cos(angle) * newSpeed;
          this.puck.speedY = Math.sin(angle) * newSpeed;
          const overlap = minDistance - distance;
          this.puck.x += Math.cos(angle) * overlap;
          this.puck.y += Math.sin(angle) * overlap;
          this.hitSound.play().catch((error) => console.error('Hit sound playback failed:', error));
          console.log('Paddle collision detected, playing hit sound:', { paddleX: paddle.x, paddleY: paddle.y });
        }
      }

      checkGameOver() {
        if (this.playerScore >= this.winningScore || this.opponentScore >= this.winningScore) {
          this.gameOver = true;
        }
      }

      render() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.save();
        this.ctx.translate(this.canvasWidth, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, 0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.restore();

        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, 'rgba(0, 128, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 128, 0.1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.lineWidth = this.borderWidth;
        this.ctx.strokeStyle = this.borderGlowColor;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = this.borderGlowColor;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.borderWidth / 2);
        this.ctx.lineTo(this.canvasWidth, this.borderWidth / 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvasHeight - this.borderWidth / 2);
        this.ctx.lineTo(this.canvasWidth, this.canvasHeight - this.borderWidth / 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.borderWidth / 2, 0);
        this.ctx.lineTo(this.borderWidth / 2, this.opponentGoal.y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.borderWidth / 2, this.opponentGoal.y + this.goalHeight);
        this.ctx.lineTo(this.borderWidth / 2, this.canvasHeight);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasWidth - this.borderWidth / 2, 0);
        this.ctx.lineTo(this.canvasWidth - this.borderWidth / 2, this.playerGoal.y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasWidth - this.borderWidth / 2, this.playerGoal.y + this.goalHeight);
        this.ctx.lineTo(this.canvasWidth - this.borderWidth / 2, this.canvasHeight);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasWidth / 2, 0);
        this.ctx.lineTo(this.canvasWidth / 2, this.canvasHeight);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.playerPaddle.x, this.playerPaddle.y, this.playerPaddle.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(this.opponentPaddle.x, this.opponentPaddle.y, this.opponentPaddle.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        if (this.gameMode === 'two') {
          this.stats.textContent = `Player 1: ${this.opponentScore}  Player 2: ${this.playerScore}`;
        } else {
          this.stats.textContent = `Player: ${this.playerScore}  Opponent: ${this.opponentScore}`;
        }
      }
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      gameStartedRef.current = false;
      gameObjectRef.current = null;
      console.log('Component unmounted, all resources cleaned up');
    };
  }, [difficulty, gameMode, modeSelected]);

  // Handle mode button clicks
  const handleModeSelect = (selectedMode) => {
    selectGameMode(selectedMode);
  };

  // Handle difficulty button clicks
  const handleDifficultySelect = (selectedDifficulty) => {
    selectDifficulty(selectedDifficulty);
  };

  return (
    <div className='inter'> 
      <div style={{Width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/hockey-bg.jpg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none'}}>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0}}>Air Hockey</h2>
            <ul>
              <li><strong>Select Mode:</strong> Click Single Player or Two Player.</li>
              <li><strong>Single Player:</strong> Choose difficulty (Easy, Medium, or Hard) and play against AI.</li>
              <li><strong>Two Player:</strong> Any hand on the left side controls the red paddle; any hand on the right side controls the blue paddle.</li>
              <li><strong>Show your hand(s):</strong> Ensure hand(s) are visible to the webcam.</li>
              <li><strong>Move the paddle:</strong> Use index finger to control your paddle.</li>
              <li><strong>Hit the puck:</strong> Strike the puck to score in the opponent's goal.</li>
              <li><strong>Score points:</strong> Get the puck into the opponent's goal to score.</li>
              <li><strong>Win the game:</strong> First to 5 points wins!</li>
              <li><strong>Controls:</strong> Press 'R' to return to mode selection and 'Q' to quit.</li>
            </ul>
          </div>
        </div>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{maxWidth:"40%"}}>
            <img src="static/images/pages/airhockey-colour.svg" alt="Whack A Mole" style={{ width: '100%', height: 'auto' }} />
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
            <button id="start-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/play.svg" alt="Play" style={{ width: '40px', height: '40px' }} />
            </button>
            <button id="restart-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/replay.svg" alt="Restart" style={{ width: '35px', height: '35px' }} />
            </button>
            <button id="test-camera-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/testing.svg" alt="Test Camera" style={{ width: '35px', height: '35px' }} />
            </button>
          </div>
        </div>
        <div ref={debugRef} className="debug-box" style={{backgroundColor:"transparent"}}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} style={{ width: '960px', height: '540px' }}></canvas>
          <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
          <div ref={gameStatsRef} className="game-stats">Player: 0  Opponent: 0</div>
          <div ref={gameOverRef} className="game-over">
            <h2>Game Over!</h2>
            <p>Final Score: <span ref={finalScoreRef}>Player: 0  Opponent: 0</span></p>
            <button id="play-again-btn">Play Again</button>
          </div>
          {showModeOverlay && (
            <div className="mode-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '960px',
              height: '540px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <h2 style={{ color: '#FFFFFF', fontSize: '2.5em', marginBottom: '20px' }}>Select Game Mode</h2>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <button
                  onClick={() => handleModeSelect('single')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1.5em',
                    backgroundColor: '#4CAF50',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Single Player
                </button>
                <button
                  onClick={() => handleModeSelect('two')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1.5em',
                    backgroundColor: '#2196F3',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Two Player
                </button>
              </div>
              <p style={{ color: '#FFFFFF', fontSize: '1.2em' }}>
                Press 1 or 2 to select a game mode
              </p>
            </div>
          )}
          {showDifficultyOverlay && gameMode === 'single' && (
            <div className="difficulty-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '960px',
              height: '540px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <h2 style={{ color: '#FFFFFF', fontSize: '2.5em', marginBottom: '20px' }}>Select Difficulty</h2>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <button
                  onClick={() => handleDifficultySelect('easy')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1.5em',
                    backgroundColor: '#4CAF50',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Easy
                </button>
                <button
                  onClick={() => handleDifficultySelect('medium')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1.5em',
                    backgroundColor: '#FFC107',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Medium
                </button>
                <button
                  onClick={() => handleDifficultySelect('hard')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1.5em',
                    backgroundColor: '#F44336',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Hard
                </button>
              </div>
              <p style={{ color: '#FFFFFF', fontSize: '1.2em' }}>
                Press 1, 2, or 3 to select a difficulty
              </p>
            </div>
          )}
          {confirmationMessage && (
            <div className="confirmation-message" style={{
              position: 'absolute',
              top: '50px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '5px',
              fontSize: '1.2em',
              zIndex: 11
            }}>
              {confirmationMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AirHockey;