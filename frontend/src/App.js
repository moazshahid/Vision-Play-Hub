import React, { useState } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import WhackAMole from './WhackAMole';
import ImageStack from './ImageStack';

// Main App component for the CV Games website
const App = () => {
  // State to track the currently selected game, initially null (shows homepage)
  const [selectedGame, setSelectedGame] = useState(null);
  const [showHero, setShowHero] = useState(true);

  // Array of available games, each with an id, name, and component to render
  const games = [
    { id: 'snake', name: 'Snake Game', component: <SnakeGame /> },
    { name: 'Whack-a-Mole', component: <WhackAMole /> },
    // More games will be added here in the future, e.g., { id: 'pong', name: 'Pong Game', component: <PongGame /> }
  ];
  const selectedGameData = selectedGame && games.find((game) => game.id === selectedGame);
  const ballNumbers = Array.from({ length: 16 }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5);
  const ballRotations = Array.from({ length: 10 }, () => Math.floor(Math.random() * 360));

  return (
    <div className="App">
      <header>
      </header>
      {showHero && ( 
        <div id='hero' style={{position: "relative", minHeight: "50vw", maxHeight: "100vw", width:"100%", display: "flex", justifyContent: "center" }}>
          <ImageStack src="static/images/pages/blob-3.gif" count={2} style={{minWidth: "35vw", maxWidth: "55vw", position: "absolute", top: 0, left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[0]}deg)`, margin: 0 }}/>
          <img key={0} src={`static/images/pages/ball-${ballNumbers[0]}.webp`} alt={`ball-${ballNumbers[0]}`} style={{minWidth: "30vw", maxWidth: "50vw", position: "absolute", top: 0, left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[0]}deg)`, margin: 0 }}/>
          <img key={1} src={`static/images/pages/ball-${ballNumbers[1]}.webp`} alt={`ball-${ballNumbers[1]}`} style={{minWidth: "50vw", maxWidth: "70vw", position: "absolute", top: "50%", right: 0, transform: `translate(+30%, -60%) rotate(${ballRotations[1]}deg)`, margin: 0 }}/>
          <img key={2} src={`static/images/pages/ball-${ballNumbers[2]}.webp`} alt={`ball-${ballNumbers[2]}`} style={{minWidth: "10vw", maxWidth: "20vw", position: "absolute", top: "100%", left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[2]}deg)`, margin: 0 }}/>
          <div style={{display: "flex", justifyContent: "center", flexDirection: "column", gap: "clamp(2px, 5vw, 10px)"}}>
            <div style={{ position: "relative" }}>
              <p className="inter" style={{ "--inter-weight": 800, fontSize: "1.2em", color: "#A7A7A7", position: "absolute", top: 0, left: 0, margin: 0 }}>
                Welcome to the
              </p>
              <h1 className="inter gradient-text" style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>
                Vision Play Hub!
              </h1>
            </div>
            <p className="inter" style={{margin: 0}}>Select a game to play using computer vision.</p>
          </div>
        </div>
      )}
      <div style={{display: "flex", justifyContent: "center", gap: "10px", padding: "20px", position: "relative", zIndex: 100}}>
        <a href="http://localhost:8000/auth/login/" style={{textDecoration: "none"}}>
          <button className="inter back-button">
            Log In
          </button>
        </a>
        <a href="http://localhost:8000/auth/signup/" style={{ textDecoration: "none"}}>
          <button className="inter back-button">
            Sign Up
          </button>
        </a>
      </div>
      {!selectedGame ? (
        <div className="game-selection">
          <h2 className="inter">Selection</h2>
          <div style={{width: "95vw", backgroundColor: "#f9fafc", padding: "clamp(10px, 2vw, 15px)", borderRadius: "clamp(8px, 2vw, 14px)", zIndex: 1}}>
            <ul style={{ display: 'flex', flexDirection: 'row', margin: 0 }}>
              {games.map((game) => (
                <li key={game.id} style={{marginTop: 0, marginBottom: 0, marginLeft: "clamp(5px, 2vw, 10px)", marginRight: "clamp(5px, 2vw, 10px)"}}>
                  <div
                      style={{
                        width: "clamp(100px, 15vw, 400px)",
                        height: "clamp(120px, 17vw, 500px)",
                        backgroundColor: "#EDF1FA",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: 0
                      }}
                      onClick={() => {setSelectedGame(game);  setShowHero(false);}}
                    >
                    <p className='inter'>{game.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          {selectedGame.component}
          <button className="inter back-button" onClick={() => {setSelectedGame(null); setShowHero(true);}}>
            Back to Game Selection
          </button>
        </div>
      )}
      <footer>
        <p className="inter">
          CV Games © 2025
        </p>
      </footer>
    </div>
  );
};

export default App;