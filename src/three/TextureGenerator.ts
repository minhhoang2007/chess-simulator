import * as THREE from 'three';
import { PieceSymbol, Color } from 'chess.js';
import { BoardTheme } from '../types/chess';

export class TextureGenerator {
  private static loader = new THREE.TextureLoader();
  private static pieceSpriteCache: Map<string, THREE.Texture> = new Map();

  /**
   * Loads the authentic 1080p lossless piece sprite extracted directly from
   * com.jetstartgames.chess for the given piece type, color, and column (0..7).
   */
  public static getPieceSpriteTexture(
    type: PieceSymbol,
    color: Color,
    visualFile: number,
    maxAnisotropy: number = 8
  ): THREE.Texture {
    const clampedFile = Math.max(0, Math.min(7, visualFile));
    let spriteName: string;

    if (type === 'p') {
      spriteName = `${color}P_${clampedFile}`;
    } else if (type === 'r' || type === 'n' || type === 'b') {
      const side = clampedFile < 4 ? 'L' : 'R';
      spriteName = `${color}${type.toUpperCase()}_${side}`;
    } else {
      spriteName = `${color}${type.toUpperCase()}`;
    }

    if (this.pieceSpriteCache.has(spriteName)) {
      return this.pieceSpriteCache.get(spriteName)!;
    }

    const texture = this.loader.load(`${import.meta.env.BASE_URL}textures/pieces/${spriteName}.png?v=6`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = maxAnisotropy;
    this.pieceSpriteCache.set(spriteName, texture);
    return texture;
  }

  /**
   * Loads the new high-resolution luxury dark walnut wood table texture.
   */
  public static createWoodTableTexture(maxAnisotropy: number = 8): THREE.Texture {
    const texture = this.loader.load(`${import.meta.env.BASE_URL}textures/table_wood_new.jpg`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = maxAnisotropy;
    return texture;
  }

  /**
   * Loads the authentic photographic 8x8 maple & walnut chessboard texture
   * extracted directly from the 1080p reference image (or fallback theme).
   */
  public static createChessboardTexture(
    boardTheme: BoardTheme,
    showCoords: boolean = true,
    maxAnisotropy: number = 8
  ): THREE.Texture {
    if (boardTheme === 'rustic-wood') {
      const texture = this.loader.load(`${import.meta.env.BASE_URL}textures/board_photo.jpg?v=3`);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      return texture;
    }

    // Fallback procedural textures for optional marble / tournament-blue themes
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const borderSize = 50;
    const boardArea = size - borderSize * 2;
    const sqSize = boardArea / 8;

    const isMarble = boardTheme === 'obsidian-marble';
    // Chess.com authentic Tournament Blue & Ivory palette with warm wooden rim
    ctx.fillStyle = isMarble ? '#1e293b' : '#2b1c13';
    ctx.fillRect(0, 0, size, size);

    // Subtle inner gold/wood accent line
    ctx.strokeStyle = isMarble ? '#334155' : '#543621';
    ctx.lineWidth = 4;
    ctx.strokeRect(borderSize - 2, borderSize - 2, boardArea + 4, boardArea + 4);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = borderSize + col * sqSize;
        const y = borderSize + row * sqSize;
        // Chess.com authentic soft Ivory (#eaecd0) and classic Tournament Blue (#4b7399)
        ctx.fillStyle = isLight
          ? (isMarble ? '#e2e8f0' : '#eaecd0')
          : (isMarble ? '#334155' : '#4b7399');
        ctx.fillRect(x, y, sqSize, sqSize);
      }
    }

    if (showCoords) {
      ctx.font = 'bold 32px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      for (let c = 0; c < 8; c++) {
        // Subtle gold-tinted coordinate letters matching the classroom wood tones
        ctx.fillStyle = '#f5ede3';
        ctx.fillText(files[c], borderSize + c * sqSize + sqSize / 2, size - borderSize / 2);
      }
      for (let r = 0; r < 8; r++) {
        const ry = borderSize + r * sqSize + sqSize / 2;
        ctx.fillStyle = '#f5ede3';
        ctx.fillText(ranks[r], borderSize / 2, ry);
        ctx.fillText(ranks[r], size - borderSize / 2, ry);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
  }

  public static createContactShadowTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates a realistic, triple-layer ambient occlusion & directional contact shadow
   * for the entire chessboard, firmly grounding the 3D board onto the wooden tabletop.
   */
  public static createBoardShadowTexture(): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Board width is 8.4107 on a 12.0 wide shadow plane -> ratio = 8.4107 / 12.0 = 0.7009
    // On 1024px, the exact board base is 718px wide.
    const bSize = 718;

    // 1. Wide diffuse ambient penumbra (simulates soft room ambient occlusion)
    ctx.shadowColor = 'rgba(10, 6, 4, 0.45)';
    ctx.shadowBlur = 85;
    ctx.fillStyle = 'rgba(10, 6, 4, 0.4)';
    ctx.beginPath();
    ctx.roundRect((size - bSize) / 2, (size - bSize) / 2, bSize, bSize, 32);
    ctx.fill();

    // 2. Directional soft drop shadow (keylight is at (-3.5, 13.5, 4.8) -> cast toward (+X, +Y))
    ctx.shadowColor = 'rgba(5, 3, 2, 0.75)';
    ctx.shadowBlur = 48;
    ctx.fillStyle = 'rgba(5, 3, 2, 0.7)';
    ctx.beginPath();
    ctx.roundRect((size - bSize) / 2 + 14, (size - bSize) / 2 + 10, bSize, bSize, 28);
    ctx.fill();

    // 3. Deep contact occlusion crease right at the perimeter of the board
    ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
    ctx.beginPath();
    ctx.roundRect((size - bSize) / 2, (size - bSize) / 2, bSize, bSize, 22);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  public static createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const scene = new THREE.Scene();
    const camera = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(256));

    const sphereGeo = new THREE.SphereGeometry(20, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x241d18, side: THREE.BackSide });
    scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    softbox1.position.set(2, 16, 6);
    softbox1.lookAt(0, 0, 0);
    scene.add(softbox1);

    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffeacc, side: THREE.DoubleSide })
    );
    softbox2.position.set(-8, 11, -5);
    softbox2.lookAt(0, 0, 0);
    scene.add(softbox2);

    camera.update(renderer, scene);
    return camera.renderTarget;
  }
}
