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
  private boardShadowMesh: THREE.Mesh | null = null;
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
  private playerColor: Color = 'w';
  private canInteract = true;

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

    // 1. Scene with clean cafe background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161512);

    // 2. Camera (exact perspective calibration of com.jetstartgames.chess)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.PHOTO_CAMERA_FOV, aspect, 0.1, 100);
    this.camera.position.copy(this.PHOTO_CAMERA_POS);
    this.camera.lookAt(this.PHOTO_CAMERA_TARGET);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
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
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.55);
    this.scene.add(ambientLight);

    // Warm directional keylight matching table angle and board surface
    const keyLight = new THREE.DirectionalLight(0xfff2dc, 1.4);
    keyLight.position.set(-3.5, 13.5, 4.8);
    this.scene.add(keyLight);

    // Soft fill light
    const fillLight = new THREE.DirectionalLight(0xdde8f5, 0.55);
    fillLight.position.set(4.0, 9.0, 5.5);
    this.scene.add(fillLight);

    try {
      const studioEnv = TextureGenerator.createStudioEnvironment(this.renderer);
      this.scene.environment = studioEnv.texture;
    } catch (e) {
      console.warn('Environment map warning:', e);
    }
  }

  private setupTableAndBoard() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. High-resolution solid luxury dark walnut wooden table
    const tableTexture = TextureGenerator.createWoodTableTexture(maxAniso);
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.62,
      metalness: 0.02
    });
    // Solid 3D tabletop with realistic thickness and front bevel
    const tableGeo = new THREE.BoxGeometry(26, 0.6, 26);
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    // Tabletop surface sits exactly at y = -0.221 (just 0.001 below the chessboard bottom at y = -0.220)
    this.tableMesh.position.set(0, -0.521, 0.2);
    this.scene.add(this.tableMesh);

    // 2. Realistic triple-layer ambient occlusion & directional contact shadow
    // Firmly grounding the 3D board onto the wooden tabletop
    const shadowTex = TextureGenerator.createBoardShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.94,
      depthWrite: false
    });
    const shadowGeo = new THREE.PlaneGeometry(12.0, 12.0);
    this.boardShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.boardShadowMesh.rotation.x = -Math.PI / 2;
    this.boardShadowMesh.position.set(0, -0.2205, 0);
    this.scene.add(this.boardShadowMesh);

    // 3. Authentic 1080p 3D Chessboard
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

    // Solid dark walnut wood bevel matching the luxury tabletop
    const sideColor =
      this.boardTheme === 'tournament-blue'
        ? 0x22150d // Deep dark walnut wood bevel
        : this.boardTheme === 'obsidian-marble'
        ? 0x161f2e
        : 0x341f14;
    const sideMat = new THREE.MeshBasicMaterial({
      color: sideColor,
      toneMapped: false
    });

    const bottomMat = new THREE.MeshBasicMaterial({ color: 0x110a06, toneMapped: false });

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
  private setupTimeouts: number[] = [];

  public clearBoard() {
    for (const id of this.setupTimeouts) {
      window.clearTimeout(id);
    }
    this.setupTimeouts = [];

    for (const mesh of this.piecesMap.values()) {
      this.scene.remove(mesh);
    }
    this.piecesMap.clear();
    this.refreshHighlights();
    this.clearHint();
  }

  private cancelActiveDrag() {
    if (this.draggedMesh && this.dragStartSquare) {
      this.setPiecePosition(this.draggedMesh, this.squareToPosition(this.dragStartSquare));
    }
    this.draggedMesh = null;
    this.dragStartSquare = null;
    this.isDragging = false;
    this.isPointerDown = false;
  }

  public setInteractionState(playerColor: Color, canInteract: boolean) {
    this.playerColor = playerColor;
    this.canInteract = canInteract;
    if (!canInteract) {
      this.cancelActiveDrag();
    }
  }

  public updateBoard(game: Chess) {
    this.cancelActiveDrag();
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
              existingMesh.userData.animId = (existingMesh.userData.animId || 0) + 1;
              this.scene.remove(existingMesh);
              this.piecesMap.delete(square);
            }
            this.createPieceMesh(square, piece.type, piece.color);
          } else {
            existingMesh.userData.animId = (existingMesh.userData.animId || 0) + 1;
            existingMesh.userData.square = square;
            this.setPiecePosition(existingMesh, this.squareToPosition(square));
          }
        }
      }
    }

    for (const [sq, mesh] of this.piecesMap.entries()) {
      if (!activeSquares.has(sq)) {
        mesh.userData.animId = (mesh.userData.animId || 0) + 1;
        this.scene.remove(mesh);
        this.piecesMap.delete(sq);
      }
    }
  }

  /**
   * Mature, weighted tournament piece lock-in setup animation:
   * - Zero cartoon squash/stretch, zero bounce, zero ripple rings.
   * - Solid 1:1 proportions: each pair glides in from a subtle height with a sharp quintic
   *   magnetic deceleration and locks dead-stop onto its square with a muted weighted wood thud.
   * - Strict sequential order:
   *   a1/a8 -> b1/b8 -> ... -> h1/h8 -> h2/h7 -> ... -> a2/a7
   */
  public animateBoardSetup(
    game: Chess,
    onFinish?: () => void,
    onStepLand?: (stepIndex: number) => void
  ) {
    this.clearBoard();

    const whiteOrder: Square[] = [
      'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
      'h2', 'g2', 'f2', 'e2', 'd2', 'c2', 'b2', 'a2'
    ];
    const blackOrder: Square[] = [
      'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
      'h7', 'g7', 'f7', 'e7', 'd7', 'c7', 'b7', 'a7'
    ];

    const currentBoard = game.board();
    const boardPieceMap = new Map<Square, { type: PieceSymbol; color: Color }>();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentBoard[r][c];
        if (p) {
          boardPieceMap.set(p.square, { type: p.type, color: p.color });
        }
      }
    }

    const totalSteps = whiteOrder.length; // 16 steps
    let finishedSteps = 0;
    const stepIntervalMs = 56; // Crisp sequential cadence
    const glideDurationMs = 88; // Sharp weighted lock-in duration

    for (let i = 0; i < totalSteps; i++) {
      const wSq = whiteOrder[i];
      const bSq = blackOrder[i];
      const wPiece = boardPieceMap.get(wSq);
      const bPiece = boardPieceMap.get(bSq);

      const timeoutId = window.setTimeout(() => {
        const spawnedMeshes: {
          mesh: THREE.Mesh;
          startPos: THREE.Vector3;
          targetPos: THREE.Vector3;
        }[] = [];

        if (wPiece) {
          const mesh = this.createPieceMesh(wSq, wPiece.type, wPiece.color);
          const targetPos = this.squareToPosition(wSq);
          const zDir = targetPos.z >= 0 ? 1 : -1;
          const startPos = new THREE.Vector3(
            targetPos.x,
            targetPos.y + 0.34,
            targetPos.z + zDir * 0.16
          );
          spawnedMeshes.push({ mesh, startPos, targetPos });
        }
        if (bPiece) {
          const mesh = this.createPieceMesh(bSq, bPiece.type, bPiece.color);
          const targetPos = this.squareToPosition(bSq);
          const zDir = targetPos.z >= 0 ? 1 : -1;
          const startPos = new THREE.Vector3(
            targetPos.x,
            targetPos.y + 0.34,
            targetPos.z + zDir * 0.16
          );
          spawnedMeshes.push({ mesh, startPos, targetPos });
        }

        for (const item of spawnedMeshes) {
          this.setPiecePosition(item.mesh, item.startPos);
          item.mesh.scale.set(1, 1, 1);
          const mat = item.mesh.material as THREE.Material & { opacity?: number };
          if (mat && typeof mat.opacity === 'number') {
            mat.opacity = 0.0;
          }
        }

        let hasTriggeredSound = false;
        const startTime = performance.now();

        const animStep = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / glideDurationMs, 1);

          // Razor-sharp quintic deceleration into a heavy dead-stop lock
          const inv = 1 - progress;
          const ease = 1 - inv * inv * inv * inv * inv;
          const opacity = Math.min(1.0, progress * 2.4);

          if (!hasTriggeredSound && progress >= 0.72) {
            hasTriggeredSound = true;
            if (onStepLand) onStepLand(i);
          }

          for (const item of spawnedMeshes) {
            const curZ = THREE.MathUtils.lerp(item.startPos.z, item.targetPos.z, ease);
            const curY = THREE.MathUtils.lerp(item.startPos.y, item.targetPos.y, ease);
            this.setPiecePosition(item.mesh, new THREE.Vector3(item.targetPos.x, curY, curZ));

            const mat = item.mesh.material as THREE.Material & { opacity?: number };
            if (mat && typeof mat.opacity === 'number') {
              mat.opacity = opacity;
            }
          }

          if (progress < 1) {
            requestAnimationFrame(animStep);
          } else {
            for (const item of spawnedMeshes) {
              this.setPiecePosition(item.mesh, item.targetPos);
              const mat = item.mesh.material as THREE.Material & { opacity?: number };
              if (mat && typeof mat.opacity === 'number') {
                mat.opacity = 1.0;
              }
            }
            finishedSteps++;
            if (finishedSteps >= totalSteps && onFinish) {
              onFinish();
            }
          }
        };
        requestAnimationFrame(animStep);
      }, i * stepIntervalMs);

      this.setupTimeouts.push(timeoutId);
    }
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
    // If any piece was being dragged while a move triggers, cancel drag immediately
    if (this.draggedMesh) {
      this.draggedMesh = null;
      this.dragStartSquare = null;
      this.isDragging = false;
      this.isPointerDown = false;
    }

    const mesh = this.piecesMap.get(from);
    if (!mesh) {
      if (onFinish) onFinish();
      return;
    }

    const targetPiece = this.piecesMap.get(to);
    if (targetPiece && targetPiece !== mesh) {
      targetPiece.userData.animId = (targetPiece.userData.animId || 0) + 1;
      this.scene.remove(targetPiece);
      this.piecesMap.delete(to);
    }

    this.piecesMap.delete(from);
    this.piecesMap.set(to, mesh);
    mesh.userData.square = to;
    const currentAnimId = (mesh.userData.animId || 0) + 1;
    mesh.userData.animId = currentAnimId;

    const canonicalFromPos = this.squareToPosition(from);
    const endPos = this.squareToPosition(to);
    // If the piece was dropped via drag right onto the destination square, start from its dragged position;
    // otherwise start from the exact mathematical center of `from` square so opponent moves never drift!
    const startPos =
      mesh.position.distanceTo(endPos) < 0.85 ? mesh.position.clone() : canonicalFromPos;
    const dist = startPos.distanceTo(endPos);
    const startTime = performance.now();
    // Deliberate, smooth glide speed (~450ms - 620ms duration)
    const baseDuration = dist < 0.6 ? 180 : Math.min(620, Math.max(450, 380 + dist * 32));
    const duration = baseDuration;
    const arcHeight = dist < 0.6 ? 0.03 : Math.min(0.22, 0.10 + dist * 0.022);
    const tempPos = new THREE.Vector3();

    const animStep = () => {
      // Stop immediately if a newer animation or board sync superseded this one
      if (mesh.userData.animId !== currentAnimId) return;

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
        this.setPiecePosition(mesh, this.squareToPosition(to));
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
      if (!this.canInteract) {
        this.cancelActiveDrag();
        return;
      }

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

      // Strictly prevent dragging opponent's pieces! Only player's own pieces can be dragged.
      if (pieceMesh && pieceMesh.userData.color === this.playerColor) {
        const exactSquareCenter = this.squareToPosition(sq);
        this.dragStartSquare = sq;
        this.draggedMesh = pieceMesh;
        this.dragStartPosition.copy(exactSquareCenter);
        this.dragTargetPosition.copy(exactSquareCenter);
        this.setPiecePosition(pieceMesh, exactSquareCenter);

        if (this.onSelectSquareCallback) {
          this.onSelectSquareCallback(sq);
        }
      } else {
        this.dragStartSquare = null;
        this.draggedMesh = null;
        if (this.onSelectSquareCallback) {
          this.onSelectSquareCallback(sq);
        }
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || !this.canInteract) return;

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

      if (!this.canInteract) {
        this.cancelActiveDrag();
        return;
      }

      if (this.isDragging && this.draggedMesh && this.dragStartSquare) {
        const dropSquare = this.getSquareFromPointer(e);

        if (dropSquare && this.legalMoves.includes(dropSquare)) {
          const from = this.dragStartSquare;
          this.draggedMesh = null;
          this.dragStartSquare = null;
          this.isDragging = false;
          if (this.onMoveCallback) {
            this.onMoveCallback(from, dropSquare);
          }
        } else {
          this.setPiecePosition(this.draggedMesh, this.squareToPosition(this.dragStartSquare));
          this.draggedMesh = null;
          this.dragStartSquare = null;
          this.isDragging = false;
        }
      } else {
        if (this.draggedMesh && this.dragStartSquare) {
          this.setPiecePosition(this.draggedMesh, this.squareToPosition(this.dragStartSquare));
          this.draggedMesh = null;
          this.dragStartSquare = null;
        }
        this.isDragging = false;
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
