import React, { useRef } from 'react';
import './Game.css';

const AirHockey = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirHockey;