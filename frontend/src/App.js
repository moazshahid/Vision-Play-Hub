import React, { useState } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import WhackAMole from './WhackAMole';

// Main App component for the CV Games website
const App = () => {
  // State to track the currently selected game, initially null (shows homepage)
  const [selectedGame, setSelectedGame] = useState(null);

  // Array of available games, each with an id, name, and component to render
  const games = [
    { id: 'snake', name: 'Snake Game', component: <SnakeGame /> },
    { name: 'Whack-a-Mole', component: <WhackAMole /> },
    // More games will be added here in the future, e.g., { id: 'pong', name: 'Pong Game', component: <PongGame /> }
  ];

  return (
    <div className="App">
      <header>
        <h1>CV Games</h1>
        <p>Welcome to CV Games! Select a game to play using computer vision.</p>
      </header>
      {!selectedGame ? (
        <div className="game-selection">
          <h2>Game Selection</h2>
          <ul>
            {games.map((game, index) => (
              <li key={index}>
                <button onClick={() => setSelectedGame(game)}>
                  {game.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          {selectedGame.component}
          <button onClick={() => setSelectedGame(null)}>Back to Game Selection</button>
        </div>
      )}
      <footer>
        <p>CV Games © 2025</p>
      </footer>
    </div>
  );
};

export default App;