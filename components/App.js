import React, { useState } from 'react';
import Generator from './Generator.js';
import Gallery from './Gallery.js';
import GameView from './GameView.js';

const App = () => {
  const [selectedLabyrinth, setSelectedLabyrinth] = useState(null);
  const [room] = useState(() => new WebsimSocket());

  const handleLabyrinthSelect = (labyrinth) => {
    setSelectedLabyrinth(labyrinth);
  };

  const handleCloseGame = () => {
    setSelectedLabyrinth(null);
  };

  return (
    <div className="app-container">
      <Generator room={room} />
      <Gallery room={room} onLabyrinthSelect={handleLabyrinthSelect} />
      {selectedLabyrinth && (
        <GameView 
          labyrinth={selectedLabyrinth} 
          onClose={handleCloseGame} 
        />
      )}
    </div>
  );
};

export default App;

