import * as THREE from 'three';

class LabyrinthGenerator {
  constructor(labyrinthData, scene) {
    this.data = labyrinthData;
    this.scene = scene;
    this.size = 50; // Size of the labyrinth
    this.cellSize = 4; // Size of each cell
    this.wallHeight = 3; // Height of walls
    this.textureLoader = new THREE.TextureLoader();
    this.biomeTextures = this.preprocessBiomeTextures();
    
    // Create a seed from the labyrinth title
    this.seed = this.hashString(this.data.title + this.data.theme);
    this.random = this.mulberry32(this.seed);
  }
  
  // Simple hash function to convert string to number seed
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  
  // Seeded random number generator
  mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  preprocessBiomeTextures() {
    const textures = {};
    
    if (this.data.biomeTextures && Array.isArray(this.data.biomeTextures)) {
      this.data.biomeTextures.forEach(biome => {
        if (biome.biomeName && biome.textureUrl) {
          textures[biome.biomeName] = biome.textureUrl;
        }
      });
    }
    
    return textures;
  }
  
  generate() {
    // Generate maze grid using recursive backtracking
    const grid = this.generateMazeGrid();
    
    // Create floor
    this.createFloor(grid);
    
    // Create walls
    this.createWalls(grid);
    
    // Add ceiling
    this.createCeiling();
    
    // Add special features
    this.addSpecialFeatures(grid);
    
    // Add lighting
    this.addLighting(grid);
    
    return {
      grid,
      startPosition: new THREE.Vector3(1.5 * this.cellSize, 0, 1.5 * this.cellSize),
      checkCollision: (position) => this.checkCollision(position, grid)
    };
  }
  
