/**
 * Get tile coordinate for a given tile type
 * @param grid 
 * @param tileType 
 * @returns 
 */
export const findTile = (grid: Tile[][], tileType: Tile): [number, number] | null => {
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      if (grid[x][y] === tileType) {
        return [x, y];
      }
    }
  }
  return null;
};

/**
 * Get all the tiles coordinates for a given tile type
 * @param grid 
 * @param tileType 
 * @returns 
 */
export const findTiles = (grid: Tile[][], tileType: Tile): [number, number][] => {
  return grid.reduce((acc, row, x) => {
    const y = row.indexOf(tileType);
    if (y !== -1) {
      acc.push([x, y]);
    }
    return acc;
  }, [] as [number, number][]);
};

/**
 * Generate a grid with random tiles types
 * @param gridSize Size of the grid
 * @returns 
 */
export const getRandomTiles = (gridSize: number) => {
  const randomIndex = () => Math.floor(Math.random() * gridSize);
  const newTiles = getNewGrid(gridSize)

  times(randomIndex() * randomIndex(), () => newTiles[randomIndex()][randomIndex()] = 'boulder')
  times(randomIndex() * randomIndex(), () => newTiles[randomIndex()][randomIndex()] = 'gravel')
  times(randomIndex(), () => newTiles[randomIndex()][randomIndex()] = 'wormholeEntrance')
  times(randomIndex(), () => newTiles[randomIndex()][randomIndex()] = 'wormholeExit')

  // Ensure requirements are met
  newTiles[randomIndex()][randomIndex()] = 'start'
  newTiles[randomIndex()][randomIndex()] = 'target'

  return newTiles
}

/**
 * Given a grid and a tile type, find the first occurrence as Node
 * @param grid 
 * @param tileType 
 * @returns 
 */
const findNode = (grid: Tile[][], tileType: Tile): Node | null => {
  const coords = findTile(grid, tileType);
  return coords ? { row: coords[0], col: coords[1], g: 0, h: 0, f: 0, parent: null } : null;
};

/**
 * Given a grid and a tile type, all the occurrences as Nodes
 * @param grid 
 * @param tileType 
 * @returns 
 */
const findNodes = (grid: Tile[][], tileType: Tile): Node[] => {
  return findTiles(grid, tileType).map(([row, col]) => ({ row, col, g: 0, h: 0, f: 0, parent: null }));
};

/**
 * Given a node, return adjacent ones within the grid boundaries
 * @param node 
 * @param grid 
 * @returns 
 */
const getNeighbors = (node: Node, [width, length]: [number, number]): Node[] => {
  const directions = [
    { row: -1, col: 0 }, // Up one row
    { row: 1, col: 0 }, // Down one row
    { row: 0, col: -1 }, // Left one column
    { row: 0, col: 1 }, // Right one column
  ];
  
  const neighbors: Node[] = directions
    // Generate all possible neighbors
    .map(({ row, col }) => ({ row: node.row + row, col: node.col + col, g: 0, h: 0, f: 0, parent: null }))
    // Filter out the ones that are out of bounds
    .filter(({ row, col }) => row >= 0 && row < width && col >= 0 && col < length);

  return neighbors;
};

/**
 * Given 2 nodes, provide an educated guess of the cost for the path between them (ignoring obstacles)
 * @param node 
 * @param target 
 * @returns 
 */
const heuristic = (node: Node, target: Node): number => {
  return Math.abs(node.row - target.row) + Math.abs(node.col - target.col);
};

/**
 * Plot the routes for each last node going backwards based on stored parent nodes
 * @param lastNodes Last nodes for each route to plot
 * @param grid 
 * @returns 
 */
const plotRoute = (lastNodes: Node[], openSet: Node[], size: number): Tile[][] => {
  const newGrid = getNewGrid(size);
  openSet.forEach((node) => {
    newGrid[node.row][node.col] = node.f.toString();
  });

  lastNodes.forEach((last: Node) => {
    let lastNode: Node | null = last;
    // Traverse the path backwards
    while (lastNode) {
      newGrid[lastNode.row][lastNode.col] = 'route';
      lastNode = lastNode.parent;
    }
  });

  return newGrid;
};

/**
 * Find all the possible wormhole routes combinations sorted by lower cost
 * @param start 
 * @param target 
 * @param grid 
 * @returns 
 */
const getWormholeRoutes = (startNode: Node, targetNode: Node, grid: Tile[][]): WormholeRoute[] => {
  const entrances = findNodes(grid, 'wormholeEntrance');
  const exits = findNodes(grid, 'wormholeExit');
  if (!entrances.length || !exits.length) {
    return [];
  }

  return entrances.flatMap(entrance => {
    entrance.g = 0;
    entrance.h = heuristic(entrance, startNode);
    entrance.f = entrance.g + entrance.h;

    return exits.map(exit => {
      exit.g = 0;
      exit.h = heuristic(exit, targetNode);
      exit.f = exit.g + exit.h;

      const cost = entrance.f + exit.f;
      return { cost, entrance, exit };
    });
  })
  .sort((a, b) => a.cost - b.cost);
};

/**
 * Given 2 nodes, return last node and all the computed nodes
 * @param startNode 
 * @param targetNode 
 * @param initialCost 
 * @param grid 
 * @returns 
 */
