import React from 'react';

const Gallery = ({ room, onLabyrinthSelect }) => {
  const labyrinths = React.useSyncExternalStore(
    room.collection('labyrinth').subscribe,
    () => room.collection('labyrinth').getList()
  );
  
  // Sort labyrinths by creation date, newest first
  const sortedLabyrinths = [...labyrinths].sort((a, b) => 
    new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
  );

  return (
    <div className="gallery-container">
      <h2>Labyrinth Gallery</h2>
      <div className="gallery">
        {sortedLabyrinths.length === 0 ? (
          <div className="no-labyrinths">
            No labyrinths yet! Be the first to create one.
          </div>
        ) : (
          sortedLabyrinths.map((labyrinth) => (
            <div 
              key={labyrinth.id} 
              className="labyrinth-card"
              onClick={() => onLabyrinthSelect(labyrinth)}
            >
              <img 
                src={labyrinth.image} 
                alt={labyrinth.title} 
                className="labyrinth-image" 
              />
              <div className="labyrinth-content">
                <h3 className="labyrinth-title">{labyrinth.title}</h3>
                <p className="labyrinth-description">
                  {labyrinth.description && typeof labyrinth.description === 'string' 
                    ? labyrinth.description.substring(0, 120) + '...' 
                    : 'Explore this mysterious labyrinth...'}
                </p>
                <div className="labyrinth-meta">
                  <span>Theme: {labyrinth.theme}</span>
                  <span>Difficulty: {labyrinth.difficulty}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Gallery;

