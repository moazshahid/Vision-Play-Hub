import React, { useState } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';

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

  return (
    <div>
      {/* Header for the CV Games website */}
      <header>
        <h1>VisionPlay Hub</h1>
        <p>Welcome to CV Games! Select a game to play using computer vision.</p>
      </header>
      {/* Show the game selection menu if no game is selected */}
      {!selectedGame && (
        <div className="game-selection">
          <h2>Games</h2>
          <ul>
            {games.map((game) => (
              <li key={game.id}>
                <div onClick={() => handleGameSelect(game.id)}>
                  {game.name}
                </div>
              </li>
            ))}
          </ul>
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