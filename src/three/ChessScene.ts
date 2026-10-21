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
  private contactShadowTex: THREE.Texture;
  private spritePlaneGeo: THREE.PlaneGeometry;

  // Board Plane for Raycasting
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
  private isFlipped = false;

  // Exact 0.40-pixel-accurate Camera Calibration solved directly from com.jetstartgames.chess 1080p screenshot
  private readonly PHOTO_CAMERA_FOV = 26.05;
  private readonly PHOTO_CAMERA_POS = new THREE.Vector3(0, 13.74, 9.282);
  private readonly PHOTO_CAMERA_TARGET = new THREE.Vector3(0, 0.22, 0.592);

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a110b);

    // 2. Camera (exact perspective calibration of com.jetstartgames.chess)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.PHOTO_CAMERA_FOV, aspect, 0.1, 100);
    this.camera.position.copy(this.PHOTO_CAMERA_POS);
    this.camera.lookAt(this.PHOTO_CAMERA_TARGET);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.contactShadowTex = TextureGenerator.createContactShadowTexture();

    // Shared 1.6x1.6 billboard geometry shifted +0.15 along local Y (exact extraction box of the 1080p sprites)
    this.spritePlaneGeo = new THREE.PlaneGeometry(1.6, 1.6);
    this.spritePlaneGeo.translate(0, 0.15, 0);

    // 4. Lighting
    this.setupLighting();

    // 5. Table & Board
    this.setupTableAndBoard();

    // 6. Highlights Group
    this.highlightGroup.renderOrder = 10;
    this.scene.add(this.highlightGroup);

    // 7. Interactivity
    this.setupInteractivity();

    // 8. Animation Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfffcf6, 1.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.3);
    keyLight.position.set(-3.2, 12.5, 4.8);
    this.scene.add(keyLight);

    try {
      const studioEnv = TextureGenerator.createStudioEnvironment(this.renderer);
      this.scene.environment = studioEnv.texture;
    } catch (e) {
      console.warn('Environment map warning:', e);
    }
  }

  private setupTableAndBoard() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Authentic 1080p Wood Plank Table (unlit so original photo colors are preserved 1:1)
    const tableTexture = TextureGenerator.createWoodTableTexture(maxAniso);
    const tableMat = new THREE.MeshBasicMaterial({
      map: tableTexture,
      toneMapped: false
    });
    const tableGeo = new THREE.PlaneGeometry(28, 28);
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.rotation.x = -Math.PI / 2;
    this.tableMesh.position.y = -0.22;
    this.scene.add(this.tableMesh);

    // 2. Authentic 1080p 3D Chessboard
    this.buildBoard();
  }

  private buildBoard() {
    if (this.boardMesh) {
      this.scene.remove(this.boardMesh);
      this.boardMesh.geometry.dispose();
      this.boardMesh = null;
    }

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    // 8.0 units for 64 squares + 50px border on each side out of 2048px -> 8.0 * 2048 / 1948 = 8.4107
    const boardWidth = 8.4107;
    const boardThickness = 0.44;
    const boardGeo = new THREE.BoxGeometry(boardWidth, boardThickness, boardWidth);

    const topTexture = TextureGenerator.createChessboardTexture(this.boardTheme, this.showCoordinates, maxAniso);
    const topMat = new THREE.MeshBasicMaterial({
      map: topTexture,
      toneMapped: false
    });

    // Dark walnut front/side bezel matching the bottom edge of the board in screen_2.png
    const sideMat = new THREE.MeshBasicMaterial({
      color: 0x261a12,
      toneMapped: false
    });

    const bottomMat = new THREE.MeshBasicMaterial({ color: 0x120a06, toneMapped: false });

    const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
    this.boardMesh = new THREE.Mesh(boardGeo, materials);
    this.boardMesh.position.y = 0;
    this.scene.add(this.boardMesh);
  }

  // --- MATERIAL FACTORY FOR OPTIONAL 3D THEMES ---
  private createPiece3DMaterial(color: Color): THREE.Material {
    const isWhite = color === 'w';

    switch (this.pieceTheme) {
      case 'liquid-glass': {
        if (isWhite) {
          return new THREE.MeshPhysicalMaterial({
            color: 0xf5faff,
            transmission: 0.94,
            opacity: 1,
            transparent: true,
            roughness: 0.03,
            ior: 1.54,
            thickness: 1.5,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0xffffff),
            attenuationColor: new THREE.Color(0xd2ecff),
            attenuationDistance: 2.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.03,
            envMapIntensity: 2.2
          });
        } else {
          return new THREE.MeshPhysicalMaterial({
            color: 0x121724,
            transmission: 0.86,
            opacity: 1,
            transparent: true,
            roughness: 0.05,
            ior: 1.56,
            thickness: 1.8,
            specularIntensity: 1.0,
            specularColor: new THREE.Color(0x88bbff),
            attenuationColor: new THREE.Color(0x182436),
            attenuationDistance: 1.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            envMapIntensity: 1.8
          });
        }
      }

      case 'emerald-jade': {
        return new THREE.MeshPhysicalMaterial({
          color: isWhite ? 0xe8f5e9 : 0x064e3b,
          transmission: 0.72,
          roughness: 0.11,
          ior: 1.53,
          thickness: 1.5
        });
      }

      case 'cyber-neon': {
        return new THREE.MeshStandardMaterial({
          color: isWhite ? 0x06b6d4 : 0x8b5cf6,
          emissive: isWhite ? 0x0891b2 : 0x7c3aed,
          emissiveIntensity: 0.35,
          roughness: 0.2
        });
      }

      default: {
        return new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: isWhite ? 0.32 : 0.24,
          metalness: 0.04
        });
      }
    }
  }

  /**
   * Positions the piece on the board and updates its billboard orientation,
   * depth-sorted renderOrder, and column-specific perspective sprite.
   */
  private setPiecePosition(mesh: THREE.Mesh, pos: THREE.Vector3) {
    mesh.position.copy(pos);

    if (this.pieceTheme === 'classic-wood') {
      // Align billboard plane with the camera image plane for 1:1 pixel match with com.jetstartgames.chess
      mesh.quaternion.copy(this.camera.quaternion);
      // Painter's algorithm back-to-front sorting by Z (front ranks draw on top of back ranks)
      mesh.renderOrder = 100 + Math.round((pos.z + 5.0) * 100) + Math.round((pos.y - 0.22) * 500);

      // Update column-specific perspective sprite if visual column (0..7) changed
      const visualFile = Math.max(0, Math.min(7, Math.round(pos.x + 3.5)));
      if (mesh.userData.visualFile !== visualFile) {
        mesh.userData.visualFile = visualFile;
        const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
        const tex = TextureGenerator.getPieceSpriteTexture(
          mesh.userData.type,
          mesh.userData.color,
          visualFile,
          maxAniso
        );
        (mesh.material as THREE.MeshBasicMaterial).map = tex;
        (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    } else {
      mesh.quaternion.identity();
      mesh.renderOrder = 100;
    }
  }

  // --- SQUARE / POSITION MAPPING ---
  public squareToPosition(square: Square): THREE.Vector3 {
    let file = square.charCodeAt(0) - 97;
    let rank = parseInt(square[1], 10) - 1;

    if (this.isFlipped) {
      file = 7 - file;
      rank = 7 - rank;
    }

    const squareSize = 1.0;
    const x = (file - 3.5) * squareSize;
    const z = (3.5 - rank) * squareSize;
    const y = 0.22;

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
            existingMesh.userData.color !== piece.color ||
            existingMesh.userData.theme !== this.pieceTheme;

          if (needsRecreate) {
            if (existingMesh) {
              this.scene.remove(existingMesh);
              this.piecesMap.delete(square);
            }
            this.createPieceMesh(square, piece.type, piece.color);
          } else {
            this.setPiecePosition(existingMesh, this.squareToPosition(square));
          }
        }
      }
    }

    for (const [sq, mesh] of this.piecesMap.entries()) {
      if (!activeSquares.has(sq)) {
        this.scene.remove(mesh);
        this.piecesMap.delete(sq);
      }
    }

    this.updateCheckIndicator(game);
  }

  private createPieceMesh(square: Square, type: PieceSymbol, color: Color): THREE.Mesh {
    const pos = this.squareToPosition(square);
    const visualFile = Math.max(0, Math.min(7, Math.round(pos.x + 3.5)));

    let mesh: THREE.Mesh;

    if (this.pieceTheme === 'classic-wood') {
      const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
      const spriteTex = TextureGenerator.getPieceSpriteTexture(type, color, visualFile, maxAniso);
      const mat = new THREE.MeshBasicMaterial({
        map: spriteTex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });
      mesh = new THREE.Mesh(this.spritePlaneGeo, mat);
    } else {
      const geom = StauntonGeometryFactory.getGeometry(type, color);
      const mat = this.createPiece3DMaterial(color);
      mesh = new THREE.Mesh(geom, mat);
    }

    mesh.userData = { square, type, color, theme: this.pieceTheme, visualFile };
    this.setPiecePosition(mesh, pos);

    this.scene.add(mesh);
    this.piecesMap.set(square, mesh);
    return mesh;
  }

  // --- ANIMATED PIECE MOVE ---
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
    const duration = 220;
    const tempPos = new THREE.Vector3();

    const animStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * progress * (3 - 2 * progress);

      tempPos.x = THREE.MathUtils.lerp(startPos.x, endPos.x, ease);
      tempPos.z = THREE.MathUtils.lerp(startPos.z, endPos.z, ease);
      tempPos.y = startPos.y + Math.sin(progress * Math.PI) * 0.25;
      this.setPiecePosition(mesh, tempPos);

      if (progress < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.setPiecePosition(mesh, endPos);
        if (onFinish) onFinish();
      }
    };
    animStep();
  }

  // --- HIGHLIGHTS ---
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

    if (this.lastFrom) this.addSquareTile(this.lastFrom, 0xf59e0b, 0.28);
    if (this.lastTo) this.addSquareTile(this.lastTo, 0xf59e0b, 0.36);

    if (this.selectedSquare) this.addSquareTile(this.selectedSquare, 0x10b981, 0.42);

    for (const sq of this.legalMoves) {
      const pos = this.squareToPosition(sq);
      const isCapture = this.piecesMap.has(sq);

      if (isCapture) {
        const ringGeo = new THREE.RingGeometry(0.30, 0.44, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.224, pos.z);
        ring.renderOrder = 12;
        this.highlightGroup.add(ring);
      } else {
        const dotGeo = new THREE.CircleGeometry(0.14, 24);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(pos.x, 0.224, pos.z);
        dot.renderOrder = 12;
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
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.222, pos.z);
    mesh.renderOrder = 11;
    this.highlightGroup.add(mesh);
  }

  // --- CHECK INDICATOR ---
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
          const ringGeo = new THREE.RingGeometry(0.20, 0.46, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xdc2626,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this.checkMesh = new THREE.Mesh(ringGeo, ringMat);
          this.checkMesh.rotation.x = -Math.PI / 2;
          this.checkMesh.position.set(pos.x, 0.225, pos.z);
          this.checkMesh.renderOrder = 15;
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
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });
    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.position.set(0, (len - 0.35) / 2, 0);
    shaft.renderOrder = 1500;

    const headGeo = new THREE.ConeGeometry(0.16, 0.35, 20);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, len - 0.18, 0);
    head.renderOrder = 1500;

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
    const themeChanged = this.pieceTheme !== pieceTheme;
    this.pieceTheme = pieceTheme;
    this.boardTheme = boardTheme;
    this.showCoordinates = showCoords;

    this.buildBoard();
    if (themeChanged) {
      const entries = Array.from(this.piecesMap.entries()).map(([sq, m]) => ({
        sq,
        type: m.userData.type as PieceSymbol,
        color: m.userData.color as Color
      }));
      for (const m of this.piecesMap.values()) {
        this.scene.remove(m);
      }
      this.piecesMap.clear();
      for (const item of entries) {
        this.createPieceMesh(item.sq, item.type, item.color);
      }
    }
    this.refreshHighlights();
  }

  // --- FLIP BOARD ---
  public flipBoard(isFlipped: boolean) {
    this.isFlipped = isFlipped;
    for (const [sq, mesh] of this.piecesMap.entries()) {
      this.setPiecePosition(mesh, this.squareToPosition(sq));
    }
    this.refreshHighlights();
  }

  // --- CAMERA MODES ---
  public setCameraMode(mode: 'photo' | 'topdown' | 'free3d') {
    if (mode === 'topdown') {
      this.camera.position.set(0, 19.5, 0.01);
      this.camera.lookAt(new THREE.Vector3(0, 0.22, 0));
    } else {
      this.camera.position.copy(this.PHOTO_CAMERA_POS);
      this.camera.lookAt(this.PHOTO_CAMERA_TARGET);
    }
    for (const [sq, mesh] of this.piecesMap.entries()) {
      this.setPiecePosition(mesh, this.squareToPosition(sq));
    }
  }

  // --- ACCURATE INTERACTION & DRAG-AND-DROP ---
  private setupInteractivity() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerDownCoord = { x: e.clientX, y: e.clientY };

      const sq = this.getSquareFromPointer(e);
      if (!sq) return;

      const pieceMesh = this.piecesMap.get(sq);

      if (this.selectedSquare && this.legalMoves.includes(sq)) {
        if (this.onMoveCallback) {
          this.onMoveCallback(this.selectedSquare, sq);
        }
        return;
      }

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

      if (this.isDragging && this.draggedMesh) {
        const boardIntersect = this.getBoardIntersect(e);
        if (boardIntersect) {
          this.setPiecePosition(
            this.draggedMesh,
            new THREE.Vector3(boardIntersect.x, 0.45, boardIntersect.z)
          );
        }
      }
    });

    const handlePointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.isDragging && this.draggedMesh && this.dragStartSquare) {
        const dropSquare = this.getSquareFromPointer(e);

        if (dropSquare && this.legalMoves.includes(dropSquare)) {
          const from = this.dragStartSquare;
          this.draggedMesh = null;
          this.dragStartSquare = null;
          if (this.onMoveCallback) {
            this.onMoveCallback(from, dropSquare);
          }
        } else {
          this.setPiecePosition(this.draggedMesh, this.dragStartPosition);
          this.draggedMesh = null;
          this.dragStartSquare = null;
        }
      } else {
        if (this.draggedMesh) {
          this.setPiecePosition(this.draggedMesh, this.dragStartPosition);
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
