import React, { useRef, useState } from 'react';
import './Game.css';

const AirHockey = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [gameMode, setGameMode] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [modeSelected, setModeSelected] = useState(false);
  const [showModeOverlay, setShowModeOverlay] = useState(true);
  const [showDifficultyOverlay, setShowDifficultyOverlay] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

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
  );
};

export default AirHockey;