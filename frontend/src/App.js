import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import WhackAMole from './WhackAMole';
import DessertSlash from './DessertSlash';
import AirHockey from './AirHockey';

// --- NEW: GameCarousel Component ---
const GameCarousel = ({ games, onSelectGame }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  // Auto advance every 4 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 8000);

    return () => clearInterval(intervalRef.current);
  }, [games.length]);

  // Navigate to previous slide
  const prevSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev === 0 ? games.length - 1 : prev - 1));
  };

  // Navigate to next slide
  const nextSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % games.length);
  };

  // Handle click on the banner
  const handleClick = () => {
    onSelectGame(games[currentIndex]);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "90vw",
        maxWidth: "600px",
        height: "400px",
        margin: "2rem auto",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={handleClick}
    >
      {/* Slide container with horizontal translate */}
      <div
        style={{
          display: "flex",
          height: "100%",
          width: `${games.length * 100}%`,
          transform: `translateX(-${currentIndex * (100 / games.length)}%)`,
          transition: "transform 0.5s ease-in-out",
        }}
      >
        {games.map((game) => (
          <div
            key={game.id}
            style={{
              flex: `0 0 ${100 / games.length}%`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              userSelect: "none",
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent parent click if needed
              onSelectGame(game);
            }}
          >
            <img
              src={game.icon}
              alt={game.name}
              style={{
                maxHeight: "250px",
                objectFit: "contain",
                marginBottom: "1rem",
                pointerEvents: "none",
              }}
              draggable={false}
            />
            <h3
              className="hanken-grotesk-bold"
              style={{ fontSize: "1.8rem", margin: 0, color: "#333", color: "white"}}
            >
              {game.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Left arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          prevSlide();
        }}
        aria-label="Previous Slide"
        style={{
          position: "absolute",
          top: "50%",
          left: "0",
          transform: "translateY(-50%)",
          backgroundColor: "rgba(255,255,255,0.1)",
          border: "none",
          width: "40px",
          height: "100%",
          cursor: "pointer",
          fontSize: "2rem",
          color: "#333",
          userSelect: "none",
        }}
      >
      </button>

      {/* Right arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          nextSlide();
        }}
        aria-label="Next Slide"
        style={{
          position: "absolute",
          top: "50%",
          right: "0",
          transform: "translateY(-50%)",
          backgroundColor: "rgba(255,255,255,0.1)",
          border: "none",
          width: "40px",
          height: "100%",
          cursor: "pointer",
          fontSize: "2rem",
          color: "#333",
          userSelect: "none",
        }}
      >
      </button>

      
      {/* Dot indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "15px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        {games.map((_, index) => (
          <span
            key={index}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: index === currentIndex ? "#fff" : "rgba(255, 255, 255, 0.5)",
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
};

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
    // More games will be added here in the future
  ];

  // eslint-disable-next-line no-unused-vars
  const selectedGameData = selectedGame && games.find((game) => game.id === selectedGame);

  return (
    <div className="App">
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -2,
        }}
      >
        <source src="http://localhost:8000/static/videos/BGV.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Optional overlay for better text visibility */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: -1,
        }}
      ></div>

      <header></header>

      {/* Navigation bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2vh 2vw',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
          <img
            src="/static/images/pages/logo-colour.svg"
            alt="Vision Play Hub Logo"
            style={{ height: '6vh', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.8vw' }}>
          <a href="http://localhost:8000/auth/login/" style={{ textDecoration: 'none' }}>
            <button className="hanken-grotesk-bold back-button">Log In</button>
          </a>
          <a href="http://localhost:8000/auth/signup/" style={{ textDecoration: 'none' }}>
            <button className="hanken-grotesk-bold back-button">Sign Up</button>
          </a>
        </div>
      </nav>

      {showHero && (
        <div id='hero' style={{ position: "relative", minHeight: "50vh", maxHeight: "90vh", width: "100%", display: "flex", justifyContent: 'center' }}>
          <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", gap: "clamp(2px, 5vw, 10px)" }}>
            <div style={{ position: "relative" }}>
              <h1 className="hanken-grotesk-bold" style={{ fontSize: "6em", textAlign: "center", color: "#ffffff" }}>
                Vision Play Hub
              </h1>
            </div>
            <p className="bricolage-grotesque-regular" style={{ margin: 0, textAlign: "center", color: "#ffffff" }}>
              A home for your entertainment. Enjoy our selection of mini games for you to play!
            </p>
          </div>
        </div>
      )}

      {/* --- CHANGED: Replace game selection list with the carousel --- */}
      {!selectedGame ? (
        <div style={{ zIndex: 4 }}>
          <GameCarousel
            games={games}
            onSelectGame={(game) => {
              setSelectedGame(game);
              setShowHero(false);
            }}
          />
        </div>
      ) : (
        <div>
          {selectedGame.component}
          <button className="hanken-grotesk-bold back-button" onClick={() => { setSelectedGame(null); setShowHero(true); }}>
            Back to Game Selection
          </button>
        </div>
      )}
      {/* --- END CHANGED --- */}

      <footer>
        <p className="dm-sans-bold" style={{ textAlign: "center", color: "#ffffff" }}>
          The Woks © 2025
        </p>
      </footer>
    </div>
  );
};

export default App;
