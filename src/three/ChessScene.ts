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

  // Camera Perspective matching the reference photo's exact framing and trapezoid angle
  private readonly PHOTO_CAMERA_POS = new THREE.Vector3(0, 10.9, 5.15);
  private readonly PHOTO_CAMERA_TARGET = new THREE.Vector3(0, -0.1, 0.22);

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a110b);

    // 2. Camera (matches the reference photo framing so the board spans top-to-bottom)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(39.5, aspect, 0.1, 100);
    this.camera.position.copy(this.PHOTO_CAMERA_POS);
    this.camera.lookAt(this.PHOTO_CAMERA_TARGET);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.contactShadowTex = TextureGenerator.createContactShadowTexture();

    // 4. Lighting
    this.setupLighting();

    // 5. Table & Board
    this.setupTableAndBoard();

    // 6. Highlights Group
    this.scene.add(this.highlightGroup);

    // 7. Interactivity
    this.setupInteractivity();

    // 8. Animation Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    // Balanced warm ambient light so the photographic wood texture looks natural
    const ambientLight = new THREE.AmbientLight(0xfff9f0, 1.35);
    this.scene.add(ambientLight);

    // Main directional key light from front-right-top (casts shadows back-left like the photo)
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.85);
    keyLight.position.set(3.2, 12.5, 5.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 26;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -5.5;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 2.5;
    this.scene.add(keyLight);

    // Subtle rim light from top-left for glossy collar highlights on black pieces
    const rimLight = new THREE.DirectionalLight(0xe2eeff, 0.9);
    rimLight.position.set(-5.0, 9.0, -4.0);
    this.scene.add(rimLight);

    try {
      const studioEnv = TextureGenerator.createStudioEnvironment(this.renderer);
      this.scene.environment = studioEnv.texture;
    } catch (e) {
      console.warn('Environment map warning:', e);
    }
  }

  private setupTableAndBoard() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Photographic Wood Plank Table
    const tableTexture = TextureGenerator.createWoodTableTexture(maxAniso);
    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.25
    });
    const tableGeo = new THREE.PlaneGeometry(28, 28);
    this.tableMesh = new THREE.Mesh(tableGeo, tableMat);
    this.tableMesh.rotation.x = -Math.PI / 2;
    this.tableMesh.position.y = -0.22;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // 2. Photographic 3D Chessboard
    this.buildBoard();
  }

  private buildBoard() {
    if (this.boardMesh) {
      this.scene.remove(this.boardMesh);
      this.boardMesh.geometry.dispose();
      this.boardMesh = null;
    }

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    // 8.0 units for 64 squares + border (84px on each side out of 2048px -> 8.0 * 2048 / 1880 = 8.715)
    const boardWidth = 8.715;
    const boardThickness = 0.44;
    const boardGeo = new THREE.BoxGeometry(boardWidth, boardThickness, boardWidth);

    const topTexture = TextureGenerator.createChessboardTexture(this.boardTheme, this.showCoordinates, maxAniso);
    const topMat = new THREE.MeshStandardMaterial({
      map: topTexture,
      roughness: 0.42,
      metalness: 0.02,
      envMapIntensity: 0.35
    });

    // Dark walnut front/side bezel matching the bottom edge of the board in the photo
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x2c1b10,
      roughness: 0.55,
      metalness: 0.05
    });

    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.9 });

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
        // Uses the multi-band Vertex Colors baked into StauntonGeometryFactory!
        return new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          roughness: isWhite ? 0.22 : 0.18,
          metalness: isWhite ? 0.03 : 0.06,
          clearcoat: 0.75,
          clearcoatRoughness: 0.14,
          envMapIntensity: 1.15
        });
      }

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
            existingMesh.userData.color !== piece.color;

          if (needsRecreate) {
            if (existingMesh) {
              this.scene.remove(existingMesh);
              this.piecesMap.delete(square);
            }
            this.createPieceMesh(square, piece.type, piece.color);
          } else {
            existingMesh.position.copy(this.squareToPosition(square));
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
    const geom = StauntonGeometryFactory.getGeometry(type, color);
    const mat = this.createPieceMaterial(color);

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { square, type, color };

    // Add soft ambient occlusion contact shadow disc under the piece base
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(-0.05, 0.004, -0.05);
    mesh.add(shadowPlane);

    mesh.position.copy(this.squareToPosition(square));

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
    const duration = 240;

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
      color: 0xf59e0b,
      emissive: 0xd97706,
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
      this.camera.position.set(0, 13.8, 0.01);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    } else {
      this.camera.position.copy(this.PHOTO_CAMERA_POS);
      this.camera.lookAt(this.PHOTO_CAMERA_TARGET);
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
          this.draggedMesh.position.x = boardIntersect.x;
          this.draggedMesh.position.z = boardIntersect.z;
          this.draggedMesh.position.y = 0.65;
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
          this.draggedMesh.position.copy(this.dragStartPosition);
          this.draggedMesh = null;
          this.dragStartSquare = null;
        }
      } else {
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
