import React, { useState } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import ImageStack from './ImageStack';

// Main App component for the CV Games website
const App = () => {
  // State to track the currently selected game, initially null (shows homepage)
  const [selectedGame, setSelectedGame] = useState(null);

  // Array of available games, each with an id, name, and component type
  const games = [
    { id: 'snake', name: 'Snake Game', component: SnakeGame },
    // More games will be added here, e.g., { id: 'pong', name: 'Pong Game', component: PongGame }
  ];

  // Handle game selection, toggling the selected game (clicking again returns to menu)
  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId === selectedGame ? null : gameId);
  };

  // Find the selected game
  const selectedGameData = selectedGame && games.find((game) => game.id === selectedGame);
  const ballNumbers = Array.from({ length: 16 }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5);
  const ballRotations = Array.from({ length: 10 }, () => Math.floor(Math.random() * 360));
  return (
    <div>
      {/* Header for the CV Games website */}
      <header>
      </header>
      <div style={{position: "relative", minHeight: "50vw", maxHeight: "100vw", width:"100%", display: "flex", justifyContent: "center" }}>
        <ImageStack src="/images/blob-3.gif" count={2} style={{minWidth: "35vw", maxWidth: "55vw", position: "absolute", top: 0, left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[0]}deg)`, margin: 0 }}/>
        <img key={0} src={`/images/ball-${ballNumbers[0]}.webp`} alt={`ball-${ballNumbers[0]}`} style={{minWidth: "30vw", maxWidth: "50vw", position: "absolute", top: 0, left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[0]}deg)`, margin: 0 }}/>
        <img key={1} src={`/images/ball-${ballNumbers[1]}.webp`} alt={`ball-${ballNumbers[1]}`} style={{minWidth: "50vw", maxWidth: "70vw", position: "absolute", top: "50%", right: 0, transform: `translate(+30%, -60%) rotate(${ballRotations[1]}deg)`, margin: 0 }}/>
        <img key={2} src={`/images/ball-${ballNumbers[2]}.webp`} alt={`ball-${ballNumbers[2]}`} style={{minWidth: "10vw", maxWidth: "20vw", position: "absolute", top: "100%", left: 0, transform: `translate(-50%, -50%) rotate(${ballRotations[2]}deg)`, margin: 0 }}/>
        <div style={{display: "flex", justifyContent: "center", flexDirection: "column", gap: "clamp(2px, 5vw, 10px)"}}>
          <div style={{ position: "relative" }}>
            <p className="inter" style={{ "--inter-weight": 800, fontSize: "1.2em", color: "#A7A7A7", position: "absolute", top: 0, left: 0, margin: 0 }}>
              Welcome to the
            </p>
            <h1 className="inter gradient-text" style={{ "--inter-weight": 900, fontSize: "6em", margin: 0 }}>
              Vision Play Hub
            </h1>
          </div>
          <p className="inter" style={{margin: 0}}>Select a game to play using computer vision.</p>
        </div>
      </div>
      {/* Show the game selection menu if no game is selected */}
      {!selectedGame && (
        <div className="game-selection">
          <h2>Games</h2>
          <div style={{width: "95vw", backgroundColor: "#f9fafc", padding: "clamp(10px, 2vw, 15px)", borderRadius: "clamp(8px, 2vw, 14px)"}}>
            <ul style={{margin: 0}}>
              {games.map((game) => (
                <li key={game.id} style={{marginTop: 0, marginBottom: 0}}>
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
                      onClick={() => handleGameSelect(game.id)}
                    >
                    <p className='inter'>{game.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Render the selected game's component */}
      {selectedGameData && <selectedGameData.component />}
      {/* Footer for the website */}
      <footer>
        <p>CV Games © 2025</p>
      </footer>
    </div>
  );
};

export default App;