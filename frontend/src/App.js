import React, { useState } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import WhackAMole from './WhackAMole';
import DessertSlash from './DessertSlash';
import AirHockey from './AirHockey';

// Main App component for the CV Games website
const App = () => {
  // State to track the currently selected game, initially null (shows homepage)
  const [selectedGame, setSelectedGame] = useState(null);
  const [showHero, setShowHero] = useState(true);

  // Array of available games, each with an id, name, and component type
  const games = [
    { id: 'snake', name: 'Snake Game', component: <SnakeGame />, icon: 'static/images/pages/snake-colour.svg' },
    { id: 'mole', name: 'Whack-a-Mole', component: <WhackAMole />, icon: 'static/images/pages/mole-colour.svg' },
    { id: 'dessert', name: 'Dessert Slash', component: <DessertSlash />, icon: 'static/images/pages/dessert-colour.svg' },
    { id: 'airhockey', name: 'Air Hockey', component: <AirHockey />, icon: 'static/images/pages/airhockey-colour.svg' },
    // More games will be added here in the future, e.g., { id: 'pong', name: 'Pong Game', component: <PongGame /> }
  ];

  //the comment below is to remove an unnecessary warning
  // eslint-disable-next-line no-unused-vars
  const selectedGameData = selectedGame && games.find((game) => game.id === selectedGame);

  return (
    <div className="App">
      <header></header>

      {/* Navigation bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.8vw',
        padding: '2vh 2vw',
        backgroundColor: '#333',
      }}>
        <a href="http://localhost:8000/auth/login/" style={{ textDecoration: 'none' }}>
          <button className="hanken-grotesk-bold back-button">Log In</button>
        </a>
        <a href="http://localhost:8000/auth/signup/" style={{ textDecoration: 'none' }}>
          <button className="hanken-grotesk-bold back-button">Sign Up</button>
        </a>
      </nav>
      
      {showHero && ( 
        <div id='hero' style={{position: "relative", minHeight: "50vh", maxHeight: "90vh", width:"100%", display: "flex", justifyContent: 'center'}}>
          <div style={{display: "flex", justifyContent: "center", flexDirection: "column", gap: "clamp(2px, 5vw, 10px)"}}>
            <div style={{ position: "relative" }}>
              <h1 className="hanken-grotesk-bold" style={{ fontSize: "6em", textAlign: "center" }}>
                Vision Play Hub
              </h1>
            </div>
            <p className="bricolage-grotesque-regular" style={{margin: 0, textAlign: "center"}}>
              A home for your entertainment. Enjoy our selection of mini games for you to play!
            </p>
          </div>
        </div>
      )}
      {!selectedGame ? (
        <div className="game-selection" style={{zIndex: 4}}>
          <h2 className="hanken-grotesk-bold">Selection</h2>
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
                        cursor: "pohanken-grotesk-bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: 0,
                        flexDirection: "column",
                      }}
                      onClick={() => {setSelectedGame(game);  setShowHero(false);}}
                    >
                    <img
                      src={game.icon}
                      alt={game.name}
                      style={{
                        width: "auto",
                        height: "50%",
                        marginBottom: "clamp(5px, 2vw, 10px)",
                        margin: "15%",
                      }}/>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff2f7', width: '100%', height: '20%' , borderRadius: '0 0 8px 8px', padding: '0px' }}>
                      <p className='hanken-grotesk-bold' style={{"--hanken-grotesk-bold-weight": 900, fontSize: "2em"}}>{game.name}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          {selectedGame.component}
          <button className="hanken-grotesk-bold back-button" onClick={() => {setSelectedGame(null); setShowHero(true);}}>
            Back to Game Selection
          </button>
        </div>
      )}
      <footer>
        <p className="dm-sans-bold" style={{ textAlign: "center"}}>
          The Woks © 2025
        </p>
      </footer>
    </div>
  );
};

export default App;