import React, { useState, useEffect, useRef } from 'react';
import './Game.css';
import { submitScore } from './utils/api';

const SpaceWars = () => {
  const [showGame, setShowGame] = useState(false);
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
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;

    gameOver.style.display = 'none';

    const ufoImage = new Image();
    ufoImage.src = '/static/images/ufo.png';
    ufoImage.onload = () => console.log('UFO image loaded successfully');

    const specialUfoImage = new Image();
    specialUfoImage.src = '/static/images/specialufo.png';
    specialUfoImage.onload = () => console.log('Special UFO image loaded successfully');

    const backgroundImage = new Image();
    backgroundImage.src = '/static/images/space.jpg';
    backgroundImage.onload = () => console.log('Background image loaded successfully');

    const initHandDetection = () => {
      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      handsRef.current.onResults((results) =>
        onHandResults(results, canvas, video, gameObjectRef.current, gameStartedRef.current, gameOver, finalScore)
      );
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user', frameRate: 60 },
        });
        video.srcObject = stream;
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play();
        cameraRef.current = new window.Camera(video, {
          onFrame: async () => await handsRef.current.send({ image: video }),
          width: 1280,
          height: 720,
        });
        await cameraRef.current.start();
        console.log('Camera started successfully');
      } catch (error) {
        debug.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    const startGame = () => {
      if (!gameStartedRef.current) {
        startCamera()
          .then(() => {
            if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
              animationFrameIdRef.current = null;
            }
            gameObjectRef.current = new GameLogic(canvas, gameStats, ufoImage, backgroundImage, specialUfoImage);
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

    const gameLoop = (timestamp) => {
      if (gameStartedRef.current && gameObjectRef.current && !gameObjectRef.current.gameOver) {
        const deltaTime = timestamp - lastRenderTimeRef.current;
        lastRenderTimeRef.current = timestamp;
        gameObjectRef.current.updateWithoutRender(deltaTime);
        gameObjectRef.current.render(canvas); // Render here to sync with update
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    };

    const testCamera = async () => {
      try {
        await startCamera(); // Start the camera
        gameStartedRef.current = false; // Ensure game is not running
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current); // Stop any existing game loop
          animationFrameIdRef.current = null;
        }
        const ctx = canvasRef.current.getContext('2d');
        const renderCameraPreview = () => {
          if (!gameStartedRef.current && videoRef.current.srcObject) {
            ctx.save();
            ctx.clearRect(0, 0, 1280, 720);
            ctx.translate(1280, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
            ctx.restore();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Camera Test - Press Start to Play', 640, 360);
            animationFrameIdRef.current = requestAnimationFrame(renderCameraPreview);
          }
        };
        renderCameraPreview();
      } catch (error) {
        debugRef.current.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas, gameStats, ufoImage, backgroundImage, specialUfoImage);
      gameObjectRef.current.startTime = Date.now(); // Reset timer
      gameObjectRef.current.elapsedTime = 0;
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.getElementById('test-camera-btn').addEventListener('click', testCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas, gameStats, ufoImage, backgroundImage, specialUfoImage);
      gameObjectRef.current.startTime = Date.now(); // Reset timer
      gameObjectRef.current.elapsedTime = 0;
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        gameObjectRef.current = new GameLogic(canvas, gameStats, ufoImage, backgroundImage, specialUfoImage);
        gameObjectRef.current.startTime = Date.now(); // Reset timer
        gameObjectRef.current.elapsedTime = 0;
        gameOver.style.display = 'none';
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        requestAnimationFrame(gameLoop);
      }
      if (e.key === 'q' || e.key === 'Q') {
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
        if (videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      
        // Cancel animation frame
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      
        // Show quit message
        const canvas = canvasRef.current.getContext('2d');
        canvas.clearRect(0, 0, 1280, 720);
        canvas.fillStyle = 'rgba(0, 0, 0, 0.9)';
        canvas.fillRect(0, 0, 1280, 720);
        canvas.fillStyle = '#FFFFFF';
        canvas.font = 'bold 48px Arial';
        canvas.textAlign = 'center';
        canvas.textBaseline = 'middle';
        canvas.fillText('Game Quit', 640, 320);
        canvas.font = '24px Arial';
        canvas.fillText('Refresh the page to play again', 640, 380);
      
        console.log('Game quit via Q key');
      }
    });

    initHandDetection();

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 1280, 720);
      ctx.restore();
      if (started && gameObj) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gameObj.gameOver) {
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const isThumbsUp = isThumbsUpGesture(results.multiHandLandmarks[0]);
          gameObj.updateFingerPosition(fingerX, fingerY, isThumbsUp);
          debug.innerHTML = '';
        } else {
          debug.innerHTML = '<p class="warning">❌ No hands detected - Please ensure one hand is visible to the webcam</p>';
        }
        gameObj.render(ctx); // Render game elements
        if (gameObj.gameOver) {
          drawGameOverOnCanvas(ctx, gameObj.score, over, score);
        }
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Camera Test - Press Start to Play', 640, 360);
      }
      ctx.restore();
    };

    const isThumbsUpGesture = (landmarks) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      // Detect thumbs-up gesture - just check if thumb is above index finger
      return thumbTip.y < indexTip.y - 0.10 && indexTip.y < middleTip.y;
    };

    const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 720);
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
      if (!gameObjectRef.current.scoreSubmitted) {
        gameObjectRef.current.scoreSubmitted = true;
        submitScore('SpaceWars', score)
          .then((response) => {
            console.log('Score submitted successfully:', response);
          })
          .catch((error) => {
            console.error('Failed to submit score:', error.response?.data || error.message);
            alert('Failed to submit score. Please ensure you are logged in.');
          });
      }
    };

    class GameLogic {
      constructor(ctx, stats, ufoImage, backgroundImage, specialUfoImage) {
        this.ctx = ctx;
        this.stats = stats;
        this.ufoImage = ufoImage;
        this.backgroundImage = backgroundImage;
        this.specialUfoImage = specialUfoImage;
        this.bossImage = new Image();
        this.bossImage.src = '/static/images/boss.png';
        this.bossImage.onload = () => console.log('Boss image loaded successfully');
        this.explosionImage = new Image();
        this.explosionImage.src = '/static/images/explode.png';
        this.explosionImage.onload = () => console.log('Explosion image loaded successfully');
        this.frozenUfoImage = new Image();
        this.frozenUfoImage.src = '/static/images/frozen_ufo.png'; 
        this.frozenUfoImage.onload = () => console.log('Frozen UFO image loaded successfully');
        this.ufos = [];
        this.boss = null; // Track boss spaceship
        this.bossHits = 0; // Track hits on boss
        this.bossSpawnScore = 15; // Score threshold to spawn boss
        this.lastBossScore = 0; // Score when last boss was spawned or game started
        this.bossMessage = null; // Track boss incoming message state
        this.explosions = [];
        this.score = 0;
        this.misses = 0;
        this.gameOver = false;
        this.crosshairPosition = [640, 360];
        this.isShooting = false;
        this.spawnTimer = 0;
        this.spawnInterval = 2000;
        this.scoreSubmitted = false;
        this.frozenUfo = null; // Track frozen UFO
        this.isFrozen = false; // Track if UFOs are frozen
        this.freezeStartTime = 0; // Time when freeze starts
        this.freezeDuration = 3000; // 3 seconds freeze duration
        this.freezeMessage = null; // Track freeze message state
        this.lastShotTime = 0;
        this.laserActive = false;
        this.laserEndPosition = null;
        this.laserStartPosition = null; 
        this.laserDisplayTime = 0;
        this.laserDuration = 100;
        this.backgroundOffsetY = 0; // Tracks the vertical offset of the background
        this.backgroundSpeed = 100; // Pixels per second for scrolling speed
        this.startTime = Date.now(); // Record game start time
        this.elapsedTime = 0; // Track elapsed time in seconds
        this.baseSpawnInterval = 2000; // Initial spawn interval in ms
        this.minSpawnInterval = 500;   // Minimum spawn interval
        this.spawnInterval = this.baseSpawnInterval; // Current spawn interval
        this.baseUfoSpeed = 100;       // Base minimum UFO speed
        this.maxUfoSpeed = 300;        // Maximum UFO speed
        this.difficultyIncreaseInterval = 10000; // Increase difficulty every 10 seconds
        this.lastDifficultyUpdate = Date.now();  // Track last difficulty update
      }

      spawnUfo() {
        if (this.score >= this.bossSpawnScore && this.score >= this.lastBossScore + 15 && !this.boss) {
          // Spawn boss when score is at least bossSpawnScore and has increased by 15 since last boss
          this.boss = {
            x: Math.floor(Math.random() * (1280 - 200)), // Larger width, so adjust range
            y: 0, // Start at top
            width: 200, // Larger size
            height: 200,
            speedY: 50, // Slower than regular UFOs
            isBoss: true,
            hits: 0, // Track hits on boss
          };
          this.bossMessage = {
            text: 'Boss Incoming!',
            startTime: Date.now(),
          };
          console.log('Boss spawned!');
        } else if (this.ufos.length > 0 && Math.random() < 0.45 && !this.frozenUfo) { // 45% chance for frozen UFO, only if other UFOs exist
          this.frozenUfo = {
            x: Math.floor(Math.random() * (1280 - 100)),
            y: 0,
            width: 100,
            height: 100,
            speedY: 100, // Moderate speed
            isFrozenUfo: true,
          };
          console.log('Frozen UFO spawned!');
        } else {
          const speedIncrease = Math.min(200, Math.floor(this.elapsedTime / 10) * 20); // Increase speed by 20 every 10 seconds, cap at 200
          const speedY = Math.random() * 100 + this.baseUfoSpeed + speedIncrease; // Random speed between base + increase and max
          const cappedSpeedY = Math.min(speedY, this.maxUfoSpeed); // Cap speed to maxUfoSpeed
          const x = Math.floor(Math.random() * (1280 - 100)); // Random x position
          const isSpecial = Math.random() < 0.2; // 20% chance for special UFO
          this.ufos.push({
            x: x,
            y: 0, // Start at top
            width: 100,
            height: 100,
            speedY: speedY,
            isSpecial: isSpecial,
          });
        }
      }

      updateFingerPosition(fingerX, fingerY, isThumbsUp) {
        if (!this.gameOver) {
          this.crosshairPosition = [fingerX, fingerY];
          const currentTime = Date.now();
          
          if (isThumbsUp && !this.isShooting && (currentTime - this.lastShotTime > 200)) {
            this.isShooting = true;
            this.lastShotTime = currentTime;
            // Use bottom center (640, 720) as laser start point, but crosshair for aiming
            this.checkHit([640, 720]);
            try {
              const shootSound = new Audio('/static/sounds/shoot2.mp3');
              shootSound.volume = 0.5;
              shootSound.play().catch((e) => console.log('Error playing shoot sound:', e));
            } catch (e) {
              console.log('Could not load or play shoot sound:', e);
            }
            setTimeout(() => {
              this.isShooting = false;
            }, 500);
          } else if (!isThumbsUp && this.isShooting) {
            this.isShooting = false;
          }
        }
      }

      checkHit(laserStartPosition) {
        let hit = false;
        // Check for frozen UFO hit
        if (this.frozenUfo) {
          const dx = this.crosshairPosition[0] - (this.frozenUfo.x + this.frozenUfo.width / 2);
          const dy = this.crosshairPosition[1] - (this.frozenUfo.y + this.frozenUfo.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 50) {
            this.score += 3; // Award 3 points for frozen UFO
            hit = true;
            this.isFrozen = true; // Freeze all UFOs
            this.freezeStartTime = Date.now();
            this.freezeMessage = {
              text: 'Time Frozen for 3 Seconds!',
              startTime: Date.now(),
            };
            this.explosions.push({
              x: this.frozenUfo.x,
              y: this.frozenUfo.y,
              width: this.frozenUfo.width,
              height: this.frozenUfo.height,
              startTime: Date.now(),
              opacity: 1.0,
            });
            this.laserActive = true;
            this.laserEndPosition = [this.frozenUfo.x + this.frozenUfo.width / 2, this.frozenUfo.y + this.frozenUfo.height / 2];
            this.laserStartPosition = laserStartPosition;
            this.laserDisplayTime = Date.now();
            try {
              const explosionSound = new Audio('/static/sounds/explode.mp3');
              explosionSound.volume = 0.5;
              explosionSound.play().catch((e) => console.log('Error playing explosion sound:', e));
            } catch (e) {
              console.log('Could not load or play explosion sound:', e);
            }
            this.frozenUfo = null; // Remove frozen UFO
            return; // Exit early to prioritize frozen UFO hit
          }
        }
        // Check for boss hit
        if (this.boss) {
          const dx = this.crosshairPosition[0] - (this.boss.x + this.boss.width / 2);
          const dy = this.crosshairPosition[1] - (this.boss.y + this.boss.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) { // Larger hit radius for boss
            this.boss.hits += 1;
            hit = true;
            this.laserActive = true;
            this.laserEndPosition = [this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2];
            this.laserStartPosition = laserStartPosition;
            this.laserDisplayTime = Date.now();
            try {
              const explosionSound = new Audio('/static/sounds/explode.mp3');
              explosionSound.volume = 0.5;
              explosionSound.play().catch((e) => console.log('Error playing explosion sound:', e));
            } catch (e) {
              console.log('Could not load or play explosion sound:', e);
            }
            if (this.boss.hits >= 4) {
              // Boss destroyed, add explosion and clear all UFOs
              this.score += 10; // Bonus points for boss
              this.explosions.push({
                x: this.boss.x,
                y: this.boss.y,
                width: this.boss.width,
                height: this.boss.height,
                startTime: Date.now(),
                opacity: 1.0
              });
              // Explode all UFOs on screen
              this.ufos.forEach((ufo) => {
                this.explosions.push({
                  x: ufo.x,
                  y: ufo.y,
                  width: ufo.width,
                  height: ufo.height,
                  startTime: Date.now(),
                  opacity: 1.0
                });
                this.score += ufo.isSpecial ? 5 : 1; // Add points for each UFO
              });
              this.ufos = []; // Clear all UFOs
              this.boss = null; // Remove boss
              this.lastBossScore = this.score; // Update last boss score to current score
              this.bossSpawnScore = this.score + 15; // Next boss spawns after 15 more points
            }
          }
        }
        // Check regular UFO hits
        const newUfos = [];
        this.ufos.forEach((ufo) => {
          const dx = this.crosshairPosition[0] - (ufo.x + ufo.width / 2);
          const dy = this.crosshairPosition[1] - (ufo.y + ufo.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 50) {
            this.score += ufo.isSpecial ? 5 : 1;
            hit = true;
            this.explosions.push({
              x: ufo.x,
              y: ufo.y,
              width: ufo.width,
              height: ufo.height,
              startTime: Date.now(),
              opacity: 1.0
            });
            this.laserActive = true;
            this.laserEndPosition = [ufo.x + ufo.width / 2, ufo.y + ufo.height / 2];
            this.laserStartPosition = laserStartPosition;
            this.laserDisplayTime = Date.now();
            try {
              const explosionSound = new Audio('/static/sounds/explode.mp3');
              explosionSound.volume = 0.5;
              explosionSound.play().catch((e) => console.log('Error playing explosion sound:', e));
            } catch (e) {
              console.log('Could not load or play explosion sound:', e);
            }
          } else {
            newUfos.push(ufo);
          }
        });
        this.ufos = newUfos;
      }

      updateWithoutRender(deltaTime) {
        if (this.gameOver) return;
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000); // Update elapsed time in seconds
        
        // Adjust difficulty every difficultyIncreaseInterval
        if (Date.now() - this.lastDifficultyUpdate >= this.difficultyIncreaseInterval) {
          // Decrease spawn interval (faster spawns)
          this.spawnInterval = Math.max(
            this.minSpawnInterval,
            this.baseSpawnInterval - Math.floor(this.elapsedTime / 10) * 200
          );
          this.lastDifficultyUpdate = Date.now();
        }
        const deltaSeconds = deltaTime / 1000;
        this.backgroundOffsetY -= this.backgroundSpeed * deltaSeconds;
        this.backgroundOffsetY = this.backgroundOffsetY % 720;
        
        if (this.backgroundOffsetY > 0) {
          this.backgroundOffsetY -= 720;
        }
        
        // Check if freeze effect is over
        if (this.isFrozen && Date.now() - this.freezeStartTime >= this.freezeDuration) {
          this.isFrozen = false; // Resume movement
          this.freezeMessage = null; // Clear message
        }
        
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && !this.isFrozen) {
          this.spawnUfo();
          this.spawnTimer = 0;
        }
        
        // Update boss
        if (this.boss) {
          if (!this.isFrozen) {
            this.boss.y += this.boss.speedY * deltaSeconds;
          }
          if (this.boss.y > 720) {
            this.misses += 1;
            this.boss = null; // Remove boss if it goes off-screen
            if (this.misses >= 3) {
              this.gameOver = true;
            }
          }
        }

        // Update frozen UFO
        if (this.frozenUfo && !this.isFrozen) {
          this.frozenUfo.y += this.frozenUfo.speedY * deltaSeconds;
          if (this.frozenUfo.y > 720) {
            this.misses += 1;
            this.frozenUfo = null; // Remove frozen UFO if it goes off-screen
            if (this.misses >= 3) {
              this.gameOver = true;
            }
          }
        }

        // Update UFOs
        const newUfos = [];
        this.ufos.forEach((ufo) => {
          if (!this.isFrozen) {
            ufo.y += ufo.speedY * deltaSeconds;
          }
          if (ufo.y > 720) {
            this.misses += 1;
            if (this.misses >= 3) {
              this.gameOver = true;
            }
          } else {
            newUfos.push(ufo);
          }
        });
        this.ufos = newUfos;
        if (this.laserActive && Date.now() - this.laserDisplayTime > this.laserDuration) {
          this.laserActive = false;
          this.laserEndPosition = null;
        }

        // Update explosions
        this.explosions = this.explosions.filter((explosion) => {
          const timeElapsed = Date.now() - explosion.startTime;
          const fadeDuration = 700; // Explosion lasts 700ms
          if (timeElapsed < fadeDuration) {
            explosion.opacity = 1.0 - timeElapsed / fadeDuration; // Linear fade
            return true;
          }
          return false; // Remove expired explosions
        });
      }

      render(ctx) {
        // Clear the canvas to prevent visual artifacts
        ctx.clearRect(0, 0, 1280, 720);
        
        // Draw video feed (flipped horizontally)
        ctx.save();
        ctx.translate(1280, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
        ctx.restore();
        
        // Draw scrolling background
        if (this.backgroundImage.complete) {
          // Draw the first image at the current offset
          ctx.drawImage(this.backgroundImage, 0, this.backgroundOffsetY, 1280, 720);
          // Draw the second image below it, ensuring no gap
          ctx.drawImage(this.backgroundImage, 0, this.backgroundOffsetY + 720, 1280, 721); // Slight overlap
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1280, 720);
        }
        
        // Draw boss incoming message
        if (this.bossMessage && Date.now() - this.bossMessage.startTime < 1200) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.font = 'bold 60px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.bossMessage.text, 640, 360);
          ctx.restore();
        } else if (this.bossMessage) {
          this.bossMessage = null; // Clear message after 1.2 seconds
        }

        // Draw boss
        if (this.boss && this.bossImage.complete) {
          ctx.drawImage(this.bossImage, this.boss.x, this.boss.y, this.boss.width, this.boss.height);
        } else if (this.boss) {
          ctx.fillStyle = '#800080'; // Purple fallback for boss
          ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);
        }

        // Draw frozen UFO
        if (this.frozenUfo && this.frozenUfoImage.complete) {
          ctx.drawImage(this.frozenUfoImage, this.frozenUfo.x, this.frozenUfo.y, this.frozenUfo.width, this.frozenUfo.height);
        } else if (this.frozenUfo) {
          ctx.fillStyle = '#00BFFF'; // Deep sky blue fallback for frozen UFO
          ctx.fillRect(this.frozenUfo.x, this.frozenUfo.y, this.frozenUfo.width, this.frozenUfo.height);
        }
        
        // Draw freeze message
        if (this.freezeMessage && Date.now() - this.freezeMessage.startTime < 1200) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 191, 255, 0.8)'; // Deep sky blue with transparency
          ctx.font = 'bold 60px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.freezeMessage.text, 640, 360);
          ctx.restore();
        }

        // Draw UFOs
        this.ufos.forEach((ufo) => {
          const image = ufo.isSpecial ? this.specialUfoImage : this.ufoImage;
          if (image.complete) {
            ctx.drawImage(image, ufo.x, ufo.y, ufo.width, ufo.height);
          } else {
            ctx.fillStyle = ufo.isSpecial ? '#FF0000' : '#FFD700'; // Red for special, yellow for regular as fallback
            ctx.fillRect(ufo.x, ufo.y, ufo.width, ufo.height);
          }
        });
        
        // Draw explosions
        this.explosions.forEach((explosion) => {
          if (this.explosionImage.complete) {
            ctx.save();
            ctx.globalAlpha = explosion.opacity;
            ctx.drawImage(this.explosionImage, explosion.x, explosion.y, explosion.width, explosion.height);
            ctx.restore();
          } else {
            ctx.save();
            ctx.globalAlpha = explosion.opacity;
            ctx.fillStyle = '#FF4500'; // Fallback orange color
            ctx.fillRect(explosion.x, explosion.y, explosion.width, explosion.height);
            ctx.restore();
          }
        });

        // Draw laser effect if active
        if (this.laserActive && this.laserEndPosition && this.laserStartPosition) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#FF0000';
          ctx.shadowBlur = 10;
          ctx.moveTo(this.laserStartPosition[0], this.laserStartPosition[1]);
          ctx.lineTo(this.laserEndPosition[0], this.laserEndPosition[1]);
          ctx.stroke();
          ctx.restore();
        }
        
        // Draw HUD
        this.drawHUD(ctx);
      }

      drawHUD(ctx) {
        // Save context state
        ctx.save();
      
        // HUD styling
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; // Cyan for futuristic look
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      
        // Cockpit frame (curved borders)
        const frameWidth = 1280;
        const frameHeight = 720;
        const cornerRadius = 50;
      
        // Top-left corner arc
        ctx.beginPath();
        ctx.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, 1.5 * Math.PI);
        ctx.stroke();
      
        // Top-right corner arc
        ctx.beginPath();
        ctx.arc(frameWidth - cornerRadius, cornerRadius, cornerRadius, 1.5 * Math.PI, 2 * Math.PI);
        ctx.stroke();
      
        // Bottom-left corner arc
        ctx.beginPath();
        ctx.arc(cornerRadius, frameHeight - cornerRadius, cornerRadius, 0.5 * Math.PI, Math.PI);
        ctx.stroke();
      
        // Bottom-right corner arc
        ctx.beginPath();
        ctx.arc(frameWidth - cornerRadius, frameHeight - cornerRadius, cornerRadius, 0, 0.5 * Math.PI);
        ctx.stroke();
      
        // Connecting lines for the frame
        ctx.beginPath();
        // Top horizontal
        ctx.moveTo(cornerRadius, cornerRadius);
        ctx.lineTo(frameWidth - cornerRadius, cornerRadius);
        // Bottom horizontal
        ctx.moveTo(cornerRadius, frameHeight - cornerRadius);
        ctx.lineTo(frameWidth - cornerRadius, frameHeight - cornerRadius);
        // Left vertical
        ctx.moveTo(cornerRadius, cornerRadius);
        ctx.lineTo(cornerRadius, frameHeight - cornerRadius);
        // Right vertical
        ctx.moveTo(frameWidth - cornerRadius, cornerRadius);
        ctx.lineTo(frameWidth - cornerRadius, frameHeight - cornerRadius);
        ctx.stroke();
      
        // Enhanced central reticle (replaces existing crosshair)
        const reticleX = this.crosshairPosition[0];
        const reticleY = this.crosshairPosition[1];
        ctx.beginPath();
        // Outer circle
        ctx.arc(reticleX, reticleY, 25, 0, 2 * Math.PI);
        ctx.stroke();
        // Inner cross
        ctx.beginPath();
        ctx.moveTo(reticleX - 15, reticleY);
        ctx.lineTo(reticleX + 15, reticleY);
        ctx.moveTo(reticleX, reticleY - 15);
        ctx.lineTo(reticleX, reticleY + 15);
        ctx.stroke();
        // Small corner brackets
        const bracketSize = 10;
        ctx.beginPath();
        // Top-left bracket
        ctx.moveTo(reticleX - 30, reticleY - 30);
        ctx.lineTo(reticleX - 30, reticleY - 30 + bracketSize);
        ctx.moveTo(reticleX - 30, reticleY - 30);
        ctx.lineTo(reticleX - 30 + bracketSize, reticleY - 30);
        // Top-right bracket
        ctx.moveTo(reticleX + 30, reticleY - 30);
        ctx.lineTo(reticleX + 30, reticleY - 30 + bracketSize);
        ctx.moveTo(reticleX + 30, reticleY - 30);
        ctx.lineTo(reticleX + 30 - bracketSize, reticleY - 30);
        // Bottom-left bracket
        ctx.moveTo(reticleX - 30, reticleY + 30);
        ctx.lineTo(reticleX - 30, reticleY + 30 - bracketSize);
        ctx.moveTo(reticleX - 30, reticleY + 30);
        ctx.lineTo(reticleX - 30 + bracketSize, reticleY + 30);
        // Bottom-right bracket
        ctx.moveTo(reticleX + 30, reticleY + 30);
        ctx.lineTo(reticleX + 30, reticleY + 30 - bracketSize);
        ctx.moveTo(reticleX + 30, reticleY + 30);
        ctx.lineTo(reticleX + 30 - bracketSize, reticleY + 30);
        ctx.stroke();
      
        // Status indicators (score and misses)
        ctx.fillText(`Score: ${this.score}`, 20, 20);
        ctx.fillText(`Misses: ${this.misses}/3`, 20, 50);
        
        // Timer display
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;
        ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, 20, 80);
      
        // Shooting indicator
        if (this.isShooting) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.arc(reticleX, reticleY, 10, 0, 2 * Math.PI);
          ctx.fill();
        }
      
        // Restore context state
        ctx.restore();
      }

    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <div className='inter'>
      <div style={{
        width: "100vw",
        minHeight: "95vh",
        backgroundImage: "url(/static/images/pages/spacewars-bg.svg)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        display: !showGame ? 'flex' : 'none'
      }}>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Space Wars</h2>
            <ul>
            <li><strong>Show your hand:</strong> Ensure one hand is visible to the webcam.</li>
            <li><strong>Move the crosshair:</strong> Use your index finger to control the red crosshair.</li>
            <li><strong>Shoot UFOs:</strong> Make a thumbs-up gesture to shoot when the crosshair is over a UFO.</li>
            <li><strong>Score points:</strong> Hit a regular UFO for 1 point, or a special UFO for 5 points.</li>
            <li><strong>Avoid missing:</strong> If a UFO reaches the bottom without being shot, it counts as a miss. Three misses end the game!</li>
            <li><strong>Keyboard controls:</strong> Press 'R' to restart and 'Q' to quit.</li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ maxWidth: "40%" }}>
            <img src="/static/images/ufo.png" alt="Space Wars" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div style={{ maxWidth: "20%", display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5vh' }}>
            <button className="inter start-button" onClick={() => setShowGame(true)} style={{
              backgroundColor: `${localStorage.getItem('colorFilter') == "colorblind" ?'#01fefcff': '#4CAF50'}`,
              border: 'none',
              padding: '1em 1.5em',
              borderRadius: '1em',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.5em', fontWeight: 600, color: "#fff" }}>Start Game</span>
              <img src="/static/images/pages/play-1.svg" alt="Start Game" style={{ width: '2vw', height: 'auto' }} />
            </button>
          </div>
        </div>
      </div>
      <div style={{
        width: "100%",
        minHeight: "95vh",
        display: showGame ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="controls" style={{ maxWidth: "70vw", display: 'flex', flexDirection: "row", alignItems: "center", justifyContent: 'space-between', marginBottom: '20px' }}>
            <button id="restart-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="/static/images/pages/replay.svg" alt="Restart" style={{ width: '35px', height: '35px' }} />
            </button>
            <button id="start-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="/static/images/pages/play.svg" alt="Play" style={{ width: '40px', height: '40px' }} />
            </button>
            <button id="test-camera-btn" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src="/static/images/pages/testing.svg" alt="Test Camera" style={{ width: '35px', height: '35px' }} />
            </button>
          </div>
        </div>
        <div ref={debugRef} className="debug-box" style={{ backgroundColor: "transparent" }}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} width="1280" height="720"></canvas>
          <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
          <div ref={gameOverRef} className="game-over">
            <h2>Game Over!</h2>
            <p>Your Score: <span ref={finalScoreRef}>0</span></p>
            <button id="play-again-btn">Play Again</button>
          </div>
          <div
            className="instructions-box inter"
            style={{
              position: 'absolute',
              left: '1300px',
              top: '130px',
              width: '220px',
              height: '535px', 
              background: 'linear-gradient(to bottom, #2a2a2a, #1a1a1a)',
              border: '3px solid #1E90FF',
              boxShadow: '0 0 15px #1E90FF',
              padding: '5px',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                backgroundColor: '#1E90FF',
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
              }}
            >
              <span style={{ color: '#FFFFFF', font: 'bold 18px Arial', textAlign: 'center' }}>
                HOW TO PLAY
              </span>
            </div>
            <div style={{ paddingLeft: '5px' }}>
              {[
                { icon: '👆', text: 'Show hand', subtext: 'Ensure hand is visible to webcam' },
                { icon: '🎯', text: 'Move crosshair', subtext: 'Use index finger to aim' },
                { icon: '👍', text: 'Shoot UFOs', subtext: 'Thumbs-up to fire at UFOs' },
                { icon: '🛸', text: 'Regular UFO', subtext: 'Hit for 1 point' },
                { icon: '🌟', text: 'Golden UFO', subtext: 'Hit for 5 points' },
                { icon: '❄️', text: 'Frozen UFO', subtext: 'Hit for 3 points, freezes all UFOs for 4s' },
                { icon: '👾', text: 'Boss UFO', subtext: 'Appears every 10 points, hit 4 times' },
                { icon: '⏱️', text: 'Track time', subtext: 'Timer shows how long you survive' },
                { icon: '❌', text: 'Avoid misses', subtext: '3 UFOs reaching bottom ends game' },
                { icon: '⌨️', text: 'Press R to restart', subtext: 'Press Q to quit' }
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: item.subtext ? '15px' : '5px' }}>
                  <span style={{ font: '19px Arial', color: '#FFD700', marginRight: '5px', minWidth: '25px' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: 'bold 12px Arial', color: '#FFFFFF' }}>{item.text}</div>
                    {item.subtext && (
                      <div style={{ font: '11px Arial', color: '#CCCCCC', marginTop: '2px' }}>{item.subtext}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: '15px', left: '10px', right: '10px', height: '2px', backgroundColor: '#1E90FF' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceWars;