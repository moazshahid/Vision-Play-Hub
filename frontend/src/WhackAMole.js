import './Game.css';
import React, { useEffect, useRef, useState } from 'react';
import { submitScore } from './utils/api';

// WhackAMole component
const WhackAMole = () => {
  // toggle between initial screen and game screen
  const [showGame, setShowGame] = useState(false); 
  // Show/hide tracking mode selection modal
  const [showTrackingSelection, setShowTrackingSelection] = useState(false);
  // show/hide mole selection modal
  const [showMoleSelection, setShowMoleSelection] = useState(false);
  // track if a mole has been selected
  const [hasSelectedMole, setHasSelectedMole] = useState(false);
  // store the selected mole number (1, 2, or 3)
  const [selectedMole, setSelectedMole] = useState(null);
  // track the currently hovered mole for UI feedback
  const [hoveredMole, setHoveredMole] = useState(null);
  // displaying mole selection messages
  const [selectionMessage, setSelectionMessage] = useState('');
  // Track whether to use hand or face tracking
  const [trackingMode, setTrackingMode] = useState('hand'); // Default to hand tracking
  // Track the currently hovered tracking mode for UI feedback
  const [hoveredTracking, setHoveredTracking] = useState(null);
  // Refs for DOM elements and game objects
  const videoRef = useRef(null); // Video element for webcam feed
  const canvasRef = useRef(null); // Canvas to render game
  const gameStatsRef = useRef(null); // displaying score
  const gameOverRef = useRef(null); // game over screen
  const finalScoreRef = useRef(null); // final score display
  const debugRef = useRef(null); // debug messages
  const handsRef = useRef(null); // MediaPipe Hands instance
  const faceMeshRef = useRef(null); // MediaPipe FaceMesh instance
  const cameraRef = useRef(null); // MediaPipe Camera instance
  const gameObjectRef = useRef(null); // GameLogic instance
  const gameStartedRef = useRef(false); // Tracks if game is running
  const lastRenderTimeRef = useRef(0);  // Tracks last render timestamp
  const hammerImageRef = useRef(null); // Hammer image
  const heartImageRef = useRef(null); // Heart image for lives
  const moleImageRef = useRef(null); // Selected mole image

  // Function to handle mole selection
  const selectMole = (mole) => {
    console.log(`Selecting mole ${mole}`);
    moleImageRef.current = new Image();
    moleImageRef.current.src = `/static/images/mole${mole}.png`; // Load selected mole image
    moleImageRef.current.onload = () => {
      console.log(`Mole ${mole} image loaded successfully`);
      setSelectedMole(mole); // Store selected mole
      setSelectionMessage(`Yay, you chose Mole ${mole}!`);
      setHoveredMole(mole); // Highlight selected mole
      // Hide selection after 2 seconds and start game
      setTimeout(() => {
        setShowMoleSelection(false);
        setHasSelectedMole(true);
        setSelectionMessage('');
        setHoveredMole(null);
      }, 2000);
    };
    moleImageRef.current.onerror = () => {
      console.error(`Failed to load mole${mole}.png`);
      alert(`Failed to load Mole ${mole} image. Please check if /static/images/mole${mole}.png exists.`);
      setSelectionMessage(`Error: Mole ${mole} image failed to load.`);
    };
  };

  // Function to handle tracking mode selection
  const selectTrackingMode = (mode) => {
    setTrackingMode(mode);
    setShowTrackingSelection(false);
    setShowMoleSelection(true);
    console.log(`Selected tracking mode: ${mode}`);
  };

  // Function to handle start game
  const handleStartGame = () => {
    setShowGame(true);
    setShowTrackingSelection(true);
  };

  // Effect hook to initialize game, handle webcam, and set up event listeners
  useEffect(() => {

    // Reset canvas and stats when starting a new game
    if (showGame && canvasRef.current && gameStatsRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 1280, 720); // Clear canvas
      gameStatsRef.current.textContent = 'Score: 0'; // Reset score
      if (gameOverRef.current) {
        gameOverRef.current.style.display = 'none';
        gameOverRef.current.innerHTML = '';
      }
    }

    // Ensure all refs are defined
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;
    
    // Hide game over screen initially
    gameOver.style.display = 'none';

    if (!canvas || !video || !gameStats || !gameOver || !finalScore || !debug) return;

    // Load hammer image
    hammerImageRef.current = new Image();
    hammerImageRef.current.src = '/static/images/hammer.png';
    hammerImageRef.current.onload = () => console.log('Hammer image loaded successfully');

    // Load heart image for lives
    heartImageRef.current = new Image();
    heartImageRef.current.src = '/static/images/heart.png';
    heartImageRef.current.onload = () => console.log('Heart image loaded successfully');

    // Initialize MediaPipe tracking based on mode
    const initTracking = () => {
      try {
        if (trackingMode === 'hand') {
          if (!window.Hands) {
            throw new Error('Hands library not loaded. Please ensure the MediaPipe Hands script is included.');
          }
          handsRef.current = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
          });
          handsRef.current.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
          });
          handsRef.current.onResults((results) =>
            onTrackingResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore, 'hand')
          );
          console.log('MediaPipe Hands initialized');
        } else {
          if (!window.FaceMesh) {
            throw new Error('FaceMesh library not loaded. Please ensure the MediaPipe FaceMesh script is included.');
          }
          faceMeshRef.current = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
          });
          faceMeshRef.current.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
          });
          faceMeshRef.current.onResults((results) =>
            onTrackingResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore, 'face')
          );
          console.log('MediaPipe FaceMesh initialized');
        }
      } catch (error) {
        debug.innerHTML = `<p class="warning">Tracking initialization error: ${error.message}</p>`;
        console.error('Tracking initialization failed:', error);
      }
    };

    // Start webcam feed
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        });
        video.srcObject = stream;
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play(); // Send frames to tracking
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => {
            if (trackingMode === 'hand' && handsRef.current) {
              await handsRef.current.send({ image: video });
            } else if (trackingMode === 'face' && faceMeshRef.current) {
              await faceMeshRef.current.send({ image: video });
            }
          },
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start();
        console.log('Camera started successfully');
      } catch (error) {
        debug.innerHTML = `<p class="warning">Camera error: ${error.message}</p>`;
      }
    };

     // Start the game
    const startGame = () => {
      if (!gameStartedRef.current && moleImageRef.current) { // making sure that the mole is selected
        startCamera()
          .then(() => {
            // Initialize GameLogic with selected mole image
            gameObjectRef.current = new GameLogic(canvas, gameStats, hammerImageRef.current, heartImageRef.current, moleImageRef.current);
            gameStartedRef.current = true;
            lastRenderTimeRef.current = performance.now();
            gameOver.style.display = 'none';
            requestAnimationFrame(gameLoop);
          })
          .catch((error) => {
            alert('Camera access error: ' + error.message);
          });
      }
    };

    // Game loop to update game state
    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        requestAnimationFrame(gameLoop);
      }
    };

    // Process tracking results (hand or face)
    const onTrackingResults = (results, ctx, video, gameObj, started, over, score, mode) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720); // Clear canvas
      ctx.save();
      ctx.translate(1280, 0);  // Flip horizontally for mirror effect
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720); // Draw webcam feed
      ctx.restore();

      const debug = debugRef.current; // Reference to debug element

      if (started && gameObj && !gameObj.gameOver) {
        if (mode === 'hand' && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          // Track index finger position (landmark 8)
          const indexFinger = results.multiHandLandmarks[0][8];
          const posX = Math.floor(1280 - indexFinger.x * 1280);
          const posY = Math.floor(indexFinger.y * 720);
          gameObj.updateCursorPosition(posX, posY);
          debug.innerHTML = ''; // Clear debug message when hand is detected
        } else if (mode === 'face' && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          // Track nose tip position (landmark 1)
          const noseTip = results.multiFaceLandmarks[0][1];
          const posX = Math.floor(1280 - noseTip.x * 1280);
          const posY = Math.floor(noseTip.y * 720);
          gameObj.updateCursorPosition(posX, posY);
          debug.innerHTML = ''; // Clear debug message when face is detected
        } else {
          console.log(`No ${mode} detected in this frame`);
          debug.innerHTML = `<p class="warning">❌ No ${mode} detected - Please ensure your ${mode} is visible to the webcam.</p>`;
        }
        gameObj.render(ctx);  // Render game objects
      }
      if (gameObj && gameObj.gameOver) {
        drawGameOverOnCanvas(ctx, gameObj.score, over, score); // Show game over screen
      }
      ctx.restore();
    };

    // Draw game over screen on canvas
    const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 720); // Semi-transparent overlay
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', 640, 300); // Adjusted to 300 for more space
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`Final Score: ${score}`, 640, 400); // Adjusted to 400
      ctx.fillStyle = '#4CAF50';
      ctx.font = '40px Arial';
      ctx.fillText('Press "R" to Restart', 640, 500); // Adjusted to 500
      finalScore.textContent = score;
      if (!gameObjectRef.current.scoreSubmitted) {
        gameObjectRef.current.scoreSubmitted = true;
        console.log('Attempting to submit score:', score, 'Token:', localStorage.getItem('access_token'));
        submitScore('Whack-A-Mole', score)
          .then((response) => {
            console.log('Score submitted successfully:', response);
          })
          .catch((error) => {
            console.error('Failed to submit score:', error.response?.data || error.message);
            alert('Failed to submit score. Please ensure you are logged in.');
          });
      }
    };

    // Restart the game
    const restartGame = () => {
      console.log('Restarting game...');
      if (cameraRef.current) cameraRef.current.stop();
      gameStartedRef.current = false;
      gameOver.style.display = 'none';
      startGame();
    };

    // Quit game and return to initial screen
    const quitGame = () => {
      console.log('Quitting game...');
      gameStartedRef.current = false;
      gameObjectRef.current = null;
      
      // Stop camera and cleanup
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      const canvas = canvasRef.current.getContext('2d');
      canvas.clearRect(0, 0, 1280, 720);
      
      // Show quit message
      canvas.fillStyle = 'rgba(0, 0, 0, 0.9)';
      canvas.fillRect(0, 0, 1280, 720);
      canvas.fillStyle = '#FFFFFF';
      canvas.font = 'bold 48px Arial';
      canvas.textAlign = 'center';
      canvas.textBaseline = 'middle';
      canvas.fillText('Game Quit', 640, 300);
      canvas.font = '24px Arial';
      canvas.fillText('Refresh the page to play again', 640, 360);
    };

    // Set up event listeners
    document.getElementById('start-btn')?.addEventListener('click', startGame);
    document.getElementById('restart-btn')?.addEventListener('click', restartGame);
    document.getElementById('test-camera-btn')?.addEventListener('click', startCamera);
    document.getElementById('play-again-btn')?.addEventListener('click', restartGame);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        restartGame();
      }
      if (e.key === 'q' || e.key === 'Q') {
        quitGame();
      }
    });

    initTracking(); // Initialize tracking based on mode

     // Cleanup on component unmount
    return () => {
      console.log('Cleaning up WhackAMole');
      if (cameraRef.current) cameraRef.current.stop();
      if (gameObjectRef.current) {
        gameObjectRef.current = null; // Ensure game object is cleared
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 1280, 720); // Clear canvas on unmount
      }
      document.getElementById('start-btn')?.removeEventListener('click', startGame);
      document.getElementById('restart-btn')?.removeEventListener('click', restartGame);
      document.getElementById('test-camera-btn')?.removeEventListener('click', startCamera);
      document.getElementById('play-again-btn')?.removeEventListener('click', restartGame);
      document.removeEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
          restartGame();
        }
        if (e.key === 'q' || e.key === 'Q') {
          quitGame();
        }
      });
    };
  }, [trackingMode]); // Re-run effect when trackingMode changes

  
    // GameLogic class to manage game state and rendering
    class GameLogic {
      constructor(ctx, stats, hammerImage, heartImage, moleImage) {
        // Initialize game state
        this.holes = [
          { x: 320, y: 180, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 640, y: 180, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 960, y: 180, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 320, y: 360, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 640, y: 360, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 960, y: 360, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 320, y: 540, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 640, y: 540, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
          { x: 960, y: 540, occupied: false, lastSpawnTime: 0, spawnInterval: 1500 },
        ];
        this.moles = []; // active mole array
        this.score = 0; // Player score
        this.lives = 3; // Player lives
        this.gameOver = false; // Game over state
        this.ctx = ctx; // Canvas context
        this.stats = stats; // Score display element
        this.moleSize = 60; // Mole size in pixels
        this.holeSize = 80; // Hole size in pixels
        this.visibleDuration = 2000; // Time a mole is visible (ms)
        this.gameDuration = 60000;  // Total game duration (ms)
        this.startTime = performance.now(); // Game start time
        this.cursorPosition = [640, 360];  // Initial hammer position
        this.hammerImage = hammerImage;  // Hammer image
        this.heartImage = heartImage; // Heart image
        this.moleImage = moleImage; // Selected mole image
        this.scoreSubmitted = false; // Tracks if score has been submitted
      }

      // Update hammer position based on tracking
    updateCursorPosition(posX, posY) {
      if (this.gameOver) return;
      this.cursorPosition = [posX, posY];
      this.moles = this.moles.filter((mole) => {
        const dist = Math.hypot(posX - mole.x, posY - mole.y);
        if (dist < this.moleSize / 2) { // Check if hammer hits mole
          this.score += 1;
          this.stats.textContent = `Score: ${this.score}`;
          // Play hit sound
          try {
            const hitSound = new Audio('/static/sounds/hit.mp3');
            hitSound.volume = 0.5;
            hitSound.play().catch((e) => console.log('Error playing sound:', e));
          } catch (e) {
            console.log('Could not play sound:', e);
          }
          const hole = this.holes.find((h) => h.x === mole.x && h.y === mole.y);
          if (hole) hole.occupied = false; // Free the hole
          return false; // Remove hit mole
        }
        return true;
      });
    }

      // Spawn a new mole in a random available hole
      spawnMole() {
        const currentTime = performance.now();
        const progress = Math.min((currentTime - this.startTime) / this.gameDuration, 1);

        // Prevent spawning if any hole is occupied
        const isAnyHoleOccupied = this.holes.some(hole => hole.occupied);
        if (isAnyHoleOccupied) return;

        const availableHoles = this.holes.filter(hole => !hole.occupied);
        if (availableHoles.length === 0) return;

        const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        this.moles.push({
          x: randomHole.x,
          y: randomHole.y,
          disappearTime: currentTime + this.visibleDuration * (1 - 0.6 * progress),  // Adjust visibility based on progress
        });
        randomHole.occupied = true;
        randomHole.lastSpawnTime = currentTime;
      }

      // Update game state without rendering
      updateWithoutRender(deltaTime) {
        if (this.gameOver) return;
        const currentTime = performance.now();
        const elapsedTime = currentTime - this.startTime;

        this.spawnMole(); // Attempt to spawn a new mole

        // Remove moles that have timed out
        this.moles = this.moles.filter((mole) => {
          if (currentTime > mole.disappearTime) {
            this.lives -= 1; // Lose a life for missed mole
            this.stats.textContent = `Score: ${this.score}`;
            const hole = this.holes.find((h) => h.x === mole.x && h.y === mole.y);
            if (hole) hole.occupied = false;
            if (this.lives <= 0) {
              this.gameOver = true; // End game if no lives left
            }
            return false;
          }
          return true;
        });

        if (elapsedTime > this.gameDuration) {
            this.gameOver = true; // End game after time limit
        }
      }

      // Render game elements to canvas
      render(ctx) {
        // Draw holes
        this.holes.forEach((hole) => {
          ctx.beginPath();
          ctx.arc(hole.x, hole.y, this.holeSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#4A4A4A';
          ctx.fill();
        });

        // Draw moles
        this.moles.forEach((mole) => {
        if (this.moleImage && this.moleImage.complete) {
          ctx.drawImage(this.moleImage, mole.x - this.moleSize / 2, mole.y - this.moleSize / 2, this.moleSize, this.moleSize);
        } else {
          ctx.beginPath();
          ctx.arc(mole.x, mole.y, this.moleSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#8B4513';
          ctx.fill();
        }
      });

        // Draw lives bar (rectangle with "Lives" text and hearts)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(1280 - 270, 20, 260, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Poppins';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Lives:', 1280 - 260, 50); 

        // Draw hearts with adjusted spacing
        for (let i = 0; i < 3; i++) {
          const x = 1280 - 30 - i * 60; // Position from right side
          const y = 50;
          if (i < this.lives) {
            if (this.heartImage && this.heartImage.complete) {
              ctx.drawImage(this.heartImage, x - 20, y - 20, 40, 40);
            } else {
              ctx.beginPath();
              ctx.moveTo(x, y - 10);
              ctx.bezierCurveTo(x + 10, y - 20, x + 20, y, x, y + 20);
              ctx.bezierCurveTo(x - 20, y, x - 10, y - 20, x, y - 10);
              ctx.fillStyle = '#FF0000';
              ctx.fill();
            }
          } else {
            if (this.heartImage && this.heartImage.complete) {
              ctx.globalAlpha = 0.3;
              ctx.drawImage(this.heartImage, x - 20, y - 20, 40, 40);
              ctx.globalAlpha = 1.0;
            } else {
              ctx.beginPath();
              ctx.moveTo(x, y - 10);
              ctx.bezierCurveTo(x + 10, y - 20, x + 20, y, x, y + 20);
              ctx.bezierCurveTo(x - 20, y, x - 10, y - 20, x, y - 10);
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }

        // Draw hammer at cursor position
        if (this.hammerImage && this.hammerImage.complete) {
          ctx.drawImage(
            this.hammerImage,
            this.cursorPosition[0] - 40,
            this.cursorPosition[1] - 40,
            90,
            90
          );
        } else {
          ctx.fillStyle = '#808080';
          ctx.fillRect(this.cursorPosition[0] - 20, this.cursorPosition[1] - 30, 40, 20);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(this.cursorPosition[0] - 5, this.cursorPosition[1] - 10, 10, 40);
        }

        this.stats.textContent = `Score: ${this.score}`;
        ctx.restore();
      }
    }

  // JSX for rendering the game UI
  return (
    <div className='inter'> 
      {/* Initial screen with instructions and start button */}
      <div style={{width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/mole-bg.svg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none'}}>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0}}>Whack A Mole</h2>
            <ul>
              <li><strong>Choose your tracking mode:</strong> Select hand or face tracking to control the hammer.</li>
              <li><strong>Choose your mole:</strong> Select your mole (1, 2, or 3) before starting.</li>
              <li><strong>Show your {trackingMode}:</strong> Ensure your {trackingMode} is visible to the webcam.</li>
              <li><strong>Whack moles:</strong> Move the hammer (controlled by your {trackingMode}) over moles in the holes to hit them.</li>
              <li><strong>Score points:</strong> Each hit adds 1 point.</li>
              <li><strong>Lives:</strong> You have 3 lives (shown as hearts at the top); miss a mole, lose a life.</li>
              <li><strong>Keyboard controls:</strong> Press 'R' to restart, 'Q' to quit.</li>
            </ul>
          </div>
        </div>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{maxWidth:"40%"}}>
            <img src="static/images/pages/mole-colour.svg" alt="Whack A Mole" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div style={{maxWidth:"20%", display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5vh'}}>
            <button className="inter start-button" onClick={() => setShowGame(true)} style={{ backgroundColor: `${localStorage.getItem('colorFilter') == "colorblind" ?'#01fefcff': '#4CAF50'}`, border: 'none', padding: '1em 1.5em', borderRadius: '1em', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5em', fontWeight: 600 , color: "#fff"}}>Start Game</span>
              <img src="static/images/pages/play-1.svg" alt="Start Game" style={{ width: '2vw', height: 'auto' }} />
            </button>
          </div>
        </div>
      </div>
      {/* Game screen with tracking and mole selection modals and canvas */}
      <div style={{ width: "100%", minHeight: "95vh", display: showGame ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
        {/* Tracking mode selection modal */}
        {showTrackingSelection && (
          <div className="tracking-selection" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            zIndex: 1000,
            border: '3px solid #2196F3'
          }}>
            <h2 style={{ color: '#fff', fontSize: '2em', marginBottom: '30px' }}>Choose Tracking Mode</h2>
            <div className="tracking-controls" style={{
              display: 'flex',
              gap: '30px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {['hand', 'face'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => selectTrackingMode(mode)}
                  onMouseEnter={() => setHoveredTracking(mode)}
                  onMouseLeave={() => setHoveredTracking(null)}
                  style={{
                    backgroundColor: '#2196F3',
                    border: hoveredTracking === mode ? '3px solid #4CAF50' : '3px solid transparent',
                    borderRadius: '15px',
                    padding: '15px 30px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: '#fff',
                    fontSize: '1.2em',
                    fontWeight: 600
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)} Tracking
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Mole selection modal */}
        {showMoleSelection && !hasSelectedMole && (
          <div className="mole-selection" style={{
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
            <h2 style={{ color: '#fff', fontSize: '2em', marginBottom: '30px' }}>Choose Your Mole</h2>
            <div className="selection-controls" style={{
              display: 'flex',
              gap: '30px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {[1, 2, 3].map((mole) => (
                <button
                  key={mole}
                  onClick={() => selectMole(mole)}
                  onMouseEnter={() => setHoveredMole(mole)}
                  onMouseLeave={() => setHoveredMole(null)}
                  style={{
                    background: 'none',
                    border: hoveredMole === mole ? '3px solid #4CAF50' : '3px solid transparent',
                    borderRadius: '15px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img
                    src={`/static/images/mole${mole}.png`}
                    alt={`Mole ${mole}`}
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
        {/* Game controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="controls" style={{ maxWidth: "70vw", display: 'flex', flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: '20px' }}>
            <button id="restart-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/replay.svg" alt="Restart" style={{ width: '35px', height: '35px' }} />
            </button>
            <button id="start-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: showMoleSelection ? 'none' : 'inline' }}>
              <img src="static/images/pages/play.svg" alt="Play" style={{ width: '40px', height: '40px' }} />
            </button>
            <button id="test-camera-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="static/images/pages/testing.svg" alt="Test Camera" style={{ width: '35px', height: '35px' }} />
            </button>
          </div>
        </div>
        <div ref={debugRef} className="debug-box" style={{ backgroundColor: "transparent" }}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} width="1280" height="720" style={{ backgroundColor: 'transparent' }}></canvas>
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

export default WhackAMole;