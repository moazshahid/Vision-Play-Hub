import React, { useEffect, useRef } from 'react';
import './Game.css';

// DessertSlash is a React component that implements a hand-tracking game where players slice desserts using their index finger.
const DessertSlash = () => {
  // Refs to manage DOM elements and game state
  const videoRef = useRef(null); // Reference to the video element for webcam feed
  const canvasRef = useRef(null); // Reference to the canvas element for rendering the game
  const gameStatsRef = useRef(null); // Reference to the div displaying score and time
  const gameOverRef = useRef(null); // Reference to the div displaying the game over screen
  const finalScoreRef = useRef(null); // Reference to the span displaying the final score on game over
  const debugRef = useRef(null); // Reference to the div for displaying debug messages (e.g., camera errors)
  const handsRef = useRef(null); // Reference to the MediaPipe Hands instance for hand tracking
  const cameraRef = useRef(null); // Reference to the MediaPipe Camera instance for webcam access
  const gameObjectRef = useRef(null); // Reference to the GameLogic instance managing game state
  const gameStartedRef = useRef(false); // Tracks whether the game has started
  const lastRenderTimeRef = useRef(0); // Stores the timestamp of the last render for calculating delta time
  const DessertImagesRef = useRef({}); // Stores loaded dessert images (ice cream, donut, cupcake)
  const bombImageRef = useRef(null); // Stores the loaded bomb image
  const powerUpImagesRef = useRef({}); // Stores loaded power-up images (freeze, double)
  const swordImageRef = useRef(null); // Stores the loaded sword image for the cursor
  const sliceSoundRef = useRef(null); // Stores the loaded sound for slicing desserts
  const bombSoundRef = useRef(null); // Stores the loaded sound for bomb explosions
  const burstSoundRef = useRef(null); // Stores the loaded sound for the Slash Burst power-up
  const bgMusicRef = useRef(null); // Stores the loaded background music
  const animationFrameIdRef = useRef(null); // Stores the ID of the current animation frame for cancellation
  const assetsLoadedRef = useRef(false); // Tracks whether all assets (images, sounds) have loaded

  // useEffect hook to set up the game, initialize hand detection, load assets, and handle cleanup
  useEffect(() => {
    // Get references to the canvas context and DOM elements
    const canvas = canvasRef.current?.getContext('2d'); // 2D rendering context for the canvas
    const video = videoRef.current; // Video element for webcam feed
    const gameStats = gameStatsRef.current; // Div for displaying score and time
    const gameOver = gameOverRef.current; // Div for displaying game over screen
    const finalScore = finalScoreRef.current; // Span for displaying final score
    const debug = debugRef.current; // Div for debug messages

    // Check if the canvas context is available; if not, log an error and exit
    if (!canvas) {
      console.error('Canvas context not initialized');
      return;
    }

    // Initialize visibility of UI elements
    gameOver.style.display = 'none'; // Hide the game over screen initially
    gameStats.style.display = 'block'; // Show the score and time display initially
  }, []);

  // Render the game UI
  return (
    <div>
      <div className="slider-container">
        <div className="slider">
          {/* Instructions slide */}
          <div className="slide" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <div style={{ maxWidth: "60%", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', overflowY: 'auto' }}>
              <div className="instructions inter">
                <h2 style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>Dessert Slash</h2>
                <ul>
                  <li><strong>Show your hand:</strong> Ensure your hand is visible to the webcam.</li>
                  <li><strong>Slice desserts:</strong> Move your index finger to control the sword and slice desserts (icecreams, donuts, cupcakes) for points. A white trail appears when you move.</li>
                  <li><strong>Avoid bombs:</strong> Don’t slice bombs, or you’ll lose a life (3 lives total, shown as bombs in the top-right).</li>
                  <li><strong>Combos:</strong> Slice multiple desserts quickly to earn 2x or 3x score multipliers.</li>
                  <li><strong>Power-Ups:</strong> Slice special desserts for Freeze (slows desserts dramatically) or Double Score (doubles points).</li>
                  <li><strong>Slash Burst:</strong> Swipe upward or press 'S' to slice all desserts on screen (10-second cooldown), with an orange-red trail.</li>
                  <li><strong>Time Limit:</strong> Survive 60 seconds; desserts and bombs spawn faster over time.</li>
                  <li><strong>Keyboard controls:</strong> Press 'R' to restart, 'Q' to quit, 'S' for Slash Burst.</li>
                </ul>
              </div>
            </div>
            <div style={{ maxWidth: "40%" }}>
              <img src="static/images/pages/dessert-lineart.svg" alt="Dessert Slash" style={{ width: '100%', height: 'auto' }} />
            </div>
          </div>
          {/* Game slide */}
          <div className="slide" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
            <div ref={debugRef} className="debug-box" style={{ backgroundColor: "#fff" }}></div>
            <div className="game-container inter">
              <canvas ref={canvasRef} width="1280" height="720" tabIndex="0" style={{ zIndex: 10 }}></canvas>
              <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
              <div ref={gameStatsRef} className="game-stats">Score: 0 | Time: 60</div>
              <div ref={gameOverRef} className="game-over">
                <h2>Game Over!</h2>
                <p>Your Score: <span ref={finalScoreRef}>0</span></p>
                <button id="play-again-btn">Play Again</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DessertSlash;