const getRoute = (startNode: Node, targetNode: Node, initialCost: number, grid: Tile[][]) => {
  // For Start node, heuristic and total costs are the same
  startNode.g = 0;
  startNode.h = initialCost
  startNode.f = startNode.g + startNode.h;
  const nodes = []; // Store all the nodes for debugging purposes

  const width = grid.length;
  const length = grid[0].length;
  const openSet = [startNode];  // Discovered nodes to be evaluated
  const closedSet: string[] = []; // Discarded nodes
  
  // Loop till no node is left
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f); // Search always by last node to optimize performances
    const lastNode = openSet.shift()!; // Remove first node

    // Target reached, path found
    if (lastNode.row === targetNode.row && lastNode.col === targetNode.col) {
      return {
        last: lastNode,
        nodes
      };
    }

    // Exclude last node since not matching
    closedSet.push(`${lastNode.row},${lastNode.col}`);

    // Evaluate neighbors of last node
    for (const neighbor of getNeighbors(lastNode, [width, length])) {
      // Exclude node already evaluated
      if (closedSet.includes(`${neighbor.row},${neighbor.col}`)) {
        continue;
      }

      // Exclude nodes which are boulders
      const tile = grid[neighbor.row][neighbor.col];
      if (tile === 'boulder') {
        continue;
      }

      // Add costs to the previous node cost based on the type of tile
      const tileTypeCost = lastNode.g + (tile === 'gravel' ? 3 : 1);

      // Check neighbor node is not discovered (added to openSet)
      const openNode = openSet.find(node => node.row === neighbor.row && node.col === neighbor.col);
      // If not discovered or better path found, update node
      if (!openNode || tileTypeCost < openNode.g) {
        neighbor.g = tileTypeCost;
        neighbor.h = heuristic(neighbor, targetNode);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = lastNode;
        nodes.push(neighbor);
        // Add to discovered nodes, if missing
        if (!openNode) {
          openSet.push(neighbor);
        }
      }
    }
  }
}

/**
 * Use A* pathfinder algorithm to calculate the route through Nodes for a given grid of tiles
 * https://en.wikipedia.org/wiki/A*_search_algorithm
 * This method is based on improving the heuristic and returning the first path found
 * @param grid Populated tiles
 * @returns 
 */
export const getBestRoute = (grid: Tile[][]): {
  delta: number;
  path: Tile[][],
  message: string,
  length: number
} => {
  const startTime = performance.now();
  const startNode = findNode(grid, 'start');
  const targetNode = findNode(grid, 'target');
  const path = getNewGrid(grid.length); // Plotted path is initially empty

  // Return message if start or target tiles are missing
  if (!startNode || !targetNode) {
    return { delta: 0, path, message: 'Start or target tile are missing', length: Infinity };
  }

  // Find best wormhole route as comparison
  const wormholeRoutes = getWormholeRoutes(startNode, targetNode, grid);
  const defaultCost = heuristic(startNode, targetNode);
  let bestRoute: ComputedRoute = { delta: performance.now() - startTime, path, message: 'No route found!', length: Infinity };

  // Attempt to find a route through wormholes
  const tryWormholeRoute = (wormhole: {
    cost: number;
    entrance: Node;
    exit: Node;
  }): ComputedRoute | undefined => {
    const entranceRoute = getRoute(startNode, wormhole.entrance, defaultCost, grid);
    const exitRoute = getRoute(wormhole.exit, targetNode, defaultCost, grid);
    if (entranceRoute && exitRoute) {
      return {
        delta: performance.now() - startTime,
        path: plotRoute([entranceRoute.last, exitRoute.last], [...entranceRoute.nodes, ...exitRoute.nodes], grid.length), // Combine entrance and exit routes
        message: '',
        length: entranceRoute.last.f + exitRoute.last.f
      }
    }
  }
  
  // Attempt to find a normal route
  const tryNormalRoute = (): ComputedRoute | undefined => {
    // Generate route without wormholes
    const route = getRoute(startNode, targetNode, defaultCost, grid);
    if (route) {
      return {
        delta: performance.now() - startTime,
        path: plotRoute([route.last], route.nodes, grid.length),
        message: '',
        length: route.last.f
      }
    }
  };

  // Try to find a normal route first, to be used as comparison or fallback
  const normalRoute = tryNormalRoute();
  if (normalRoute && (!bestRoute.length || normalRoute.length < bestRoute.length)) {
    bestRoute = normalRoute;
  }

  // Find the best wormhole route if any
  while (wormholeRoutes.length > 0) {
    if (wormholeRoutes[0].cost >= bestRoute.length) {
      break; // No need to check further wormholes
    }

    const wormhole = wormholeRoutes.shift()!; // Remove and store last wormhole route

    const wormholeRoute = tryWormholeRoute(wormhole);
    // If no wormhole route found, try normal route
    if (wormholeRoute && (!bestRoute.length || wormholeRoute.length < bestRoute.length)) {
      const routeDiff = defaultCost - wormhole.cost;
      wormholeRoute.message = routeDiff > 0
        ? `Wormhole saved ${routeDiff} steps!`
        : `Wormhole costs ${Math.abs(routeDiff)} more steps, but normal route is blocked`
      return wormholeRoute;
    }
  }

  bestRoute.delta = performance.now() - startTime;

  return bestRoute;
};