  generateMazeGrid() {
    const width = this.size;
    const height = this.size;
    const grid = Array(height).fill().map(() => Array(width).fill(1)); // 1 = wall, 0 = path
    
    // Start with all walls
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        grid[y][x] = 1;
      }
    }
    
    // Generate maze using recursive backtracking
    const stack = [];
    const startX = 1;
    const startY = 1;
    
    // Mark the starting cell as path
    grid[startY][startX] = 0;
    stack.push({x: startX, y: startY});
    
    const directions = [
      {dx: 0, dy: -2}, // Up
      {dx: 2, dy: 0},  // Right
      {dx: 0, dy: 2},  // Down
      {dx: -2, dy: 0}  // Left
    ];
    
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      
      // Get unvisited neighbors
      const neighbors = [];
      
      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] === 1) {
          neighbors.push({x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2});
        }
      }
      
      if (neighbors.length > 0) {
        // Choose random neighbor
        const idx = Math.floor(this.random() * neighbors.length);
        const neighbor = neighbors[idx];
        
        // Remove wall between current cell and chosen neighbor
        const wallX = current.x + neighbor.dx;
        const wallY = current.y + neighbor.dy;
        grid[wallY][wallX] = 0;
        
        // Mark the chosen neighbor as visited and push to stack
        grid[neighbor.y][neighbor.x] = 0;
        stack.push({x: neighbor.x, y: neighbor.y});
      } else {
        // Backtrack
        stack.pop();
      }
    }
    
    // Assign biomes to different regions of the maze
    this.assignBiomesToGrid(grid);
    
    return grid;
  }
  
  assignBiomesToGrid(grid) {
    // Create a biome grid that corresponds to the maze grid
    const biomeGrid = Array(grid.length).fill().map(() => Array(grid[0].length).fill(null));
    
    // Define biome regions
    const biomes = this.data.biomes || [
      { name: 'Stone', description: 'Cold stone walls' },
      { name: 'Ancient', description: 'Ancient ruins with glyphs' },
      { name: 'Crystal', description: 'Glowing crystal formations' }
    ];
    
    // Simple assignment based on regions
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        // For now, just divide the grid into regions
        let biomeIndex;
        
        // Assign biomes based on distance from center to create concentric rings
        const distFromCenter = Math.sqrt(
          Math.pow(x - grid[0].length / 2, 2) + 
          Math.pow(y - grid.length / 2, 2)
        );
        
        const maxDist = Math.sqrt(
          Math.pow(grid[0].length / 2, 2) + 
          Math.pow(grid.length / 2, 2)
        );
        
        const normalizedDist = distFromCenter / maxDist;
        
        // Assign biome index based on normalized distance and number of biomes
        biomeIndex = Math.min(
          Math.floor(normalizedDist * biomes.length),
          biomes.length - 1
        );
        
        // Add some randomness to biome boundaries
        if (this.random() < 0.2) {
          biomeIndex = (biomeIndex + 1) % biomes.length;
        }
        
        biomeGrid[y][x] = biomes[biomeIndex].name;
      }
    }
    
    // Store the biome grid for later use
    this.biomeGrid = biomeGrid;
  }
  
  createFloor(grid) {
    const floorGeometry = new THREE.PlaneGeometry(
      grid[0].length * this.cellSize, 
      grid.length * this.cellSize
    );
    floorGeometry.rotateX(-Math.PI / 2);
    
    // Create floor material based on biomes
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(
      (grid[0].length * this.cellSize) / 2 - this.cellSize / 2,
      0,
      (grid.length * this.cellSize) / 2 - this.cellSize / 2
    );
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  
  createWalls(grid) {
    // Wall geometry
    const wallGeometry = new THREE.BoxGeometry(
      this.cellSize, 
      this.wallHeight, 
      this.cellSize
    );
    
    // Create materials for different biomes
    const biomeMaterials = {};
    
    // Default material if biome textures aren't available
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Load textures for biomes if available
    for (const biomeName in this.biomeTextures) {
      try {
        const texture = this.textureLoader.load(this.biomeTextures[biomeName]);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        biomeMaterials[biomeName] = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          metalness: 0.3
        });
      } catch (e) {
        console.error(`Failed to load texture for biome ${biomeName}:`, e);
        biomeMaterials[biomeName] = defaultMaterial;
      }
    }
    
    // Create walls based on grid
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === 1) { // If cell is a wall
          // Determine which biome this wall belongs to
          const biomeName = this.biomeGrid?.[y]?.[x] || 'Stone';
          const material = biomeMaterials[biomeName] || defaultMaterial;
          
          const wall = new THREE.Mesh(wallGeometry, material);
          wall.position.set(
            x * this.cellSize,
            this.wallHeight / 2,
            y * this.cellSize
          );
          wall.castShadow = true;
          wall.receiveShadow = true;
          
          this.scene.add(wall);
        }
      }
    }
  }
  
  createCeiling() {
    const ceilingGeometry = new THREE.PlaneGeometry(
      this.size * this.cellSize,
      this.size * this.cellSize
    );
    ceilingGeometry.rotateX(Math.PI / 2);
    
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.set(
      (this.size * this.cellSize) / 2 - this.cellSize / 2,
      this.wallHeight,
      (this.size * this.cellSize) / 2 - this.cellSize / 2
    );
    
    this.scene.add(ceiling);
  }
  
  addSpecialFeatures(grid) {
    // Add light sources at intersections
    for (let y = 1; y < grid.length - 1; y += 2) {
      for (let x = 1; x < grid[0].length - 1; x += 2) {
        if (grid[y][x] === 0 && this.random() < 0.1) { // 10% chance at path cells
          // Create a light source
          const light = new THREE.PointLight(0xffaa00, 0.5, 5);
          light.position.set(
            x * this.cellSize,
            this.wallHeight / 2,
            y * this.cellSize
          );
          
          // Create a small glowing sphere to represent the light
          const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(light.position);
          
          this.scene.add(light);
          this.scene.add(sphere);
        }
      }
    }
  }
  
  addLighting(grid) {
    // Add ambient light
    const ambient = new THREE.AmbientLight(0x333333);
    this.scene.add(ambient);
    
    // Add directional light
    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(0, 20, 0);
    directional.castShadow = true;
    
    // Set up shadow properties
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    const d = 50;
    directional.shadow.camera.left = -d;
    directional.shadow.camera.right = d;
    directional.shadow.camera.top = d;
    directional.shadow.camera.bottom = -d;
    
    this.scene.add(directional);
    
    // Add fog based on theme
    let fogColor = 0x000000;
    let fogDensity = 0.03;
    
    // Adjust fog based on theme keywords
    const theme = this.data.theme.toLowerCase();
    if (theme.includes('forest') || theme.includes('jungle')) {
      fogColor = 0x004400;
      fogDensity = 0.04;
    } else if (theme.includes('ice') || theme.includes('snow')) {
      fogColor = 0x88aaff;
      fogDensity = 0.02;
    } else if (theme.includes('cyber') || theme.includes('tech')) {
      fogColor = 0x000044;
      fogDensity = 0.03;
    } else if (theme.includes('desert') || theme.includes('sand')) {
      fogColor = 0x997755;
      fogDensity = 0.01;
    }
    
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    this.scene.background = new THREE.Color(fogColor);
  }
  
  checkCollision(position, grid) {
    // Convert world position to grid coordinates
    const gridX = Math.floor(position.x / this.cellSize);
    const gridZ = Math.floor(position.y / this.cellSize);
    
    // Check if out of bounds
    if (gridX < 0 || gridX >= grid[0].length || gridZ < 0 || gridZ >= grid.length) {
      return true; // Collision with boundary
    }
    
    // Check if position is in a wall cell
    return grid[gridZ][gridX] === 1;
  }
}

export default LabyrinthGenerator;

