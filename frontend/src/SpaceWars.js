import React, { useState, useEffect, useRef } from 'react';
import './Game.css';

const SpaceWars = () => {
  const [showGame, setShowGame] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const debugRef = useRef(null);

  useEffect(() => {
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
      handsRef.current.onResults((results) => {
        console.log('Hand detection results:', results);
      });
    };

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
        debugRef.current.innerHTML = `<p class="warning">❌ Camera error: ${error.message}</p>`;
      }
    };

    initHandDetection();
    startCamera();

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
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