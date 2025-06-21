import './Game.css';
import React, { useEffect, useRef, useState } from 'react';

const WhackAMole = () => {
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
  const hammerImageRef = useRef(null);
  const heartImageRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current.getContext('2d');
    const video = videoRef.current;
    const gameStats = gameStatsRef.current;
    const gameOver = gameOverRef.current;
    const finalScore = finalScoreRef.current;
    const debug = debugRef.current;
    
    gameOver.style.display = 'none';

    const moleImage = new Image();
    moleImage.src = '/static/images/mole.png';
    moleImage.onload = () => console.log('Mole image loaded successfully');

    hammerImageRef.current = new Image();
    hammerImageRef.current.src = '/static/images/hammer.png';
    hammerImageRef.current.onload = () => console.log('Hammer image loaded successfully');

    heartImageRef.current = new Image();
    heartImageRef.current.src = '/static/images/heart.png';
    heartImageRef.current.onload = () => console.log('Heart image loaded successfully');

    const initHandDetection = () => {
      try {
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
        console.log('MediaPipe Hands initialized');
      } catch (error) {
        debug.innerHTML = `<p class="warning">Hand detection error: ${error.message}</p>`;
      }
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
        debug.innerHTML = `<p class="warning">Camera error: ${error.message}</p>`;
      }
    };

    const startGame = () => {
      if (!gameStartedRef.current) {
        startCamera()
          .then(() => {
            gameObjectRef.current = new GameLogic(canvas, gameStats, hammerImageRef.current, heartImageRef.current);
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
        requestAnimationFrame(gameLoop);
      }
    };

    const onHandResults = (results, ctx, video, gameObj, started, over, score) => {
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      ctx.save();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720);
      ctx.restore();
      if (started && gameObj && !gameObj.gameOver) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const indexFinger = results.multiHandLandmarks[0][8];
          const fingerX = Math.floor(1280 - indexFinger.x * 1280);
          const fingerY = Math.floor(indexFinger.y * 720);
          gameObj.updateFingerPosition(fingerX, fingerY);
        }
        gameObj.render(ctx);
      }
      if (gameObj && gameObj.gameOver) {
        drawGameOverOnCanvas(ctx, gameObj.score, over, score);
      }
      ctx.restore();
    };

    const drawGameOverOnCanvas = (ctx, score, over, finalScore) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 720);
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
      over.style.display = 'block';
    };

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas, gameStats, hammerImageRef.current, heartImageRef.current);
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.getElementById('test-camera-btn').addEventListener('click', startCamera);
    document.getElementById('play-again-btn').addEventListener('click', () => {
      gameObjectRef.current = new GameLogic(canvas, gameStats, hammerImageRef.current, heartImageRef.current);
      gameOver.style.display = 'none';
      gameStartedRef.current = true;
      lastRenderTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        gameObjectRef.current = new GameLogic(canvas, gameStats, hammerImageRef.current, heartImageRef.current);
        gameOver.style.display = 'none';
        gameStartedRef.current = true;
        lastRenderTimeRef.current = performance.now();
        requestAnimationFrame(gameLoop);
      }
      if (e.key === 'q' || e.key === 'Q') {
        if (cameraRef.current) cameraRef.current.stop();
        gameStartedRef.current = false;
      }
    });

    initHandDetection();
    class GameLogic {
      constructor(ctx, stats, hammerImage, heartImage) {
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
        this.moles = [];
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.ctx = ctx;
        this.stats = stats;
        this.moleSize = 60;
        this.holeSize = 80;
        this.visibleDuration = 2000;
        this.gameDuration = 60000;
        this.startTime = performance.now();
        this.cursorPosition = [640, 360];
        this.hammerImage = hammerImage;
        this.heartImage = heartImage;
      }

      spawnMole() {
        const currentTime = performance.now();
        const progress = Math.min((currentTime - this.startTime) / this.gameDuration, 1);

        const isAnyHoleOccupied = this.holes.some(hole => hole.occupied);
        if (isAnyHoleOccupied) return;

        const availableHoles = this.holes.filter(hole => !hole.occupied);
        if (availableHoles.length === 0) return;

        const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        this.moles.push({
          x: randomHole.x,
          y: randomHole.y,
          disappearTime: currentTime + this.visibleDuration * (1 - 0.6 * progress),
        });
        randomHole.occupied = true;
        randomHole.lastSpawnTime = currentTime;
      }

      updateFingerPosition(fingerX, fingerY) {
        if (this.gameOver) return;
        this.cursorPosition = [fingerX, fingerY];
        this.moles = this.moles.filter((mole) => {
          const dist = Math.hypot(fingerX - mole.x, fingerY - mole.y);
          if (dist < this.moleSize / 2) {
            this.score += 1;
            this.stats.textContent = `Score: ${this.score}`;
            try {
              const hitSound = new Audio('/static/sounds/hit.mp3');
              hitSound.volume = 0.5;
              hitSound.play().catch((e) => console.log('Error playing sound:', e));
            } catch (e) {
              console.log('Could not play sound:', e);
            }
            const hole = this.holes.find((h) => h.x === mole.x && h.y === mole.y);
            if (hole) hole.occupied = false;
            return false;
          }
          return true;
        });
      }

      updateWithoutRender(deltaTime) {
        if (this.gameOver) return;
        const currentTime = performance.now();
        const elapsedTime = currentTime - this.startTime;

        this.spawnMole();

        this.moles = this.moles.filter((mole) => {
          if (currentTime > mole.disappearTime) {
            this.lives -= 1;
            this.stats.textContent = `Score: ${this.score}`;
            const hole = this.holes.find((h) => h.x === mole.x && h.y === mole.y);
            if (hole) hole.occupied = false;
            if (this.lives <= 0) {
              this.gameOver = true;
            }
            return false;
          }
          return true;
        });

        if (elapsedTime > this.gameDuration) {
            this.gameOver = true;
        }
      }

      render(ctx) {
        // Draw holes
        this.holes.forEach((hole) => {
          ctx.beginPath();
          ctx.arc(hole.x, hole.y, this.holeSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#4A4A4A';
          ctx.fill();
        });

        // Draw moles
        const moleImage = new Image();
        moleImage.src = '/static/images/mole.png';
        this.moles.forEach((mole) => {
          if (moleImage.complete) {
            ctx.drawImage(moleImage, mole.x - this.moleSize / 2, mole.y - this.moleSize / 2, this.moleSize, this.moleSize);
          } else {
            ctx.beginPath();
            ctx.arc(mole.x, mole.y, this.moleSize / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#8B4513';
            ctx.fill();
          }
        });

        // Draw lives bar (rectangle with "Lives" text and hearts)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 20, 260, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Poppins';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Lives:', 20, 50); // Removed extra spaces after colon

        // Draw hearts with adjusted spacing
        for (let i = 0; i < 3; i++) {
          const x = 120 + i * 50; // Shifted to 120 to avoid colon overlap
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
            this.cursorPosition[0] - 30,
            this.cursorPosition[1] - 30,
            60,
            60
          );
        } else {
          ctx.fillStyle = '#808080';
          ctx.fillRect(this.cursorPosition[0] - 20, this.cursorPosition[1] - 30, 40, 20);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(this.cursorPosition[0] - 5, this.cursorPosition[1] - 10, 10, 40);
        }

        this.stats.textContent = `Score: ${this.score}`;
      }
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);


  return (
    <div className='inter'> 
      <div style={{Width: "100vw", minHeight: "95vh", backgroundImage: "url(static/images/pages/mole-bg.svg)", backgroundRepeat: "no-repeat", backgroundPosition: "center center", backgroundSize: "contain", flexDirection: 'row', alignItems: 'center', justifyContent: 'center', display: !showGame ? 'flex' : 'none'}}>
        <div style={{maxWidth: "50vw", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <div className="instructions inter" style={{ color: "#fff" }}>
            <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0}}>Whack A Mole</h2>
            <ul>
              <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
              <li><strong>Whack moles:</strong> Move the hammer (your index finger) over moles in the holes to hit them.</li>
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
        <div ref={debugRef} className="debug-box" style={{backgroundColor:"transparent"}}></div>
        <div className="game-container inter">
          <canvas ref={canvasRef} width="1280" height="720"></canvas>
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