import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import LabyrinthGenerator from '../utils/LabyrinthGenerator.js';

const GameView = ({ labyrinth, onClose }) => {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const mazeRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef({
    position: new THREE.Vector3(0, 1.6, 0),
    velocity: new THREE.Vector3(),
    onFloor: true,
    canJump: true
  });
  
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  });

  useEffect(() => {
    // Check if mobile
    setIsMobile(window.innerWidth <= 768);
    
    // Initialize Three.js
    const init = () => {
      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      scene.fog = new THREE.FogExp2(0x000000, 0.02);
      sceneRef.current = scene;
      
      // Camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
      );
      camera.position.y = 1.6; // Approximate eye height
      cameraRef.current = camera;
      
      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Controls
      const controls = new PointerLockControls(camera, renderer.domElement);
      scene.add(controls.getObject());
      controlsRef.current = controls;
      
      // Light
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);
      
      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(0, 10, 0);
      pointLight.castShadow = true;
      scene.add(pointLight);
      
      // Generate labyrinth
      generateLabyrinth();
      
      // Event listeners
      window.addEventListener('resize', onWindowResize);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      
      // Start animation
      animate();
      
      // Play audio if available
      if (labyrinth.musicUrl) {
        const audio = new Audio(labyrinth.musicUrl);
        audio.loop = true;
        audioRef.current = audio;
        
        // Only play audio when controls are locked
        controls.addEventListener('lock', () => {
          audio.play().catch(err => console.error('Audio play error:', err));
        });
        
        controls.addEventListener('unlock', () => {
          audio.pause();
        });
      }
    };
    
    const generateLabyrinth = () => {
      // Use the LabyrinthGenerator utility to create the maze
      const generator = new LabyrinthGenerator(labyrinth, sceneRef.current);
      const maze = generator.generate();
      mazeRef.current = maze;
      
      // Set player starting position
      playerRef.current.position.set(
        maze.startPosition.x, 
        1.6, 
        maze.startPosition.z
      );
      cameraRef.current.position.copy(playerRef.current.position);
    };
    
    const onWindowResize = () => {
      setIsMobile(window.innerWidth <= 768);
      
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          keysRef.current.forward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysRef.current.backward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = true;
          break;
        case 'Space':
          if (playerRef.current.canJump) {
            playerRef.current.velocity.y = 4.5;
            playerRef.current.canJump = false;
          }
          break;
        case 'Escape':
          if (controlsRef.current.isLocked) {
            controlsRef.current.unlock();
          } else {
            onClose();
          }
          break;
      }
    };
    
    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          keysRef.current.forward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysRef.current.backward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = false;
          break;
      }
    };
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current.isLocked === true) {
        updatePlayer();
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    const updatePlayer = () => {
      const delta = 0.016; // Approximately 60fps
      
      // Apply gravity
      playerRef.current.velocity.y -= 9.8 * delta;
      
      // Movement
      const controlObject = controlsRef.current.getObject();
      const moveSpeed = 5.0;
      
      if (keysRef.current.forward) {
        tempVector.setFromMatrixColumn(controlObject.matrix, 0);
        tempVector.crossVectors(controlObject.up, tempVector);
        controlObject.position.addScaledVector(tempVector, moveSpeed * delta);
      }
      
      if (keysRef.current.backward) {
        tempVector.setFromMatrixColumn(controlObject.matrix, 0);
        tempVector.crossVectors(controlObject.up, tempVector);
        controlObject.position.addScaledVector(tempVector, -moveSpeed * delta);
      }
      
      if (keysRef.current.right) {
        tempVector.setFromMatrixColumn(controlObject.matrix, 0);
        controlObject.position.addScaledVector(tempVector, moveSpeed * delta);
      }
      
      if (keysRef.current.left) {
        tempVector.setFromMatrixColumn(controlObject.matrix, 0);
        controlObject.position.addScaledVector(tempVector, -moveSpeed * delta);
      }
      
      // Apply velocity
      controlObject.position.y += playerRef.current.velocity.y * delta;
      
      // Collision detection with floor
      if (controlObject.position.y < 1.6) {
        playerRef.current.velocity.y = 0;
        controlObject.position.y = 1.6;
        playerRef.current.canJump = true;
      }
      
      // Collision detection with walls
      if (mazeRef.current) {
        const playerPosition = new THREE.Vector2(
          controlObject.position.x, 
          controlObject.position.z
        );
        
        if (mazeRef.current.checkCollision(playerPosition)) {
          // If collision detected, revert position
          controlObject.position.copy(playerRef.current.position);
        } else {
          // Update last valid position
          playerRef.current.position.copy(controlObject.position);
        }
      }
    };
    
    const tempVector = new THREE.Vector3();
    
    init();
    
    return () => {
      // Clean up
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [labyrinth, onClose]);
  
  const handleLockControls = () => {
    if (controlsRef.current && !controlsRef.current.isLocked) {
      controlsRef.current.lock();
    }
  };
  
  const handleMobileControl = (direction) => {
    // For mobile controls, simulate key presses
    if (!controlsRef.current.isLocked) {
      controlsRef.current.lock();
    }
    
    // Create a temporary state where only the pressed direction is active
    const tempKeys = {
      forward: direction === 'up',
      backward: direction === 'down',
      left: direction === 'left',
      right: direction === 'right',
      jump: direction === 'jump'
    };
    
    // Update the keys reference
    keysRef.current = tempKeys;
    
    // Schedule to reset after touch ends
    setTimeout(() => {
      if (direction in keysRef.current) {
        keysRef.current[direction] = false;
      }
    }, 100);
  };

  return (
    <div className="game-view" ref={containerRef} onClick={handleLockControls}>
      <div className="game-overlay">
        <div className="game-title">{labyrinth.title}</div>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {isMobile && (
        <div className="mobile-controls">
          <button 
            className="control-button up-button"
            onTouchStart={() => handleMobileControl('up')}
            onTouchEnd={() => keysRef.current.forward = false}
          >
            <span className="control-icons">↑</span>
          </button>
          <button 
            className="control-button left-button"
            onTouchStart={() => handleMobileControl('left')}
            onTouchEnd={() => keysRef.current.left = false}
          >
            <span className="control-icons">←</span>
          </button>
          <button 
            className="control-button right-button"
            onTouchStart={() => handleMobileControl('right')}
            onTouchEnd={() => keysRef.current.right = false}
          >
            <span className="control-icons">→</span>
          </button>
          <button 
            className="control-button down-button"
            onTouchStart={() => handleMobileControl('down')}
            onTouchEnd={() => keysRef.current.backward = false}
          >
            <span className="control-icons">↓</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GameView;

