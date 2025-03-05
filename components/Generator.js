import React, { useState, useRef } from 'react';

const Generator = ({ room }) => {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [musicFile, setMusicFile] = useState(null);
  const [musicFileName, setMusicFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef(null);

  const handleMusicFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMusicFile(file);
      setMusicFileName(file.name);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTheme('');
    setDifficulty('medium');
    setMusicFile(null);
    setMusicFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateLabyrinth = async () => {
    if (!title || !theme) return;

    setIsGenerating(true);
    try {
      // Step 1: Generate labyrinth description using LLM
      const labyrinthPrompt = `
        Create an immersive labyrinth description with the title "${title}" and theme "${theme}".
        The difficulty level is ${difficulty}.
        Include details about:
        - Setting and atmosphere
        - Unique challenges and obstacles
        - Special features
        - At least 3 different biomes or areas with distinct characteristics
        - A hidden secret or treasure
        
        Format your response as a JSON object with these properties:
        - description: A 2-3 paragraph overview of the labyrinth
        - biomes: An array of 3-5 biome objects, each with "name" and "description" properties
        - wallTextures: Brief descriptions for wall textures for each biome
        - floorTextures: Brief descriptions for floor textures for each biome
        - specialFeatures: An array of special gameplay elements or obstacles
        - story: A short narrative element
      `;

      const labyrinthDescriptionResponse = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a creative labyrinth designer that creates immersive, detailed, and atmospheric labyrinths."
          },
          {
            role: "user",
            content: labyrinthPrompt
          }
        ],
        json: true
      });

      const labyrinthData = JSON.parse(labyrinthDescriptionResponse.content);

      // Step 2: Generate an image for the labyrinth using the description
      const imageGenPrompt = `
        A birds-eye view map of a labyrinth called "${title}" with theme "${theme}".
        ${labyrinthData.description}
        The labyrinth features these biomes: ${labyrinthData.biomes.map(b => b.name).join(', ')}.
        Create a detailed, atmospheric, and visually striking map of this maze.
        Use a style that enhances the ${theme} theme.
      `;

      const imageResult = await websim.imageGen({
        prompt: imageGenPrompt,
        aspect_ratio: "1:1"
      });

      // Step 3: Upload music if provided
      let musicUrl = null;
      if (musicFile) {
        musicUrl = await websim.upload(musicFile);
      }

      // Step 4: Generate wall textures for each biome
      const biomeTextures = await Promise.all(
        labyrinthData.biomes.map(async (biome) => {
          const texturePrompt = `
            A seamless wall texture for the "${biome.name}" biome in a labyrinth.
            ${biome.description}
            Wall texture description: ${labyrinthData.wallTextures[biome.name] || "Stone with moss"}
            Make it detailed and suitable for a game environment. Seamless pattern.
          `;

          const textureResult = await websim.imageGen({
            prompt: texturePrompt,
            aspect_ratio: "1:1",
            width: 512,
            height: 512
          });

          return {
            biomeName: biome.name,
            textureUrl: textureResult.url
          };
        })
      );

      // Step 5: Save everything to the database
      const labyrinth = await room.collection('labyrinth').create({
        title,
        theme,
        difficulty,
        description: labyrinthData.description,
        biomes: labyrinthData.biomes,
        image: imageResult.url,
        musicUrl,
        musicFileName: musicFile ? musicFileName : null,
        generatedData: labyrinthData,
        biomeTextures,
        createdAt: new Date().toISOString()
      });

      console.log('Labyrinth created:', labyrinth);
      resetForm();
    } catch (error) {
      console.error('Error generating labyrinth:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="generator-panel">
      <div className="form-container">
        <h2>Generate Your Labyrinth</h2>
        <div className="form-group">
          <label htmlFor="title">Labyrinth Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your labyrinth"
            disabled={isGenerating}
          />
        </div>

        <div className="form-group">
          <label htmlFor="theme">Theme:</label>
          <input
            type="text"
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ancient ruins, cyber network, enchanted forest, etc."
            disabled={isGenerating}
          />
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">Difficulty:</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={isGenerating}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="nightmare">Nightmare</option>
          </select>
        </div>

        <div className="form-group">
          <label>Music (optional):</label>
          <div className="file-input-container">
            <label className="file-input-label">
              {musicFileName ? musicFileName : "Choose a music file (.mp3, .mid)"}
              <input
                type="file"
                className="file-input"
                accept=".mp3,.mid,.wav"
                onChange={handleMusicFileChange}
                ref={fileInputRef}
                disabled={isGenerating}
              />
            </label>
          </div>
          {musicFileName && (
            <div className="file-name">{musicFileName}</div>
          )}
        </div>

        <button
          onClick={generateLabyrinth}
          disabled={!title || !theme || isGenerating}
        >
          {isGenerating ? (
            <>
              Generating
              <span className="loading-indicator">↻</span>
            </>
          ) : (
            "Generate Labyrinth"
          )}
        </button>
      </div>
    </div>
  );
};

export default Generator;

