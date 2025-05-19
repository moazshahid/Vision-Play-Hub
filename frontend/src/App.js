import React, { useEffect, useRef } from 'react';
import './App.css';

// Added: Main App component with UI structure
const App = () => {
  // Added: Refs for DOM elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gameStatsRef = useRef(null);
  const gameOverRef = useRef(null);
  const finalScoreRef = useRef(null);
  const debugRef = useRef(null);

  // Added: Placeholder useEffect for future logic
  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);

  // Added: JSX for UI with header, controls, canvas, video, and instructions
  return (
    <div>
      <header>
        <h1>CV Games - Hand Tracker Snake</h1>
        <p>Use your index finger to control the snake and collect apples!</p>
      </header>
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
          <li><strong>Show your hand:</strong> Make sure your hand is clearly visible to the webcam.</li>
          <li><strong>Move the snake:</strong> Use your index finger to control the snake.</li>
          <li><strong>Collect apples:</strong> Guide the snake to eat apples and grow longer.</li>
          <li><strong>Don't hit yourself:</strong> Avoid collisions with your own snake body!</li>
          <li><strong>Keyboard controls:</strong> Press 'R' to restart and 'Q' to quit.</li>
        </ul>
      </div>
      <footer>
        <p>CV Games - Hand Tracker Snake © 2025</p>
      </footer>
    </div>
  );
};

export default App;