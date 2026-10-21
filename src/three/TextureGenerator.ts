import * as THREE from 'three';
import { BoardTheme } from '../types/chess';

export class TextureGenerator {
  /**
   * Generates a high-resolution photorealistic dark rustic wood plank table texture
   * matching the wood table background in the user's reference photo.
   */
  public static createWoodTableTexture(): THREE.CanvasTexture {
    const width = 2048;
    const height = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Base dark walnut / weathered oak undertone
    ctx.fillStyle = '#1e140d';
    ctx.fillRect(0, 0, width, height);

    // 2. Vertical wood planks (6 distinct wide planks)
    const numPlanks = 6;
    const plankW = width / numPlanks;

    for (let p = 0; p < numPlanks; p++) {
      const px = p * plankW;

      // Plank color variation (warm dark oak to charcoal-brown)
      const tones = [
        { r: 38, g: 26, b: 18 },
        { r: 48, g: 33, b: 23 },
        { r: 32, g: 22, b: 15 },
        { r: 44, g: 30, b: 21 },
        { r: 35, g: 24, b: 17 },
        { r: 42, g: 29, b: 20 }
      ];
      const tone = tones[p % tones.length];

      ctx.fillStyle = `rgb(${tone.r}, ${tone.g}, ${tone.b})`;
      ctx.fillRect(px, 0, plankW, height);

      // Fine longitudinal wood grain fibers
      const numFibers = 120;
      for (let i = 0; i < numFibers; i++) {
        const fx = px + Math.random() * plankW;
        const alpha = 0.05 + Math.random() * 0.12;
        const isDark = Math.random() > 0.4;
        ctx.strokeStyle = isDark ? `rgba(10, 6, 4, ${alpha})` : `rgba(75, 55, 38, ${alpha})`;
        ctx.lineWidth = 0.8 + Math.random() * 2.2;

        ctx.beginPath();
        ctx.moveTo(fx, 0);
        const wave1 = (Math.random() - 0.5) * 25;
        const wave2 = (Math.random() - 0.5) * 25;
        ctx.bezierCurveTo(
          fx + wave1, height * 0.3,
          fx + wave2, height * 0.7,
          fx + wave1 * 0.6, height
        );
        ctx.stroke();
      }

      // Occasional wood knot or growth ring swirl
      if (p === 1 || p === 4) {
        const knotY = height * (p === 1 ? 0.35 : 0.7);
        const knotX = px + plankW * 0.5;
        for (let r = 5; r < 55; r += 7) {
          ctx.strokeStyle = 'rgba(12, 7, 4, 0.18)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, r * 0.7, r * 1.8, (Math.random() - 0.5) * 0.1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Plank Seam: Left shadow line + Right highlight line
      ctx.fillStyle = 'rgba(5, 3, 2, 0.85)';
      ctx.fillRect(px, 0, 3, height);
      ctx.fillStyle = 'rgba(255, 235, 200, 0.04)';
      ctx.fillRect(px + 3, 0, 1.5, height);
    }

    // 3. Subtle overall vignette for depth
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.25,
      width / 2, height / 2, width * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Generates a photorealistic 8x8 chessboard texture matching the photo:
   * - Natural warm birch/maple for light squares
   * - Rich dark walnut with vertical grain for dark squares
   * - Outer beechwood border with thin black bounding rectangle
   * - Bold black coordinates (A-H, 1-8) centered cleanly
   */
  public static createChessboardTexture(boardTheme: BoardTheme, showCoords: boolean = true): THREE.CanvasTexture {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const borderSize = 110; // Outer frame margin
    const boardArea = size - borderSize * 2;
    const sqSize = boardArea / 8;

    // --- 1. Outer Wooden Frame ---
    // Warm natural beechwood / light oak
    ctx.fillStyle = '#c5a982';
    ctx.fillRect(0, 0, size, size);

    // Frame wood grain
    ctx.strokeStyle = 'rgba(120, 85, 50, 0.15)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 160; i++) {
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + Math.random() * 10, size * 0.66, y - Math.random() * 10, size, y);
      ctx.stroke();
    }

    // --- 2. Inner Black Border Line bounding the 64 squares ---
    ctx.strokeStyle = '#18110b';
    ctx.lineWidth = 5;
    ctx.strokeRect(borderSize, borderSize, boardArea, boardArea);

    // --- 3. Render 64 Squares with Authentic Wood Grains ---
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const x = borderSize + col * sqSize;
        const y = borderSize + row * sqSize;

        if (isLight) {
          // LIGHT SQUARES: Warm Natural Maple / Birch (Matches photo: #d9c39e to #e4d2b2)
          ctx.fillStyle = '#ddc7a3';
          ctx.fillRect(x, y, sqSize, sqSize);

          // Subtle horizontal maple grain streaks
          ctx.strokeStyle = 'rgba(165, 135, 95, 0.22)';
          ctx.lineWidth = 1.0;
          for (let k = 0; k < 14; k++) {
            const gy = y + (k / 14) * sqSize + (Math.random() - 0.5) * 4;
            ctx.beginPath();
            ctx.moveTo(x, gy);
            ctx.lineTo(x + sqSize, gy + (Math.random() - 0.5) * 3);
            ctx.stroke();
          }

          // Grain noise
          for (let n = 0; n < 30; n++) {
            ctx.fillStyle = 'rgba(180, 150, 110, 0.12)';
            ctx.fillRect(x + Math.random() * sqSize, y + Math.random() * sqSize, 2, 2);
          }
        } else {
          // DARK SQUARES: Rich Walnut / Teak (Matches photo: #6a432b to #754c32)
          ctx.fillStyle = '#684128';
          ctx.fillRect(x, y, sqSize, sqSize);

          // Dark walnut vertical / diagonal grain
          ctx.strokeStyle = 'rgba(40, 20, 10, 0.35)';
          ctx.lineWidth = 1.2;
          for (let k = 0; k < 18; k++) {
            const gx = x + (k / 18) * sqSize + (Math.random() - 0.5) * 6;
            ctx.beginPath();
            ctx.moveTo(gx, y);
            ctx.lineTo(gx + (Math.random() - 0.5) * 8, y + sqSize);
            ctx.stroke();
          }

          // Dark pore specks
          ctx.fillStyle = 'rgba(25, 12, 5, 0.25)';
          for (let n = 0; n < 25; n++) {
            ctx.fillRect(x + Math.random() * sqSize, y + Math.random() * sqSize, 2, 3);
          }
        }

        // Faint border between squares
        ctx.strokeStyle = 'rgba(20, 10, 5, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, sqSize, sqSize);
      }
    }

    // --- 4. Authentic Board Coordinates (A-H, 1-8) ---
    if (showCoords) {
      ctx.fillStyle = '#1e140d';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

      // Files: A-H centered at bottom
      for (let c = 0; c < 8; c++) {
        const fx = borderSize + c * sqSize + sqSize / 2;
        ctx.fillText(files[c], fx, size - borderSize / 2);
      }

      // Ranks: 1-8 centered along left and right borders
      for (let r = 0; r < 8; r++) {
        const ry = borderSize + r * sqSize + sqSize / 2;
        ctx.fillText(ranks[r], borderSize / 2, ry);
        ctx.fillText(ranks[r], size - borderSize / 2, ry);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Generates a studio cubemap so polished wood pieces and lacquer reflections
   * show bright, natural specular curves matching the photo.
   */
  public static createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const scene = new THREE.Scene();
    const camera = new THREE.CubeCamera(0.1, 100, new THREE.WebGLCubeRenderTarget(256));

    const sphereGeo = new THREE.SphereGeometry(20, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x1f1a16, side: THREE.BackSide });
    scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Warm key softbox (top-right)
    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff5ea, side: THREE.DoubleSide })
    );
    softbox1.position.set(8, 14, 8);
    softbox1.lookAt(0, 0, 0);
    scene.add(softbox1);

    // Cool rim softbox (top-left)
    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: 0xddeaff, side: THREE.DoubleSide })
    );
    softbox2.position.set(-10, 10, -6);
    softbox2.lookAt(0, 0, 0);
    scene.add(softbox2);

    camera.update(renderer, scene);
    return camera.renderTarget;
  }
}
