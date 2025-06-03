import React, { useRef, useState } from 'react';
import './Game.css';

const AirHockey = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [gameMode, setGameMode] = useState(null);
  const [showModeOverlay, setShowModeOverlay] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const selectGameMode = (selectedMode) => {
    setGameMode(selectedMode);
    setShowModeOverlay(false);
    setConfirmationMessage(`Mode selected: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Player`);
    setTimeout(() => {
      setConfirmationMessage('');
    }, 2000);
    console.log(`Mode selected: ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Player`);
  };

  const handleModeSelect = (selectedMode) => {
    selectGameMode(selectedMode);
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
          <div className="game-container inter">
            <canvas ref={canvasRef} style={{ width: '960px', height: '540px' }}></canvas>
            <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
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
  );
};

export default AirHockey;