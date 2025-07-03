import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import SnakeGame from './SnakeGame';
import WhackAMole from './WhackAMole';
import DessertSlash from './DessertSlash';
import AirHockey from './AirHockey';
import SurfDash from './SurfDash';
import { login } from './utils/api';
import TetrisGame from './TetrisGame';

// --- NEW: GameCarousel Component ---
const GameCarousel = ({ games, onSelectGame }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  const resetInterval = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 6000);
  };

  useEffect(() => {
    resetInterval(); // Start interval on mount

    return () => clearInterval(intervalRef.current);
  }, [games.length]);

  // Navigate to previous slide
  const prevSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev === 0 ? games.length - 1 : prev - 1));
    resetInterval();
  };

  // Navigate to next slide
  const nextSlide = () => {
    clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % games.length);
    resetInterval();
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
                borderRadius: "1em",
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
          backgroundColor: "rgba(255,255,255,0.4)",
          border: "none",
          width: "12px",
          height: "48px",
          cursor: "pointer",
          fontSize: "2rem",
          color: "#333",
          userSelect: "none",
          borderRadius: "12px"
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
          backgroundColor: "rgba(255,255,255,0.4)",
          border: "none",
          width: "12px",
          height: "48px",
          cursor: "pointer",
          fontSize: "2rem",
          color: "#333",
          userSelect: "none",
          borderRadius: "12px"
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


const App = () => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [showHero, setShowHero] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [username, setUsername] = useState('');
  const [timeLeft, setTimeLeft] = useState(window.SESSION_TIME_LEFT || 0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Pull username from global variable injected by Django
    if (window.REACT_USERNAME) {
      setUsername(window.REACT_USERNAME);
    }
  }, []);

  useEffect(() => {
    if (username === "Guest" || !username) {
      // Don't start countdown if username is "Guest" or empty
      return;
    }

    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [username]);

  useEffect(() => {
    let lastPing = 0;
    const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const pingServerIfDue = () => {
      const now = Date.now();
      if (now - lastPing >= PING_INTERVAL) {
        lastPing = now;
        fetch('/ping/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    };

    // Attach event listeners
    document.addEventListener('click', pingServerIfDue);
    document.addEventListener('keydown', pingServerIfDue);
    document.addEventListener('mousemove', pingServerIfDue);

    // Cleanup listeners on unmount
    return () => {
      document.removeEventListener('click', pingServerIfDue);
      document.removeEventListener('keydown', pingServerIfDue);
      document.removeEventListener('mousemove', pingServerIfDue);
    };
  }, []);

  function genHexColorPair() {
    let r, g, b, avg;

    do {
      r = Math.floor(Math.random() * 256);
      g = Math.floor(Math.random() * 256);
      b = Math.floor(Math.random() * 256);
      avg = (r + g + b) / 3;
    } while (avg < 125); // ensure it's light

    // Create light color hex
    const lightHex =
      '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');

    // Calculate darker version by reducing brightness by 30%
    const darkR = Math.max(0, Math.floor(r * 0.7));
    const darkG = Math.max(0, Math.floor(g * 0.7));
    const darkB = Math.max(0, Math.floor(b * 0.7));

    const darkHex =
      '#' +
      darkR.toString(16).padStart(2, '0') +
      darkG.toString(16).padStart(2, '0') +
      darkB.toString(16).padStart(2, '0');

    return { light: lightHex, dark: darkHex };
  }

  const { light, dark } = { light: "#ededed", dark: "#232323" };

  const games = [
    { id: 'snake', name: 'Snake Game', component: <SnakeGame />, icon: 'static/images/pages/snake-colour.jpg' },
    { id: 'mole', name: 'Whack-a-Mole', component: <WhackAMole />, icon: 'static/images/pages/mole-colour.jpg' },
    { id: 'dessert', name: 'Dessert Slash', component: <DessertSlash />, icon: 'static/images/pages/dessert-colour.jpg' },
    { id: 'airhockey', name: 'Air Hockey', component: <AirHockey />, icon: 'static/images/pages/airhockey-colour.jpg' },
    { id: 'tetris', name: 'Tetris Game', component: <TetrisGame />, icon: 'static/images/pages/tetris-colour.jpg' },
    { id: 'surfdash', name: 'Surf Dash', component: <SurfDash />, icon: 'static/images/pages/surfdash-colour.png' },
    // More games will be added here in the future
  ];

  // eslint-disable-next-line no-unused-vars
  const selectedGameData = selectedGame && games.find((game) => game.id === selectedGame);

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    try {
      await login(username, password);
      setIsAuthenticated(true);
    } catch (error) {
      alert('Login failed');
    }
  };
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

      {(timeLeft <= 10 && timeLeft > 0) && (
        <div style={{position: "absolute", top: 0, right: "50%", transform: "translate(50%, 0%)", borderRadius: "0 0 500% 500%", backgroundColor: 'white', justifyContent: "center", alignItems: "center", padding: "1em", zIndex: 10, width: "10em", height: "10em", textAlign: "center"}}>
          <p style={{ color: "black" , fontWeight: "bold", fontSize: "1.25em"}}>You Still There?<br/><h2 style={{color: "black" , fontWeight: "bold", fontSize: "2em"}}>{timeLeft}</h2></p>
        </div>
      )}

      {/* Navigation bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2vh 2vw',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
          <a href="http://localhost:8000/">
            <img
              src="/static/images/pages/logo-colour.svg"
              alt="Vision Play Hub Logo"
              style={{ height: '6vh', width: 'auto' }}
            />
          </a>
        </div>
        {(!selectedGame && !isAuthenticated && username == 'Guest') ? (
        <div style={{ display: 'flex', gap: '0.8vw' }}>
          <a href="http://localhost:8000/auth/login/" style={{ textDecoration: 'none' }}>
            <button className="hanken-grotesk-bold back-button">Log In</button>
          </a>
          <a href="http://localhost:8000/auth/signup/" style={{ textDecoration: 'none' }}>
            <button className="hanken-grotesk-bold back-button">Sign Up</button>
          </a>
        </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.8vw' }}>
            <a href="http://localhost:8000/auth/leaderboards/" style={{ textDecoration: 'none', alignItems: "center", justifyContent: "center", display: "flex" , flexDirection: "column" }}>
              <div style={{borderRadius: "100%", width: "3em", height: "3em", display: "flex", alignItems: "center", justifyContent: "center"}}>
                <img src="static/images/pages/leaderboard.svg" alt="Leaderboards" style={{ width: "2em", height: "2em" }}/>
              </div>
              <button className="hanken-grotesk-bold back-button">Leaderboards</button>
            </a>
            <a href="http://localhost:8000/accounts/profile/" style={{ textDecoration: 'none', alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column" }}>
              <div style={{backgroundColor: light, borderRadius: "100%", width: "3em", height: "3em", display: "flex", alignItems: "center", justifyContent: "center", color: dark, fontSize: "1.5em", fontWeight: "0.75em"}}>
                {window.REACT_USERNAME.charAt(0).toUpperCase()}
              </div>
              <button className="hanken-grotesk-bold back-button">Profile</button>
            </a>
          </div>
        )}
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

      <footer>
        <p className="dm-sans-bold" style={{ textAlign: "center", color: "#ffffff" }}>
          The Woks © 2025
        </p>
      </footer>
    </div>
  );
};

export default App;
