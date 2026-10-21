import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { BoardTheme, PieceTheme } from '../types/chess';
import { StauntonGeometryFactory } from './StauntonGeometry';
import { TextureGenerator } from './TextureGenerator';

export interface MoveAnimation {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTime: number;
  duration: number;
  onComplete: () => void;
}

export class ChessScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;

  // Meshes & Cache
  private piecesMap: Map<Square, THREE.Mesh> = new Map();
  private pieceTheme: PieceTheme = 'liquid-glass';
  private boardTheme: BoardTheme = 'rustic-wood';
  private showCoordinates: boolean = true;
  private boardMesh: THREE.Mesh | null = null;
  private tableMesh: THREE.Mesh | null = null;
  private highlightGroup: THREE.Group = new THREE.Group();
  private hintArrowMesh: THREE.Group | null = null;
  private checkMesh: THREE.Mesh | null = null;

  // Interaction
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedSquare: Square | null = null;
  private legalMoveSquares: Square[] = [];
  private onSquareClickCallback: ((square: Square) => void) | null = null;

  // Active Animations
  private activeMoveAnimations: MoveAnimation[] = [];

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1118);

    // 2. Camera (default view matching the user's reference angle)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 9.2, 8.2);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer with realistic ACES Filmic Tone Mapping and Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08; // don't go below table
    this.controls.minDistance = 4;
    this.controls.maxDistance = 18;
    this.controls.target.set(0, 0, 0);

    // 5. Lights & Studio Environment
    this.setupLighting();

    // 6. Table & Board
    this.setupTableAndBoard();

    // 7. Highlights group
    this.scene.add(this.highlightGroup);

    // 8. Event listeners
    this.setupEvents();

    // 9. Start loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Main key directional light casting soft shadows
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(6, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Rim fill light for glass edge transmission
    const rimLight = new THREE.DirectionalLight(0xaad5ff, 1.4);
    rimLight.position.set(-8, 9, -7);
    this.scene.add(rimLight);

    // Front soft fill
    const frontFill = new THREE.DirectionalLight(0xffffff, 0.9);
    frontFill.position.set(0, 4, 8);
    this.scene.add(frontFill);

    // Studio Environment Reflections
    try {
      const studioEnv = TextureGenerator.createStudioEnvironment(this.renderer);
      this.scene.environment = studioEnv.texture;
    } catch (e) {
      console.warn('Could not generate studio environment cubemap:', e);
    }
  }

  private setupTableAndBoard() {
    // Rustic Wood Table Background (matches user's reference photo)
    const tableTexture = TextureGenerator.createWoodTableTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    const tableGeo = new THREE.PlaneGeometry(36, 36);
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.rotation.x = -Math.PI / 2;
    this.tableMesh.position.y = -0.22;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // 3D Chessboard Box
    this.buildBoardMesh();
  }

  private buildBoardMesh() {
    if (this.boardMesh) {
      this.scene.remove(this.boardMesh);
      this.boardMesh.geometry.dispose();
      this.boardMesh = null;
    }

    const boardWidth = 8.8;
    const boardThickness = 0.44;
    const boardGeo = new THREE.BoxGeometry(boardWidth, boardThickness, boardWidth);

    // Textures: top face is checkerboard, sides are rich mahogany border
    const boardTopTexture = TextureGenerator.createChessboardTexture(this.boardTheme, this.showCoordinates);
    const topMat = new THREE.MeshStandardMaterial({
      map: boardTopTexture,
      roughness: 0.35,
      metalness: 0.05
    });

    const sideMat = new THREE.MeshStandardMaterial({
      color: this.boardTheme === 'obsidian-marble' ? 0x0f172a : (this.boardTheme === 'tournament-blue' ? 0x1a2b3c : 0x3d2012),
      roughness: 0.4,
      metalness: 0.1
    });

    const bottomMat = new THREE.MeshStandardMaterial({
      color: 0x15100c,
      roughness: 0.9
    });

    // Box materials order: +X, -X, +Y, -Y, +Z, -Z
    const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    this.boardMesh = new THREE.Mesh(boardGeo, materials);
    this.boardMesh.position.y = 0;
    this.boardMesh.receiveShadow = true;
    this.boardMesh.castShadow = true;
    this.scene.add(this.boardMesh);
  }

  // --- MATERIAL FACTORY ---
  private createPieceMaterial(color: Color): THREE.Material {
    const isWhite = color === 'w';

    switch (this.pieceTheme) {
      case 'liquid-glass': {
        // Advanced MeshPhysicalMaterial with high transmission & refraction
        if (isWhite) {
          return new THREE.MeshPhysicalMaterial({
            color: 0xf5faff,
            transmission: 0.92,
            opacity: 1,
            transparent: true,
            roughness: 0.04,
            ior: 1.54,
            thickness: 1.6,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0xffffff),
            attenuationColor: new THREE.Color(0xd6ecff),
            attenuationDistance: 2.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            envMapIntensity: 2.2
          });
        } else {
          return new THREE.MeshPhysicalMaterial({
            color: 0x111624,
            transmission: 0.84,
            opacity: 1,
            transparent: true,
            roughness: 0.06,
            ior: 1.56,
            thickness: 2.0,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0x99ccff),
            attenuationColor: new THREE.Color(0x182436),
            attenuationDistance: 1.4,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.8
          });
        }
      }

      case 'classic-wood': {
        // Polished Ivory and Ebony Wood (matches user's reference photo)
        if (isWhite) {
          return new THREE.MeshStandardMaterial({
            color: 0xf2ebd9,
            roughness: 0.28,
            metalness: 0.04
          });
        } else {
          return new THREE.MeshStandardMaterial({
            color: 0x221a15,
            roughness: 0.25,
            metalness: 0.04
          });
        }
      }

      case 'emerald-jade': {
        if (isWhite) {
          return new THREE.MeshPhysicalMaterial({
            color: 0xe8f5e9,
            transmission: 0.75,
            roughness: 0.12,
            ior: 1.52,
            thickness: 1.4,
            attenuationColor: new THREE.Color(0xc8e6c9)
          });
        } else {
          return new THREE.MeshPhysicalMaterial({
            color: 0x064e3b,
            transmission: 0.72,
            roughness: 0.1,
            ior: 1.54,
            thickness: 1.6,
            attenuationColor: new THREE.Color(0x022c22)
          });
        }
      }

      case 'cyber-neon': {
        if (isWhite) {
          return new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x0891b2,
            emissiveIntensity: 0.35,
            roughness: 0.2,
            metalness: 0.4
          });
        } else {
          return new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x7c3aed,
            emissiveIntensity: 0.35,
            roughness: 0.2,
            metalness: 0.4
          });
        }
      }
    }
  }

  // --- COORDINATE HELPERS ---
  public squareToPosition(square: Square): THREE.Vector3 {
    const file = square.charCodeAt(0) - 97; // 'a' -> 0, 'h' -> 7
    const rank = parseInt(square[1], 10) - 1; // '1' -> 0, '8' -> 7

    const squareSize = 1.0;
    const x = (file - 3.5) * squareSize;
    const z = (3.5 - rank) * squareSize;
    const y = 0.22; // sits right on top of board

    return new THREE.Vector3(x, y, z);
  }

  public positionToSquare(pos: THREE.Vector3): Square | null {
    const squareSize = 1.0;
    const fileIndex = Math.round(pos.x / squareSize + 3.5);
    const rankIndex = Math.round(3.5 - pos.z / squareSize);

    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
      return null;
    }

    const file = String.fromCharCode(97 + fileIndex);
    const rank = (rankIndex + 1).toString();
    return `${file}${rank}` as Square;
  }

  // --- SYNC BOARD STATE WITH CHESS.JS ---
  public updateBoard(game: Chess) {
    // Clear old pieces that are no longer on the board
    const currentBoard = game.board();
    const newSquares = new Set<Square>();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece) {
          const square = piece.square;
          newSquares.add(square);

          const existingMesh = this.piecesMap.get(square);
          const needsRecreate = !existingMesh ||
            (existingMesh.userData.type !== piece.type) ||
            (existingMesh.userData.color !== piece.color);

          if (needsRecreate) {
            if (existingMesh) {
              this.scene.remove(existingMesh);
              this.piecesMap.delete(square);
            }
            this.createPieceMesh(square, piece.type, piece.color);
          }
        }
      }
    }

    // Remove pieces from squares that are now empty
    for (const [sq, mesh] of this.piecesMap.entries()) {
      if (!newSquares.has(sq)) {
        this.scene.remove(mesh);
        this.piecesMap.delete(sq);
      }
    }

    // Update check indicator
    this.updateCheckIndicator(game);
  }

  private createPieceMesh(square: Square, type: PieceSymbol, color: Color): THREE.Mesh {
    const geom = StauntonGeometryFactory.getGeometry(type);
    const mat = this.createPieceMaterial(color);

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { square, type, color };

    // Position
    const pos = this.squareToPosition(square);
    mesh.position.copy(pos);

    // Orientation: Knights and Kings
    if (type === 'n') {
      mesh.rotation.y = color === 'w' ? 0 : Math.PI;
    }

    this.scene.add(mesh);
    this.piecesMap.set(square, mesh);
    return mesh;
  }

  // --- ANIMATED MOVE ---
  public animateMove(from: Square, to: Square, onFinish?: () => void) {
    const mesh = this.piecesMap.get(from);
    if (!mesh) {
      if (onFinish) onFinish();
      return;
    }

    // If there is an opponent piece on `to`, remove it or fade it out
    const targetPiece = this.piecesMap.get(to);
    if (targetPiece) {
      this.scene.remove(targetPiece);
      this.piecesMap.delete(to);
    }

    // Update map immediately
    this.piecesMap.delete(from);
    this.piecesMap.set(to, mesh);
    mesh.userData.square = to;

    const startPos = mesh.position.clone();
    const endPos = this.squareToPosition(to);

    const anim: MoveAnimation = {
      mesh,
      startPos,
      endPos,
      startTime: performance.now(),
      duration: 320, // 320ms smooth jump
      onComplete: () => {
        mesh.position.copy(endPos);
        if (onFinish) onFinish();
      }
    };

    this.activeMoveAnimations.push(anim);
  }

  // --- HIGHLIGHTS (SELECTED SQUARE, LEGAL MOVES, LAST MOVE) ---
  public setSelection(selected: Square | null, legalMoves: Square[]) {
    this.selectedSquare = selected;
    this.legalMoveSquares = legalMoves;
    this.refreshHighlights();
  }

  public setLastMove(from: Square | null, to: Square | null) {
    // Keep last move tiles visible
    this.lastMoveFrom = from;
    this.lastMoveTo = to;
    this.refreshHighlights();
  }
  private lastMoveFrom: Square | null = null;
  private lastMoveTo: Square | null = null;

  private refreshHighlights() {
    // Clear previous highlight meshes
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    // 1. Last Move squares (soft warm highlight)
    if (this.lastMoveFrom) {
      this.addSquareHighlight(this.lastMoveFrom, 0xf59e0b, 0.35);
    }
    if (this.lastMoveTo) {
      this.addSquareHighlight(this.lastMoveTo, 0xf59e0b, 0.45);
    }

    // 2. Selected Square (glowing emerald/cyan)
    if (this.selectedSquare) {
      this.addSquareHighlight(this.selectedSquare, 0x10b981, 0.55);
    }

    // 3. Legal Destination Squares (ring / circle markers)
    for (const sq of this.legalMoveSquares) {
      const pos = this.squareToPosition(sq);
      const isCapture = this.piecesMap.has(sq);

      if (isCapture) {
        // Red / Orange ring for capture
        const ringGeo = new THREE.RingGeometry(0.32, 0.44, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.225, pos.z);
        this.highlightGroup.add(ring);
      } else {
        // Small solid green/cyan dot for empty move square
        const dotGeo = new THREE.CircleGeometry(0.14, 24);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(pos.x, 0.225, pos.z);
        this.highlightGroup.add(dot);
      }
    }
  }

  private addSquareHighlight(sq: Square, colorHex: number, opacity: number) {
    const pos = this.squareToPosition(sq);
    const planeGeo = new THREE.PlaneGeometry(0.96, 0.96);
    const planeMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(pos.x, 0.222, pos.z);
    this.highlightGroup.add(plane);
  }

  // --- CHECK WARNING ---
  private updateCheckIndicator(game: Chess) {
    if (this.checkMesh) {
      this.scene.remove(this.checkMesh);
      this.checkMesh.geometry.dispose();
      this.checkMesh = null;
    }

    if (game.inCheck()) {
      const turn = game.turn();
      // Find king of current turn
      for (const [sq, mesh] of this.piecesMap.entries()) {
        if (mesh.userData.type === 'k' && mesh.userData.color === turn) {
          const pos = this.squareToPosition(sq);
          const ringGeo = new THREE.RingGeometry(0.2, 0.46, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xdc2626,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
          });
          this.checkMesh = new THREE.Mesh(ringGeo, ringMat);
          this.checkMesh.rotation.x = -Math.PI / 2;
          this.checkMesh.position.set(pos.x, 0.226, pos.z);
          this.scene.add(this.checkMesh);
          break;
        }
      }
    }
  }

  // --- HINT ARROW ---
  public showHint(from: Square, to: Square) {
    this.clearHint();

    const pFrom = this.squareToPosition(from);
    const pTo = this.squareToPosition(to);

    const dir = new THREE.Vector3().subVectors(pTo, pFrom);
    const length = dir.length();
    dir.normalize();

    const arrowGroup = new THREE.Group();

    // Curved tube or sleek arrow shaft
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, length - 0.4, 16);
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    const shaft = new THREE.Mesh(shaftGeo, arrowMat);
    shaft.position.set(0, (length - 0.4) / 2, 0);

    // Cone head
    const headGeo = new THREE.ConeGeometry(0.18, 0.4, 20);
    const head = new THREE.Mesh(headGeo, arrowMat);
    head.position.set(0, length - 0.2, 0);

    arrowGroup.add(shaft);
    arrowGroup.add(head);

    // Position & orient arrow from start square to end square
    arrowGroup.position.copy(pFrom);
    arrowGroup.position.y += 0.35; // slightly above board

    const up = new THREE.Vector3(0, 1, 0);
    arrowGroup.quaternion.setFromUnitVectors(up, dir);

    this.hintArrowMesh = arrowGroup;
    this.scene.add(this.hintArrowMesh);
  }

  public clearHint() {
    if (this.hintArrowMesh) {
      this.scene.remove(this.hintArrowMesh);
      this.hintArrowMesh = null;
    }
  }

  // --- THEME SETTINGS UPDATE ---
  public setTheme(pieceTheme: PieceTheme, boardTheme: BoardTheme, showCoords: boolean) {
    this.pieceTheme = pieceTheme;
    this.boardTheme = boardTheme;
    this.showCoordinates = showCoords;

    this.buildBoardMesh();

    // Re-apply materials to all existing pieces
    for (const mesh of this.piecesMap.values()) {
      mesh.material = this.createPieceMaterial(mesh.userData.color);
    }
    this.refreshHighlights();
  }

  // --- CAMERA PRESETS ---
  public setCameraView(preset: 'perspective' | 'topdown' | 'white' | 'black') {
    switch (preset) {
      case 'perspective':
        this.animateCamera(new THREE.Vector3(0, 9.2, 8.2), new THREE.Vector3(0, 0, 0));
        break;
      case 'topdown':
        this.animateCamera(new THREE.Vector3(0, 13.5, 0.01), new THREE.Vector3(0, 0, 0));
        break;
      case 'white':
        this.animateCamera(new THREE.Vector3(0, 8.0, 7.5), new THREE.Vector3(0, 0, 0));
        break;
      case 'black':
        this.animateCamera(new THREE.Vector3(0, 8.0, -7.5), new THREE.Vector3(0, 0, 0));
        break;
    }
  }

  private animateCamera(targetPos: THREE.Vector3, lookTarget: THREE.Vector3) {
    const startPos = this.camera.position.clone();
    const startTime = performance.now();
    const duration = 650;

    const animStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth easeInOutCubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.copy(lookTarget);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animStep);
      }
    };
    animStep();
  }

  public flipBoard(isFlipped: boolean) {
    if (isFlipped) {
      this.setCameraView('black');
    } else {
      this.setCameraView('white');
    }
  }

  // --- INTERACTION & CLICK PICKING ---
  private setupEvents() {
    const dom = this.renderer.domElement;

    let isDragging = false;
    let downX = 0;
    let downY = 0;

    dom.addEventListener('pointerdown', (e) => {
      isDragging = false;
      downX = e.clientX;
      downY = e.clientY;
    });

    dom.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) {
        isDragging = true;
      }
    });

    dom.addEventListener('pointerup', (e) => {
      if (!isDragging) {
        this.handleClick(e);
      }
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private handleClick(e: MouseEvent) {
    if (!this.onSquareClickCallback) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Raycast piece meshes
    const pieceMeshes = Array.from(this.piecesMap.values());
    const pieceIntersects = this.raycaster.intersectObjects(pieceMeshes, false);

    if (pieceIntersects.length > 0) {
      const clickedMesh = pieceIntersects[0].object as THREE.Mesh;
      const sq = clickedMesh.userData.square as Square;
      if (sq) {
        this.onSquareClickCallback(sq);
        return;
      }
    }

    // Raycast board mesh
    if (this.boardMesh) {
      const boardIntersects = this.raycaster.intersectObject(this.boardMesh, false);
      if (boardIntersects.length > 0) {
        const point = boardIntersects[0].point;
        const sq = this.positionToSquare(point);
        if (sq) {
          this.onSquareClickCallback(sq);
        }
      }
    }
  }

  public setOnSquareClick(cb: (square: Square) => void) {
    this.onSquareClickCallback = cb;
  }

  private onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --- ANIMATION LOOP ---
  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Update active move animations
    const now = performance.now();
    for (let i = this.activeMoveAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeMoveAnimations[i];
      const progress = Math.min((now - anim.startTime) / anim.duration, 1);

      // Smooth step
      const ease = progress * progress * (3 - 2 * progress);

      // Interpolate X & Z
      anim.mesh.position.x = THREE.MathUtils.lerp(anim.startPos.x, anim.endPos.x, ease);
      anim.mesh.position.z = THREE.MathUtils.lerp(anim.startPos.z, anim.endPos.z, ease);

      // Parabolic jump arc for Y
      const arcHeight = 0.75;
      anim.mesh.position.y = anim.startPos.y + Math.sin(progress * Math.PI) * arcHeight;

      if (progress >= 1) {
        anim.onComplete();
        this.activeMoveAnimations.splice(i, 1);
      }
    }

    // Pulse check indicator if present
    if (this.checkMesh) {
      const pulse = 0.65 + Math.sin(now * 0.007) * 0.25;
      (this.checkMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
