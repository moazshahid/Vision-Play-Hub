import React, { useState, useEffect, useRef } from 'react';
import './Game.css';
import { submitScore } from './utils/api';

const SpaceWars = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const debugRef = useRef(null);
  const gameObjectRef = useRef(null);
  const gameStartedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;

    gameOver.style.display = 'none';

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
            gameObjectRef.current = new GameLogic(canvas);
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
        gameObjectRef.current.render(canvas);
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    };

    const testCamera = async () => {
      try {
        await startCamera();
        gameStartedRef.current = false;
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
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
    document.getElementById('test-camera-btn').addEventListener('click', testCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas);
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      gameOver.style.display = 'none';
      requestAnimationFrame(gameLoop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        gameObjectRef.current = new GameLogic(canvas);
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        gameOver.style.display = 'none';
        requestAnimationFrame(gameLoop);
      }
      if (e.key === 'q' || e.key === 'Q') {
        gameStartedRef.current = false;
        gameObjectRef.current = null;
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
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 1280, 720);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Quit', 640, 320);
        ctx.font = '24px Arial';
        ctx.fillText('Refresh the page to play again', 640, 380);
        console.log('Game quit via Q key');
      }
    });

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 1280, 720);
      ctx.restore();

      if (started && gameObj && !gameObj.gameOver) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          const isThumbsUp = isThumbsUpGesture(results.multiHandLandmarks[0]);
          gameObj.updateFingerPosition(fingerX, fingerY, isThumbsUp);
          debug.innerHTML = '';
        } else {
          debug.innerHTML = '<p class="warning">❌ No hands detected - Please ensure one hand is visible to the webcam</p>';
        }
        gameObj.render(ctx);
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
    };

    const isThumbsUpGesture = (landmarks) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
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

    initHandDetection();

    class GameLogic {
      constructor(ctx) {
        this.ctx = ctx;
        this.ufos = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2000;
        this.crosshairPosition = [640, 360];
        this.isShooting = false;
        this.lastShotTime = 0;
        this.score = 0;
        this.misses = 0;
        this.gameOver = false;
        this.scoreSubmitted = false;
      }

      spawnUfo() {
        const x = Math.floor(Math.random() * (1280 - 100));
        this.ufos.push({
          x: x,
          y: 0,
          width: 100,
          height: 100,
          speedY: 100,
        });
      }

      updateFingerPosition(fingerX, fingerY, isThumbsUp) {
        if (!this.gameOver) {
          this.crosshairPosition = [fingerX, fingerY];
          const currentTime = Date.now();
          if (isThumbsUp && !this.isShooting && (currentTime - this.lastShotTime > 200)) {
            this.isShooting = true;
            this.lastShotTime = currentTime;
            this.checkHit();
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

      checkHit() {
        const newUfos = [];
        this.ufos.forEach((ufo) => {
          const dx = this.crosshairPosition[0] - (ufo.x + ufo.width / 2);
          const dy = this.crosshairPosition[1] - (ufo.y + ufo.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 50) {
            this.score += 1;
          } else {
            newUfos.push(ufo);
          }
        });
        this.ufos = newUfos;
      }

      updateWithoutRender(deltaTime) {
        if (this.gameOver) return;

        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnUfo();
          this.spawnTimer = 0;
        }

        const newUfos = [];
        this.ufos.forEach((ufo) => {
          ufo.y += (ufo.speedY * deltaTime) / 1000;
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
      }

      render(ctx) {
        ctx.save();
        ctx.clearRect(0, 0, 1280, 720);
        ctx.translate(1280, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
        ctx.restore();

        this.ufos.forEach((ufo) => {
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(ufo.x, ufo.y, ufo.width, ufo.height);
        });

        ctx.beginPath();
        ctx.arc(this.crosshairPosition[0], this.crosshairPosition[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = this.isShooting ? '#FF4500' : '#FF0000';
        ctx.fill();
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
        backgroundImage: "url(/static/images/space.jpg)",
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
              backgroundColor: '#4CAF50',
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
          <div ref={gameOverRef} className="game-over" style={{ display: 'none' }}>
            <h2>Game Over!</h2>
            <p>Your Score: <span ref={finalScoreRef}>0</span></p>
            <button id="play-again-btn">Play Again</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceWars;