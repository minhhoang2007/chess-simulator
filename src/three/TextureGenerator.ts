import * as THREE from 'three';
import { BoardTheme } from '../types/chess';

export class TextureGenerator {
  /**
   * Generates a realistic dark rustic wooden tabletop background texture
   * matching the wooden plank desk in the reference image.
   */
  public static createWoodTableTexture(): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base dark oak / walnut wood color
    ctx.fillStyle = '#261b14';
    ctx.fillRect(0, 0, size, size);

    // Draw wood planks
    const plankWidth = size / 6;
    for (let p = 0; p < 6; p++) {
      const px = p * plankWidth;

      // Plank color variation
      const tone = 0.9 + Math.sin(p * 2.5) * 0.12;
      ctx.fillStyle = `rgb(${Math.floor(40 * tone)}, ${Math.floor(28 * tone)}, ${Math.floor(20 * tone)})`;
      ctx.fillRect(px, 0, plankWidth, size);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(15, 10, 6, 0.4)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) {
        const x = px + Math.random() * plankWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        const wave = (Math.random() - 0.5) * 15;
        ctx.bezierCurveTo(x + wave, size * 0.33, x - wave, size * 0.66, x + wave * 0.5, size);
        ctx.stroke();
      }

      // Plank seam shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(px, 0, 2, size);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(px + 2, 0, 1, size);
    }

    // Subtle vignette / ambient shading
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  /**
   * Generates the 8x8 chessboard texture with wood grain for light & dark squares
   * and border coordinates (A-H, 1-8).
   */
  public static createChessboardTexture(boardTheme: BoardTheme, showCoords: boolean = true): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const borderSize = 64; // Border margin for letters and numbers
    const boardSize = size - borderSize * 2;
    const squareSize = boardSize / 8;

    // Theme color palettes
    let lightColor = '#dfcca8'; // Maple
    let darkColor = '#6d452d';  // Walnut
    let borderColor = '#bca17c';
    let coordColor = '#3a2012';

    if (boardTheme === 'obsidian-marble') {
      lightColor = '#e2e8f0';
      darkColor = '#1e293b';
      borderColor = '#0f172a';
      coordColor = '#94a3b8';
    } else if (boardTheme === 'tournament-blue') {
      lightColor = '#e0e7ee';
      darkColor = '#3b6a98';
      borderColor = '#203952';
      coordColor = '#ffffff';
    }

    // Border background
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, size, size);

    // Inner bevel shadow around board
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(borderSize - 2, borderSize - 2, boardSize + 4, boardSize + 4);

    // Draw 64 squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = borderSize + col * squareSize;
        const y = borderSize + row * squareSize;

        ctx.fillStyle = isLight ? lightColor : darkColor;
        ctx.fillRect(x, y, squareSize, squareSize);

        // Subtle realistic wood grain streaks if wood theme
        if (boardTheme === 'rustic-wood') {
          ctx.strokeStyle = isLight ? 'rgba(160, 130, 90, 0.18)' : 'rgba(40, 20, 10, 0.25)';
          ctx.lineWidth = 1;
          for (let k = 0; k < 6; k++) {
            const gx = x + (k / 6) * squareSize + Math.random() * 4;
            ctx.beginPath();
            ctx.moveTo(gx, y);
            ctx.lineTo(gx + (Math.random() - 0.5) * 8, y + squareSize);
            ctx.stroke();
          }
        }

        // Faint border between squares
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, squareSize, squareSize);
      }
    }

    // Coordinates A-H and 1-8
    if (showCoords) {
      ctx.fillStyle = coordColor;
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

      // Files (horizontal bottom and top)
      for (let c = 0; c < 8; c++) {
        const x = borderSize + c * squareSize + squareSize / 2;
        // Bottom file letters
        ctx.fillText(files[c], x, size - borderSize / 2);
        // Top file letters
        ctx.fillText(files[c], x, borderSize / 2);
      }

      // Ranks (vertical left and right)
      for (let r = 0; r < 8; r++) {
        const y = borderSize + r * squareSize + squareSize / 2;
        // Left rank numbers
        ctx.fillText(ranks[r], borderSize / 2, y);
        // Right rank numbers
        ctx.fillText(ranks[r], size - borderSize / 2, y);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates a high dynamic range studio environment cubemap/texture
   * so glass pieces exhibit breathtaking refraction, fresnel highlights, and reflections.
   */
  public static createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const scene = new THREE.Scene();
    const camera = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(256));

    // Sky gradient sphere
    const sphereGeo = new THREE.SphereGeometry(20, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x18202d,
      side: THREE.BackSide
    });
    const dome = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(dome);

    // Studio softbox light 1 (warm key light from top right)
    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff3e0, side: THREE.DoubleSide })
    );
    softbox1.position.set(10, 14, 10);
    softbox1.lookAt(0, 0, 0);
    scene.add(softbox1);

    // Studio softbox light 2 (cool rim light from back left)
    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: 0xc8e6f5, side: THREE.DoubleSide })
    );
    softbox2.position.set(-12, 10, -10);
    softbox2.lookAt(0, 0, 0);
    scene.add(softbox2);

    // Ceiling fill ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 16;
    scene.add(ring);

    camera.update(renderer, scene);
    return camera.renderTarget;
  }
}
