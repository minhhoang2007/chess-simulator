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

    const texture = this.loader.load(`/textures/pieces/${spriteName}.png?v=4`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = maxAnisotropy;
    this.pieceSpriteCache.set(spriteName, texture);
    return texture;
  }

  /**
   * Loads the authentic photographic dark rustic wood plank table texture
   * extracted directly from the 1080p reference image.
   */
  public static createWoodTableTexture(maxAnisotropy: number = 8): THREE.Texture {
    const texture = this.loader.load('/textures/table_photo.jpg?v=3');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
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
      const texture = this.loader.load('/textures/board_photo.jpg?v=3');
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
    ctx.fillStyle = isMarble ? '#1e293b' : '#1e3a5f';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.strokeRect(borderSize, borderSize, boardArea, boardArea);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = borderSize + col * sqSize;
        const y = borderSize + row * sqSize;
        ctx.fillStyle = isLight
          ? (isMarble ? '#e2e8f0' : '#dee6ed')
          : (isMarble ? '#334155' : '#3b6a98');
        ctx.fillRect(x, y, sqSize, sqSize);
      }
    }

    if (showCoords) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      for (let c = 0; c < 8; c++) {
        ctx.fillText(files[c], borderSize + c * sqSize + sqSize / 2, size - borderSize / 2);
      }
      for (let r = 0; r < 8; r++) {
        const ry = borderSize + r * sqSize + sqSize / 2;
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
