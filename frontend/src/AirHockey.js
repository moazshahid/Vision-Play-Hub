import React, { useEffect, useRef, useState } from 'react';
import './Game.css';

const AirHockey = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
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
  const [gameMode, setGameMode] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [modeSelected, setModeSelected] = useState(false);
  const [showModeOverlay, setShowModeOverlay] = useState(true);
  const [showDifficultyOverlay, setShowDifficultyOverlay] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.async = true;
    script.onload = () => console.log('MediaPipe Hands script preloaded');
    document.head.appendChild(script);

    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const debug = debugRef.current;

    canvasRef.current.width = 960;
    canvasRef.current.height = 540;
    gameOver.style.display = 'none';

    const initHandDetection = async () => {
      try {
        if (handsRef.current) {
          handsRef.current.close();
          handsRef.current = null;
        }
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
        if (cameraRef.current) {
          await cameraRef.current.stop();
          cameraRef.current = null;
        }
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
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
        await Promise.all([initHandDetection(), startCamera()])
          .then(() => {
            gameObjectRef.current = new GameLogic(canvas, gameStats, video, difficulty, gameMode);
            gameStartedRef.current = true;
            lastRenderTimeRef.current = performance.now();
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
      if (!gameStartedRef.current || !gameObjectRef.current) {
        return;
      }
      const deltaTime = timestamp - lastRenderTimeRef.current;
      lastRenderTimeRef.current = timestamp;
      try {
        gameObjectRef.current.updateWithoutRender(deltaTime, fingerPositionRef.current);
        gameObjectRef.current.render();
        requestAnimationFrame(gameLoop);
      } catch (error) {
        console.error('Error in game loop:', error);
        debug.innerHTML = `<p class="warning">❌ Game loop error: ${error.message}</p>`;
        gameStartedRef.current = false;
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', async () => {
      gameStartedRef.current = false;
      if (cameraRef.current) {
        await cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      setGameMode(null);
      setDifficulty(null);
      setModeSelected(false);
      setShowModeOverlay(true);
      setShowDifficultyOverlay(false);
      setConfirmationMessage('');
      gameOver.style.display = 'none';
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
      debug.innerHTML = `<p>Game restarted via play again button</p>`;
      console.log('Game restarted via play again button');
    });

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current = null;
      }
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      gameStartedRef.current = false;
      gameObjectRef.current = null;
      console.log('Component unmounted, all resources cleaned up');
    };
  }, [gameMode, difficulty, modeSelected]);

  const onHandResults = (results, gameObj, started) => {
    try {
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          if (gameMode === 'single') {
            const playerFinger = results.multiHandLandmarks[0][8];
            const playerFingerX = (1 - playerFinger.x) * 960;
            const playerFingerY = playerFinger.y * 540;
            fingerPositionRef.current.player.x = playerFingerX;
            fingerPositionRef.current.player.y = playerFingerY;
            console.log('Player hand detected (Single Player):', { fingerX: playerFingerX, fingerY: playerFingerY });
          } else if (gameMode === 'two') {
            let leftHandAssigned = false;
            let rightHandAssigned = false;
            for (const landmarks of results.multiHandLandmarks) {
              const finger = landmarks[8];
              const fingerX = (1 - finger.x) * 960;
              const fingerY = finger.y * 540;
              if (fingerX < 480) {
                fingerPositionRef.current.opponent.x = fingerX;
                fingerPositionRef.current.opponent.y = fingerY;
                console.log('Opponent hand (red paddle) detected on left side:', { fingerX, fingerY });
                leftHandAssigned = true;
              } else {
                fingerPositionRef.current.player.x = fingerX;
                fingerPositionRef.current.player.y = fingerY;
                console.log('Player hand (blue paddle) detected on right side:', { fingerX, fingerY });
                rightHandAssigned = true;
              }
            }
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

  class GameLogic {
    constructor(ctx, stats, video, difficulty, gameMode) {
      this.canvasWidth = 960;
      this.canvasHeight = 540;
      this.ctx = ctx;
      this.stats = stats;
      this.video = video;
      this.difficulty = difficulty;
      this.gameMode = gameMode;
      this.playerScore = 0;
      this.opponentScore = 0;
      this.gameOver = false;
      this.winningScore = 5;
      this.puck = {
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2,
        radius: 12,
        speedX: 0,
        speedY: 0,
        maxSpeed: 500,
      };
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
        speed: gameMode === 'two' ? 400 : (difficulty === 'easy' ? 250 : difficulty === 'medium' ? 350 : 450),
      };
      this.goalWidth = 150;
      this.goalHeight = gameMode === 'two' ? 200 : (difficulty === 'easy' ? 240 : difficulty === 'medium' ? 200 : 160);
      this.playerGoal = { x: this.canvasWidth - this.goalWidth, y: (this.canvasHeight - this.goalHeight) / 2 };
      this.opponentGoal = { x: 0, y: (this.canvasHeight - this.goalHeight) / 2 };
      this.borderWidth = 8;
      this.borderGlowColor = 'rgba(0, 255, 255, 0.8)';
      this.resetPuck();
    }

    resetPuck() {
      this.puck.x = this.canvasWidth / 2;
      this.puck.y = this.canvasHeight / 2;
      this.puck.speedX = 0;
      this.puck.speedY = 0;
      console.log('Puck reset:', this.puck);
    }

    updatePaddlePosition(fingerPosition) {
      this.playerPaddle.x = Math.max(this.canvasWidth / 2, Math.min(this.canvasWidth - this.playerPaddle.radius, fingerPosition.player.x));
      this.playerPaddle.y = Math.max(this.playerPaddle.radius, Math.min(this.canvasHeight - this.playerPaddle.radius, fingerPosition.player.y));
      if (this.gameMode === 'two') {
        this.opponentPaddle.x = Math.max(this.borderWidth + this.opponentPaddle.radius, Math.min(this.canvasWidth / 2 - this.opponentPaddle.radius, fingerPosition.opponent.x));
        this.opponentPaddle.y = Math.max(this.opponentPaddle.radius, Math.min(this.canvasHeight - this.opponentPaddle.radius, fingerPosition.opponent.y));
      }
    }

    updateWithoutRender(deltaTime, fingerPosition) {
      this.updatePaddlePosition(fingerPosition);
      if (this.gameMode === 'two') {
        this.stats.textContent = `Player 1: ${this.opponentScore}  Player 2: ${this.playerScore}`;
      } else {
        this.stats.textContent = `Player: ${this.playerScore}  Opponent: ${this.opponentScore}`;
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

  const selectGameMode = (selectedMode) => {
    setGameMode(selectedMode);
    setShowModeOverlay(false);
    if (selectedMode === 'single') {
      setShowDifficultyOverlay(true);
      setConfirmationMessage('Mode selected: Single Player');
    } else {
      setConfirmationMessage('Mode selected: Two Player');
      setModeSelected(true);
    }
    setTimeout(() => {
      setConfirmationMessage('');
    }, 2000);
    console.log(`Mode selected: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Player`);
  };

  const selectDifficulty = (selectedDifficulty) => {
    if (gameMode === 'single') {
      setDifficulty(selectedDifficulty);
      setShowDifficultyOverlay(false);
      setConfirmationMessage(`Difficulty selected: ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
      setModeSelected(true);
      setTimeout(() => {
        setConfirmationMessage('');
      }, 2000);
      console.log(`Difficulty selected: ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
    }
  };

  const handleModeSelect = (selectedMode) => {
    selectGameMode(selectedMode);
  };

  const handleDifficultySelect = (selectedDifficulty) => {
    selectDifficulty(selectedDifficulty);
  };

  return (
    <div className='inter'>
      <div className='slider-container'>
        <div className='slide' style={{flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
          <div style={{maxWidth: "40%", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <div className="instructions inter">
              <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Air Hockey</h2>
              <ul>
                <li><strong>Select Mode:</strong> Click Single Player or Two Player.</li>
                <li><strong>Single Player:</strong> Choose difficulty (Easy, Medium, or Hard) and play against AI.</li>
                <li><strong>Two Player:</strong> Any hand on the left side controls the red paddle; any hand on the right side controls the blue paddle.</li>
                <li><strong>Show your hand(s):</strong> Ensure hand(s) are visible to the webcam.</li>
                <li><strong>Move the paddle:</strong> Use index finger to control your paddle.</li>
                <li><strong>Hit the puck:</strong> Strike the puck to score in the opponent's goal.</li>
                <li><strong>Score points:</strong> Get the puck into the opponent's goal to score.</li>
                <li><strong>Win the game:</strong> First to 5 points wins!</li>
                <li><strong>Controls:</strong> Press 'R' to Restart and 'Q' to quit.</li>
              </ul>
            </div>
          </div>
          <div style={{maxWidth:"40%"}}>
            <img src="static/images/pages/airhockey-lineart.svg" alt="Air Hockey" style={{ width: '100%', height: 'auto' }} />
          </div>
        </div>
        <div className='slide'>
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
            <div ref={debugRef} className="debug-box" style={{backgroundColor:"#fff"}}></div>
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
      </div>
    </div>
  );
};

export default AirHockey;