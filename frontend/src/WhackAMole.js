import React, { useEffect, useRef } from 'react';

const WhackAMole = () => {
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

    document.getElementById('test-camera-btn').addEventListener('click', startCamera);


    initHandDetection();

    return () => {};
  }, []);

  return (
    <div>
      <div className="controls">
        <button id="start-btn">Start Game</button>
        <button id="restart-btn">Restart Game</button>
        <button id="test-camera-btn">Test Camera</button>
      </div>
      <div ref={debugRef} className="debug-box"></div>
      <div className="game-container">
        <canvas ref={canvasRef} width="1280" height="720"></canvas>
        <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
        <div ref={gameStatsRef} className="game-stats">Score: 0</div>
        <div ref={gameOverRef} className="game-over">
          <h2>Game Over!</h2>
          <p>Your Score: <span ref={finalScoreRef}>0</span></p>
          <button id="play-again-btn">Play Again</button>
        </div>
      </div>
      <div className="instructions">
        <h2>How to Play</h2>
        <ul>
          <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
          <li><strong>Whack moles:</strong> Move the hammer (your index finger) over moles in the holes to hit them.</li>
          <li><strong>Score points:</strong> Each hit adds 1 point.</li>
          <li><strong>Lives:</strong> You have 3 lives (shown as hearts at the top); miss a mole, lose a life.</li>
          <li><strong>Keyboard controls:</strong> Press 'R' to restart, 'Q' to quit.</li>
        </ul>
      </div>
    </div>
  );
};