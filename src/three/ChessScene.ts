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
  private boardTheme: BoardTheme = 'tournament-blue';
  private showCoordinates: boolean = true;
  private boardMesh: THREE.Mesh | null = null;
  private tableMesh: THREE.Mesh | null = null;
  private highlightGroup: THREE.Group = new THREE.Group();
  private hintMesh: THREE.Group | null = null;
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
  private dragTargetPosition = new THREE.Vector3();
  private isPointerDown = false;
  private pointerDownCoord = { x: 0, y: 0 };
  private isDragging = false;

  // Smooth Touchpad / Pinch Zoom State
  private zoomScale = 1.0;
  private targetZoomScale = 1.0;
  private readonly MIN_ZOOM = 0.68;
  private readonly MAX_ZOOM = 1.55;
  private pinchStartDist: number | null = null;
  private pinchStartZoom = 1.0;

  // Callbacks
  private onMoveCallback: ((from: Square, to: Square) => void) | null = null;
  private onSelectSquareCallback: ((square: Square) => void) | null = null;
  private onCameraChangeCallback: (() => void) | null = null;

  // Orientation
  private isFlipped = false;

  // Calibrated Camera Perspective (FOV 29.2 makes the board slightly smaller & sleeker on the stone table)
  private readonly PHOTO_CAMERA_FOV = 29.2;
  private readonly PHOTO_CAMERA_POS = new THREE.Vector3(0, 13.74, 9.282);
  private readonly PHOTO_CAMERA_TARGET = new THREE.Vector3(0, 0.22, 0.592);

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16171a);

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

    // Matching 3D side bezel color for each board theme
    const sideColor =
      this.boardTheme === 'tournament-blue'
        ? 0x15273e
        : this.boardTheme === 'obsidian-marble'
        ? 0x161f2e
        : 0x261a12;
    const sideMat = new THREE.MeshBasicMaterial({
      color: sideColor,
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

  // --- BOARD SYNC & CLEAR ---
  public clearBoard() {
    for (const mesh of this.piecesMap.values()) {
      this.scene.remove(mesh);
    }
    this.piecesMap.clear();
    this.refreshHighlights();
    this.clearHint();
  }

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
  }

  /**
   * Ultra-fast cascaded setup animation ("sắp lần lượt các quân nhưng cực nhanh")
   * Total duration ~450ms. Pieces drop onto the board with a slight snappy bounce.
   */
  public animateBoardSetup(game: Chess, onFinish?: () => void) {
    this.clearBoard();

    const currentBoard = game.board();
    const piecesToSpawn: { square: Square; type: PieceSymbol; color: Color; rankIdx: number; fileIdx: number }[] = [];

    // Collect all pieces to setup
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentBoard[r][c];
        if (p) {
          piecesToSpawn.push({
            square: p.square,
            type: p.type,
            color: p.color,
            rankIdx: r,
            fileIdx: c
          });
        }
      }
    }

    // Sort order: Back ranks first (Black back rank, White back rank), then pawns (Black pawns, White pawns)
    // or rank by rank from outside inward so it looks like an authentic tournament setup
    // Rank 8 & Rank 1 (royals/officers), then Rank 7 & Rank 2 (pawns)
    piecesToSpawn.sort((a, b) => {
      const getPriority = (rankIdx: number) => {
        if (rankIdx === 0 || rankIdx === 7) return 0; // Back rank officers
        return 1; // Pawns
      };
      const prioDiff = getPriority(a.rankIdx) - getPriority(b.rankIdx);
      if (prioDiff !== 0) return prioDiff;
      // Along the rank, sort symmetrically from outside (rooks -> knights -> bishops -> royalty)
      const distFromCenterA = Math.abs(a.fileIdx - 3.5);
      const distFromCenterB = Math.abs(b.fileIdx - 3.5);
      return distFromCenterB - distFromCenterA;
    });

    const totalPieces = piecesToSpawn.length;
    let placedCount = 0;
    const staggerIntervalMs = 11; // Extremely fast stagger (~11ms between each piece spawn)
    const dropDurationMs = 120; // Fast snappy drop duration

    piecesToSpawn.forEach((item, index) => {
      setTimeout(() => {
        const mesh = this.createPieceMesh(item.square, item.type, item.color);
        const targetPos = this.squareToPosition(item.square);
        const dropHeight = 1.35; // Drops from 1.35 units above the board

        // Spawn high and transparent/scaled if needed
        mesh.position.set(targetPos.x, targetPos.y + dropHeight, targetPos.z);
        if (mesh.userData.shadowMesh) {
          mesh.userData.shadowMesh.position.set(targetPos.x, 0.221, targetPos.z);
          mesh.userData.shadowMesh.scale.set(0.3, 0.3, 0.3);
        }

        const startTime = performance.now();
        const animStep = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / dropDurationMs, 1);

          // Snappy overshoot bounce easing: starts fast, lands, tiny micro-bounce
          // EaseOutBack-style bounce
          const c1 = 1.4;
          const c3 = c1 + 1;
          const p = 1 - progress;
          const easeBounce = 1 - (p * p * (c3 * p - c1));

          const curY = targetPos.y + dropHeight * (1 - Math.min(1.08, easeBounce));
          this.setPiecePosition(mesh, new THREE.Vector3(targetPos.x, curY, targetPos.z));

          if (mesh.userData.shadowMesh) {
            const shadowScale = 0.3 + 0.7 * Math.min(1, easeBounce);
            mesh.userData.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
          }

          if (progress < 1) {
            requestAnimationFrame(animStep);
          } else {
            this.setPiecePosition(mesh, targetPos);
            placedCount++;
            if (placedCount >= totalPieces && onFinish) {
              onFinish();
            }
          }
        };
        requestAnimationFrame(animStep);
      }, index * staggerIntervalMs);
    });
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

  // --- ANIMATED PIECE MOVE (Silky 60-120fps quintic glide) ---
  public animateMove(from: Square, to: Square, onFinish?: () => void) {
    const mesh = this.piecesMap.get(from);
    if (!mesh) {
      if (onFinish) onFinish();
      return;
    }

    const targetPiece = this.piecesMap.get(to);
    if (targetPiece && targetPiece !== mesh) {
      this.scene.remove(targetPiece);
      this.piecesMap.delete(to);
    }

    this.piecesMap.delete(from);
    this.piecesMap.set(to, mesh);
    mesh.userData.square = to;

    const startPos = mesh.position.clone();
    const endPos = this.squareToPosition(to);
    const dist = startPos.distanceTo(endPos);
    const startTime = performance.now();
    // 1.5x slightly more deliberate, elegant glide speed so human eye can follow bot moving piece easily
    // (~300ms - 420ms duration)
    const baseDuration = dist < 0.6 ? 180 : Math.min(420, Math.max(300, 260 + dist * 22));
    const duration = baseDuration;
    const arcHeight = dist < 0.6 ? 0.03 : Math.min(0.18, 0.08 + dist * 0.016);
    const tempPos = new THREE.Vector3();

    const animStep = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quintic ease-out for ultra-smooth deceleration as the piece settles on the square
      const inv = 1 - progress;
      const ease = 1 - inv * inv * inv * inv;

      tempPos.x = THREE.MathUtils.lerp(startPos.x, endPos.x, ease);
      tempPos.z = THREE.MathUtils.lerp(startPos.z, endPos.z, ease);
      tempPos.y = THREE.MathUtils.lerp(startPos.y, endPos.y, ease) + Math.sin(progress * Math.PI) * arcHeight;
      this.setPiecePosition(mesh, tempPos);

      if (progress < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.setPiecePosition(mesh, endPos);
        if (onFinish) onFinish();
      }
    };
    requestAnimationFrame(animStep);
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

    // No hazy/dimming square tiles covering the pieces or wood!
    // The wooden board and piece textures remain 100% crisp and un-dimmed.

    for (const sq of this.legalMoves) {
      const pos = this.squareToPosition(sq);
      const isCapture = this.piecesMap.has(sq);

      if (isCapture) {
        const ringGeo = new THREE.RingGeometry(0.35, 0.46, 36);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.224, pos.z);
        ring.renderOrder = 12;
        this.highlightGroup.add(ring);
      } else {
        const dotGeo = new THREE.CircleGeometry(0.145, 28);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.22,
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
    const planeGeo = new THREE.PlaneGeometry(0.98, 0.98);
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

  /**
   * Projects the top-right corner of the King on `square` into 2D screen coordinates (px)
   * for the Chess.com-style Checkmate badge & popup.
   */
  public getKingTopRightScreenPosition(square: Square): { x: number; y: number } | null {
    if (!this.container) return null;
    const pos = this.squareToPosition(square);
    // Top-right corner above the King's crown in world space
    const worldPt = new THREE.Vector3(pos.x + 0.36, pos.y + 0.68, pos.z - 0.36);
    worldPt.project(this.camera);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const x = (worldPt.x * 0.5 + 0.5) * width;
    const y = (-worldPt.y * 0.5 + 0.5) * height;
    return { x, y };
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
      color: 0x81b64c,
      transparent: true,
      opacity: 0.88,
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
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  // --- CAMERA MODES & ZOOM ---
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
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  public setPreviewMode(isPreview: boolean) {
    if (isPreview) {
      this.targetZoomScale = 0.72; // Compact, zoomed-out board preview on starting interface
      if (this.zoomScale === 1.0) {
        this.zoomScale = 0.72;
        this.camera.fov = this.PHOTO_CAMERA_FOV / this.zoomScale;
        this.camera.updateProjectionMatrix();
        if (this.onCameraChangeCallback) this.onCameraChangeCallback();
      }
    } else {
      this.targetZoomScale = 1.0; // Smoothly glide into standard playing size
    }
  }

  public adjustZoom(deltaScale: number) {
    this.targetZoomScale = THREE.MathUtils.clamp(
      this.targetZoomScale + deltaScale,
      this.MIN_ZOOM,
      this.MAX_ZOOM
    );
  }

  public resetZoom() {
    this.targetZoomScale = 1.0;
  }

  // --- ACCURATE INTERACTION, SMOOTH DRAG & TOUCHPAD PINCH ZOOM ---
  private setupInteractivity() {
    const dom = this.renderer.domElement;

    // 1. Touchpad Two-Finger Pinch & Two-Finger Scroll Zoom
    dom.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        // macOS trackpad pinch sets e.ctrlKey = true with smaller deltaY; two-finger scroll has larger deltaY
        const sensitivity = e.ctrlKey ? 0.0085 : 0.0018;
        const delta = -e.deltaY * sensitivity;
        this.targetZoomScale = THREE.MathUtils.clamp(
          this.targetZoomScale + delta,
          this.MIN_ZOOM,
          this.MAX_ZOOM
        );
      },
      { passive: false }
    );

    // 2. Touch Pinch-to-Zoom for multi-touch devices
    dom.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.pinchStartDist = Math.hypot(dx, dy);
          this.pinchStartZoom = this.targetZoomScale;
        }
      },
      { passive: true }
    );

    dom.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length === 2 && this.pinchStartDist && this.pinchStartDist > 10) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const ratio = dist / this.pinchStartDist;
          this.targetZoomScale = THREE.MathUtils.clamp(
            this.pinchStartZoom * ratio,
            this.MIN_ZOOM,
            this.MAX_ZOOM
          );
        }
      },
      { passive: false }
    );

    dom.addEventListener('touchend', () => {
      this.pinchStartDist = null;
    });

    // 3. Pointer Down / Drag / Click-to-Move
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
        this.dragTargetPosition.copy(pieceMesh.position);

        if (this.onSelectSquareCallback) {
          this.onSelectSquareCallback(sq);
        }
      } else {
        if (this.onSelectSquareCallback) {
          this.onSelectSquareCallback(sq);
        }
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;

      const dx = Math.abs(e.clientX - this.pointerDownCoord.x);
      const dy = Math.abs(e.clientY - this.pointerDownCoord.y);

      if (dx > 3 || dy > 3) {
        this.isDragging = true;
      }

      if (this.isDragging && this.draggedMesh) {
        const boardIntersect = this.getBoardIntersect(e);
        if (boardIntersect) {
          this.dragTargetPosition.set(boardIntersect.x, 0.32, boardIntersect.z);
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
    onMove: (from: Square, to: Square) => void,
    onCameraChange?: () => void
  ) {
    this.onSelectSquareCallback = onSelect;
    this.onMoveCallback = onMove;
    this.onCameraChangeCallback = onCameraChange || null;
  }

  private onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smoothly damp touchpad zoom
    if (Math.abs(this.targetZoomScale - this.zoomScale) > 0.0005) {
      this.zoomScale += (this.targetZoomScale - this.zoomScale) * 0.22;
      this.camera.fov = this.PHOTO_CAMERA_FOV / this.zoomScale;
      this.camera.updateProjectionMatrix();
      if (this.onCameraChangeCallback) this.onCameraChangeCallback();
    }

    // Smoothly interpolate dragged piece toward cursor for zero-jitter dragging
    if (this.isDragging && this.draggedMesh) {
      const cur = this.draggedMesh.position;
      const nextPos = new THREE.Vector3(
        THREE.MathUtils.lerp(cur.x, this.dragTargetPosition.x, 0.48),
        THREE.MathUtils.lerp(cur.y, this.dragTargetPosition.y, 0.48),
        THREE.MathUtils.lerp(cur.z, this.dragTargetPosition.z, 0.48)
      );
      this.setPiecePosition(this.draggedMesh, nextPos);
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
