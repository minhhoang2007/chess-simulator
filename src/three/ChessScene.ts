import * as THREE from 'three';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { BoardTheme, PieceTheme } from '../types/chess';
import { StauntonGeometryFactory } from './StauntonGeometry';
import { TextureGenerator } from './TextureGenerator';

export class ChessScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  // Meshes & Cache
  private piecesMap: Map<Square, THREE.Mesh> = new Map();
  private pieceTheme: PieceTheme = 'classic-wood';
  private boardTheme: BoardTheme = 'rustic-wood';
  private showCoordinates: boolean = true;
  private boardMesh: THREE.Mesh | null = null;
  private tableMesh: THREE.Mesh | null = null;
  private highlightGroup: THREE.Group = new THREE.Group();
  private hintMesh: THREE.Group | null = null;
  private checkMesh: THREE.Mesh | null = null;

  // Board Plane for Accurate Raycasting
  private boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.22);
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Interaction State
  private selectedSquare: Square | null = null;
  private legalMoves: Square[] = [];
  private draggedMesh: THREE.Mesh | null = null;
  private dragStartSquare: Square | null = null;
  private dragStartPosition = new THREE.Vector3();
  private isPointerDown = false;
  private pointerDownCoord = { x: 0, y: 0 };
  private isDragging = false;

  // Callbacks
  private onMoveCallback: ((from: Square, to: Square) => void) | null = null;
  private onSelectSquareCallback: ((square: Square) => void) | null = null;

  // Orientation
  private isFlipped = false; // false = White at bottom, true = Black at bottom

  // Subtle 3D Camera Angles (matching reference photo)
  private readonly PHOTO_CAMERA_POS = new THREE.Vector3(0, 13.5, 5.0);
  private readonly PHOTO_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a120c);

    // 2. Camera with Telephoto FOV (Subtle 3D, identical to reference image!)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    this.camera.position.copy(this.PHOTO_CAMERA_POS);
    this.camera.lookAt(this.PHOTO_CAMERA_TARGET);

    // 3. Renderer with realistic soft shadows & filmic tone
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 4. Studio Lighting (soft directional key + ambient + rim)
    this.setupLighting();

    // 5. Wood Table & 3D Chessboard Box
    this.setupTableAndBoard();

    // 6. Highlights & Markers
    this.scene.add(this.highlightGroup);

    // 7. Event Listeners for Raycasting & Drag-and-drop
    this.setupInteractivity();

    // 8. Render loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xfffaed, 0.95);
    this.scene.add(ambientLight);

    // Key light positioned slightly to the right & above (produces shadows matching photo)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 14, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0003;
    this.scene.add(keyLight);

    // Subtle back rim fill
    const rimLight = new THREE.DirectionalLight(0xd4e4f7, 0.8);
    rimLight.position.set(-5, 8, -6);
    this.scene.add(rimLight);

    // Studio Environment for glass reflections
    try {
      const studioEnv = TextureGenerator.createStudioEnvironment(this.renderer);
      this.scene.environment = studioEnv.texture;
    } catch (e) {
      console.warn('Environment map warning:', e);
    }
  }

  private setupTableAndBoard() {
    // Rustic Wood Table Background (matches the vertical plank wood in the user's photo)
    const tableTexture = TextureGenerator.createWoodTableTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.85,
      metalness: 0.05
    });
    const tableGeo = new THREE.PlaneGeometry(32, 32);
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.rotation.x = -Math.PI / 2;
    this.tableMesh.position.y = -0.22;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // 3D Chessboard Box
    this.buildBoard();
  }

  private buildBoard() {
    if (this.boardMesh) {
      this.scene.remove(this.boardMesh);
      this.boardMesh.geometry.dispose();
      this.boardMesh = null;
    }

    const boardWidth = 8.7;
    const boardThickness = 0.44;
    const boardGeo = new THREE.BoxGeometry(boardWidth, boardThickness, boardWidth);

    // Top face is checkerboard with coordinates
    const boardTopTexture = TextureGenerator.createChessboardTexture(this.boardTheme, this.showCoordinates);
    const topMat = new THREE.MeshStandardMaterial({
      map: boardTopTexture,
      roughness: 0.32,
      metalness: 0.04
    });

    // Sides are dark warm mahogany bevel
    const sideMat = new THREE.MeshStandardMaterial({
      color: this.boardTheme === 'obsidian-marble' ? 0x111827 : (this.boardTheme === 'tournament-blue' ? 0x1e3a5f : 0x3e2316),
      roughness: 0.4,
      metalness: 0.08
    });

    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x100b08, roughness: 0.9 });

    // Order: +X, -X, +Y, -Y, +Z, -Z
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
      case 'classic-wood': {
        // Authentic Polished Wood (Ivory cream & dark charcoal walnut - matching the photo!)
        if (isWhite) {
          return new THREE.MeshStandardMaterial({
            color: 0xf5eedb,
            roughness: 0.22,
            metalness: 0.05
          });
        } else {
          return new THREE.MeshStandardMaterial({
            color: 0x221a16,
            roughness: 0.25,
            metalness: 0.05
          });
        }
      }

      case 'liquid-glass': {
        // High refraction transmission glass
        if (isWhite) {
          return new THREE.MeshPhysicalMaterial({
            color: 0xf4f9ff,
            transmission: 0.94,
            opacity: 1,
            transparent: true,
            roughness: 0.04,
            ior: 1.54,
            thickness: 1.4,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0xffffff),
            attenuationColor: new THREE.Color(0xd2eaff),
            attenuationDistance: 2.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            envMapIntensity: 2.2
          });
        } else {
          return new THREE.MeshPhysicalMaterial({
            color: 0x121724,
            transmission: 0.86,
            opacity: 1,
            transparent: true,
            roughness: 0.06,
            ior: 1.56,
            thickness: 1.8,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0x88bbff),
            attenuationColor: new THREE.Color(0x182436),
            attenuationDistance: 1.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.8
          });
        }
      }

      case 'emerald-jade': {
        if (isWhite) {
          return new THREE.MeshPhysicalMaterial({
            color: 0xe8f5e9,
            transmission: 0.72,
            roughness: 0.12,
            ior: 1.52,
            thickness: 1.4
          });
        } else {
          return new THREE.MeshPhysicalMaterial({
            color: 0x064e3b,
            transmission: 0.70,
            roughness: 0.1,
            ior: 1.54,
            thickness: 1.6
          });
        }
      }

      case 'cyber-neon': {
        if (isWhite) {
          return new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x0891b2,
            emissiveIntensity: 0.35,
            roughness: 0.2
          });
        } else {
          return new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x7c3aed,
            emissiveIntensity: 0.35,
            roughness: 0.2
          });
        }
      }
    }
  }

  // --- SQUARE / POSITION MAPPING ---
  public squareToPosition(square: Square): THREE.Vector3 {
    let file = square.charCodeAt(0) - 97; // 0..7
    let rank = parseInt(square[1], 10) - 1; // 0..7

    if (this.isFlipped) {
      file = 7 - file;
      rank = 7 - rank;
    }

    const squareSize = 1.0;
    const x = (file - 3.5) * squareSize;
    const z = (3.5 - rank) * squareSize;
    const y = 0.22; // rests on board surface

    return new THREE.Vector3(x, y, z);
  }

  public positionToSquare(pos: THREE.Vector3): Square | null {
    const squareSize = 1.0;
    let fileIndex = Math.round(pos.x / squareSize + 3.5);
    let rankIndex = Math.round(3.5 - pos.z / squareSize);

    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
      return null;
    }

    if (this.isFlipped) {
      fileIndex = 7 - fileIndex;
      rankIndex = 7 - rankIndex;
    }

    const file = String.fromCharCode(97 + fileIndex);
    const rank = (rankIndex + 1).toString();
    return `${file}${rank}` as Square;
  }

  // --- BOARD SYNC ---
  public updateBoard(game: Chess) {
    const currentBoard = game.board();
    const activeSquares = new Set<Square>();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece) {
          const square = piece.square;
          activeSquares.add(square);

          const existingMesh = this.piecesMap.get(square);
          const needsRecreate = !existingMesh ||
            existingMesh.userData.type !== piece.type ||
            existingMesh.userData.color !== piece.color;

          if (needsRecreate) {
            if (existingMesh) {
              this.scene.remove(existingMesh);
              this.piecesMap.delete(square);
            }
            this.createPieceMesh(square, piece.type, piece.color);
          } else {
            // Ensure position is updated (in case board flipped)
            const targetPos = this.squareToPosition(square);
            existingMesh.position.copy(targetPos);
          }
        }
      }
    }

    // Remove deleted pieces
    for (const [sq, mesh] of this.piecesMap.entries()) {
      if (!activeSquares.has(sq)) {
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

    mesh.position.copy(this.squareToPosition(square));

    // Orientation: Knights face inward toward the opponent
    if (type === 'n') {
      mesh.rotation.y = color === 'w' ? 0 : Math.PI;
    }

    this.scene.add(mesh);
    this.piecesMap.set(square, mesh);
    return mesh;
  }

  // --- MOVE ANIMATION ---
  public animateMove(from: Square, to: Square, onFinish?: () => void) {
    const mesh = this.piecesMap.get(from);
    if (!mesh) {
      if (onFinish) onFinish();
      return;
    }

    const targetPiece = this.piecesMap.get(to);
    if (targetPiece) {
      this.scene.remove(targetPiece);
      this.piecesMap.delete(to);
    }

    this.piecesMap.delete(from);
    this.piecesMap.set(to, mesh);
    mesh.userData.square = to;

    const startPos = mesh.position.clone();
    const endPos = this.squareToPosition(to);
    const startTime = performance.now();
    const duration = 260; // crisp, responsive 260ms animation

    const animStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * progress * (3 - 2 * progress);

      mesh.position.x = THREE.MathUtils.lerp(startPos.x, endPos.x, ease);
      mesh.position.z = THREE.MathUtils.lerp(startPos.z, endPos.z, ease);
      mesh.position.y = startPos.y + Math.sin(progress * Math.PI) * 0.45;

      if (progress < 1) {
        requestAnimationFrame(animStep);
      } else {
        mesh.position.copy(endPos);
        if (onFinish) onFinish();
      }
    };
    animStep();
  }

  // --- HIGHLIGHTS (LEGAL MOVES, LAST MOVE, SELECTED) ---
  public setSelection(selected: Square | null, legal: Square[]) {
    this.selectedSquare = selected;
    this.legalMoves = legal;
    this.refreshHighlights();
  }

  public setLastMove(from: Square | null, to: Square | null) {
    this.lastFrom = from;
    this.lastTo = to;
    this.refreshHighlights();
  }
  private lastFrom: Square | null = null;
  private lastTo: Square | null = null;

  private refreshHighlights() {
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    // 1. Last move tiles (soft golden glow)
    if (this.lastFrom) {
      this.addSquareTile(this.lastFrom, 0xf59e0b, 0.32);
    }
    if (this.lastTo) {
      this.addSquareTile(this.lastTo, 0xf59e0b, 0.42);
    }

    // 2. Selected square
    if (this.selectedSquare) {
      this.addSquareTile(this.selectedSquare, 0x10b981, 0.48);
    }

    // 3. Legal move dots and capture rings
    for (const sq of this.legalMoves) {
      const pos = this.squareToPosition(sq);
      const isCapture = this.piecesMap.has(sq);

      if (isCapture) {
        // Red capture ring
        const ringGeo = new THREE.RingGeometry(0.30, 0.42, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.224, pos.z);
        this.highlightGroup.add(ring);
      } else {
        // Green legal destination dot
        const dotGeo = new THREE.CircleGeometry(0.14, 24);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(pos.x, 0.224, pos.z);
        this.highlightGroup.add(dot);
      }
    }
  }

  private addSquareTile(sq: Square, color: number, opacity: number) {
    const pos = this.squareToPosition(sq);
    const planeGeo = new THREE.PlaneGeometry(0.96, 0.96);
    const planeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.222, pos.z);
    this.highlightGroup.add(mesh);
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
      for (const [sq, mesh] of this.piecesMap.entries()) {
        if (mesh.userData.type === 'k' && mesh.userData.color === turn) {
          const pos = this.squareToPosition(sq);
          const ringGeo = new THREE.RingGeometry(0.18, 0.44, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xdc2626,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
          });
          this.checkMesh = new THREE.Mesh(ringGeo, ringMat);
          this.checkMesh.rotation.x = -Math.PI / 2;
          this.checkMesh.position.set(pos.x, 0.225, pos.z);
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
    const len = dir.length();
    dir.normalize();

    const group = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, len - 0.35, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8
    });
    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.position.set(0, (len - 0.35) / 2, 0);

    const headGeo = new THREE.ConeGeometry(0.16, 0.35, 20);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, len - 0.18, 0);

    group.add(shaft);
    group.add(head);

    group.position.copy(pFrom);
    group.position.y += 0.32;
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    this.hintMesh = group;
    this.scene.add(this.hintMesh);
  }

  public clearHint() {
    if (this.hintMesh) {
      this.scene.remove(this.hintMesh);
      this.hintMesh = null;
    }
  }

  // --- THEME UPDATES ---
  public setTheme(pieceTheme: PieceTheme, boardTheme: BoardTheme, showCoords: boolean) {
    this.pieceTheme = pieceTheme;
    this.boardTheme = boardTheme;
    this.showCoordinates = showCoords;

    this.buildBoard();
    for (const mesh of this.piecesMap.values()) {
      mesh.material = this.createPieceMaterial(mesh.userData.color);
    }
    this.refreshHighlights();
  }

  // --- FLIP BOARD ---
  public flipBoard(isFlipped: boolean) {
    this.isFlipped = isFlipped;
    // Update all pieces to their new rotated positions
    for (const [sq, mesh] of this.piecesMap.entries()) {
      mesh.position.copy(this.squareToPosition(sq));
    }
    this.refreshHighlights();
  }

  // --- CAMERA MODES ---
  public setCameraMode(mode: 'photo' | 'topdown' | 'free3d') {
    if (mode === 'photo') {
      this.camera.position.copy(this.PHOTO_CAMERA_POS);
      this.camera.lookAt(this.PHOTO_CAMERA_TARGET);
    } else if (mode === 'topdown') {
      this.camera.position.set(0, 15, 0.01);
      this.camera.lookAt(this.PHOTO_CAMERA_TARGET);
    } else {
      this.camera.position.set(0, 11, 6.5);
      this.camera.lookAt(this.PHOTO_CAMERA_TARGET);
    }
  }

  // --- ACCURATE SQUARE-BASED INTERACTIVITY & DRAG-AND-DROP ---
  private setupInteractivity() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerDownCoord = { x: e.clientX, y: e.clientY };

      const sq = this.getSquareFromPointer(e);
      if (!sq) return;

      const pieceMesh = this.piecesMap.get(sq);

      // If clicked a square with legal move while a piece was selected, execute!
      if (this.selectedSquare && this.legalMoves.includes(sq)) {
        if (this.onMoveCallback) {
          this.onMoveCallback(this.selectedSquare, sq);
        }
        return;
      }

      // If clicked a friendly piece, initiate drag & selection
      if (pieceMesh) {
        this.dragStartSquare = sq;
        this.draggedMesh = pieceMesh;
        this.dragStartPosition.copy(pieceMesh.position);

        if (this.onSelectSquareCallback) {
          this.onSelectSquareCallback(sq);
        }
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;

      const dx = Math.abs(e.clientX - this.pointerDownCoord.x);
      const dy = Math.abs(e.clientY - this.pointerDownCoord.y);

      if (dx > 4 || dy > 4) {
        this.isDragging = true;
      }

      // Smooth piece drag follow
      if (this.isDragging && this.draggedMesh) {
        const boardIntersect = this.getBoardIntersect(e);
        if (boardIntersect) {
          this.draggedMesh.position.x = boardIntersect.x;
          this.draggedMesh.position.z = boardIntersect.z;
          this.draggedMesh.position.y = 0.65; // elevated while dragged
        }
      }
    });

    const handlePointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.isDragging && this.draggedMesh && this.dragStartSquare) {
        const dropSquare = this.getSquareFromPointer(e);

        if (dropSquare && this.legalMoves.includes(dropSquare)) {
          // Drop onto valid destination square!
          const from = this.dragStartSquare;
          this.draggedMesh = null;
          this.dragStartSquare = null;
          if (this.onMoveCallback) {
            this.onMoveCallback(from, dropSquare);
          }
        } else {
          // Snap back to start position
          this.draggedMesh.position.copy(this.dragStartPosition);
          this.draggedMesh = null;
          this.dragStartSquare = null;
        }
      } else {
        // Simple click without drag
        if (this.draggedMesh) {
          this.draggedMesh.position.copy(this.dragStartPosition);
          this.draggedMesh = null;
          this.dragStartSquare = null;
        }
      }
    };

    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointercancel', handlePointerUp);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private getBoardIntersect(e: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.boardPlane, target);
    return hit ? target : null;
  }

  private getSquareFromPointer(e: MouseEvent): Square | null {
    const pt = this.getBoardIntersect(e);
    if (!pt) return null;
    return this.positionToSquare(pt);
  }

  public setCallbacks(
    onSelect: (square: Square) => void,
    onMove: (from: Square, to: Square) => void
  ) {
    this.onSelectSquareCallback = onSelect;
    this.onMoveCallback = onMove;
  }

  private onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.checkMesh) {
      const pulse = 0.65 + Math.sin(performance.now() * 0.008) * 0.25;
      (this.checkMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
