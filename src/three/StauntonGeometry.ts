import * as THREE from 'three';
import { PieceSymbol, Color } from 'chess.js';

/**
 * Compact, high-contrast Staunton 3D chess piece geometries modeled directly
 * after the reference image (/tmp/pieces_reference.jpg):
 * - Compact footprint (Pawn radius 0.255, major pieces 0.285..0.305) so every square
 *   has generous breathing room and zero crowding.
 * - Compact heights (0.54..0.84) paired with oblique projection tilt so pieces
 *   never overlap adjacent ranks.
 * - Directional 3D studio shading baked into vertex colors (top-left specular
 *   highlight, right-side cylindrical core shadow, crisp dark neck groove, and
 *   signature pure-white collar ring) for instant visual clarity on both light
 *   and dark wood squares.
 */
export class StauntonGeometryFactory {
  private static cache: Map<string, THREE.BufferGeometry> = new Map();

  public static getGeometry(type: PieceSymbol, color: Color): THREE.BufferGeometry {
    const key = `${type}_${color}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!.clone();
    }

    let geom: THREE.BufferGeometry;
    switch (type) {
      case 'p':
        geom = this.createPawn(color);
        break;
      case 'r':
        geom = this.createRook(color);
        break;
      case 'n':
        geom = this.createKnight(color);
        break;
      case 'b':
        geom = this.createBishop(color);
        break;
      case 'q':
        geom = this.createQueen(color);
        break;
      case 'k':
        geom = this.createKing(color);
        break;
      default:
        geom = this.createPawn(color);
    }

    // Center piece slightly toward front of square (+Z) so after backward oblique tilt (-Z)
    // the entire silhouette sits dead-center inside its square.
    geom.translate(0, 0, 0.09);

    this.cache.set(key, geom);
    return geom.clone();
  }

  /**
   * Computes studio-shaded vertex color matching the reference photo's
   * top-left key light and crisp right-side cylindrical shadow.
   */
  private static shadeStudioColor(
    baseColor: THREE.Color,
    color: Color,
    nx: number,
    ny: number,
    nz: number,
    options?: { isStem?: boolean; isCollar?: boolean; isGroove?: boolean; isCrownTop?: boolean }
  ): THREE.Color {
    const c = baseColor.clone();
    if (options?.isGroove) {
      return c;
    }

    // Light direction from top-left-front: (-0.58, 0.72, 0.38)
    const dotKey = Math.max(0, nx * -0.58 + ny * 0.72 + nz * 0.38);
    // Core shadow on right-back side (+X)
    const rightShadow = Math.max(0, nx * 0.75 - ny * 0.15);

    if (color === 'w') {
      if (options?.isCollar) {
        // Pure white collar with subtle right-edge shading
        c.lerp(new THREE.Color(0xcbbfa8), rightShadow * 0.35);
        return c;
      }
      if (options?.isCrownTop) {
        c.lerp(new THREE.Color(0xffffff), Math.pow(dotKey, 1.5) * 0.55);
        return c;
      }
      if (options?.isStem) {
        // Distinctive half-lit / half-shaded cylinder stem like A1 Rook & E1 King in photo
        if (nx > 0.05) {
          const shadowT = Math.min(1, (nx - 0.05) * 1.45);
          c.lerp(new THREE.Color(0x382a1e), shadowT * 0.78);
        } else {
          c.lerp(new THREE.Color(0xf7efe0), Math.pow(dotKey, 1.4) * 0.45);
        }
        return c;
      }
      // Head & base rings: warm ivory with bright top-left highlight and rich taupe right-side shade
      c.lerp(new THREE.Color(0xfcf7ec), Math.pow(dotKey, 1.6) * 0.52);
      c.lerp(new THREE.Color(0x6e5c49), Math.pow(rightShadow, 1.2) * 0.55);
    } else {
      // Black pieces: luxury hand-rubbed African Ebony & Dark Rosewood with warm satin bronze highlight
      if (options?.isCollar) {
        c.lerp(new THREE.Color(0x9e7b56), rightShadow * 0.45);
        return c;
      }
      const spec = Math.pow(dotKey, 2.0);
      const rim = Math.max(0, 1 - Math.abs(ny)) * Math.max(0, -nx * 0.6 + nz * 0.4);
      c.lerp(new THREE.Color(0xc89666), spec * 0.62 + rim * 0.32);
      c.lerp(new THREE.Color(0x110a06), rightShadow * 0.68);
    }

    return c;
  }

  private static colorizeLathe(
    geom: THREE.BufferGeometry,
    color: Color,
    bandFn: (y: number, x: number, z: number) => {
      color: THREE.Color;
      isStem?: boolean;
      isCollar?: boolean;
      isGroove?: boolean;
      isCrownTop?: boolean;
    }
  ): THREE.BufferGeometry {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    nonIndexed.computeVertexNormals();
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      const band = bandFn(y, x, z);
      const shaded = this.shadeStudioColor(band.color, color, nx, ny, nz, band);
      colors[i * 3] = shaded.r;
      colors[i * 3 + 1] = shaded.g;
      colors[i * 3 + 2] = shaded.b;
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return nonIndexed;
  }

  private static colorizeMesh(
    geom: THREE.BufferGeometry,
    baseColor: THREE.Color,
    color: Color,
    options?: { isStem?: boolean; isCollar?: boolean; isGroove?: boolean; isCrownTop?: boolean }
  ): THREE.BufferGeometry {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    nonIndexed.computeVertexNormals();
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);
      const shaded = this.shadeStudioColor(baseColor, color, nx, ny, nz, options);
      colors[i * 3] = shaded.r;
      colors[i * 3 + 1] = shaded.g;
      colors[i * 3 + 2] = shaded.b;
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return nonIndexed;
  }

  private static mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
    let totalVerts = 0;
    for (const g of geoms) {
      totalVerts += g.attributes.position.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);

    let offset = 0;
    for (const g of geoms) {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const c = g.attributes.color.array;

      positions.set(p, offset);
      normals.set(n, offset);
      colors.set(c, offset);
      offset += p.length;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return merged;
  }

  private static getPalette(color: Color) {
    return color === 'w'
      ? {
          base: new THREE.Color(0xd6c7b0),
          baseRim: new THREE.Color(0xf2ead9),
          stem: new THREE.Color(0xdfd2bc),
          groove: new THREE.Color(0x2d2118),
          collar: new THREE.Color(0xffffff),
          head: new THREE.Color(0xd4c5ae),
          crownTop: new THREE.Color(0xf9f3e6),
          knightBody: new THREE.Color(0xb8a68e),
          knightMane: new THREE.Color(0x33251a),
          finial: new THREE.Color(0x744d2f)
        }
      : {
          base: new THREE.Color(0x2b1911),
          baseRim: new THREE.Color(0x6e472f),
          stem: new THREE.Color(0x24140d),
          groove: new THREE.Color(0x120a06),
          collar: new THREE.Color(0xdfc29d),
          head: new THREE.Color(0x331e14),
          crownTop: new THREE.Color(0x68422b),
          knightBody: new THREE.Color(0x2e1b12),
          knightMane: new THREE.Color(0x8c5e3c),
          finial: new THREE.Color(0xd4a359)
        };
  }

  // --- 1. PAWN (Compact height 0.54, base radius 0.255) ---
  private static createPawn(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.255, 0),
      new THREE.Vector2(0.255, 0.035),
      new THREE.Vector2(0.225, 0.065),
      new THREE.Vector2(0.235, 0.095),
      new THREE.Vector2(0.195, 0.13),
      new THREE.Vector2(0.165, 0.165),
      // Tapered stem
      new THREE.Vector2(0.115, 0.23),
      new THREE.Vector2(0.10, 0.29),
      // Signature wide bright white collar ring
      new THREE.Vector2(0.158, 0.315),
      new THREE.Vector2(0.158, 0.355),
      new THREE.Vector2(0.105, 0.37),
      new THREE.Vector2(0.085, 0.38)
    ];

    // Round spherical head
    const r = 0.132;
    const cy = 0.475;
    for (let i = 0; i <= 18; i++) {
      const a = -Math.PI / 2 + (i / 18) * Math.PI;
      const x = Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (x >= 0) pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2(0, cy + r));

    const lathe = new THREE.LatheGeometry(pts, 36);
    return this.colorizeLathe(lathe, color, (y) => {
      if (y < 0.035) return { color: p.groove, isGroove: true };
      if (y < 0.07) return { color: p.base };
      if (y < 0.105) return { color: p.baseRim };
      if (y < 0.165) return { color: p.base };
      if (y < 0.275) return { color: p.stem, isStem: true };
      if (y < 0.305) return { color: p.groove, isGroove: true };
      if (y < 0.36) return { color: p.collar, isCollar: true };
      if (y < 0.385) return { color: p.groove, isGroove: true };
      return { color: p.head };
    });
  }

  // --- 2. ROOK (Compact height 0.61, 6 crisp turret merlons) ---
  private static createRook(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.28, 0),
      new THREE.Vector2(0.28, 0.035),
      new THREE.Vector2(0.25, 0.07),
      new THREE.Vector2(0.26, 0.105),
      new THREE.Vector2(0.22, 0.145),
      // Cylindrical tower body
      new THREE.Vector2(0.175, 0.22),
      new THREE.Vector2(0.16, 0.39),
      // Flared turret neck
      new THREE.Vector2(0.21, 0.43),
      new THREE.Vector2(0.22, 0.46),
      // Turret top rim
      new THREE.Vector2(0.22, 0.54),
      new THREE.Vector2(0.14, 0.54),
      new THREE.Vector2(0.14, 0.50),
      new THREE.Vector2(0, 0.50)
    ];

    const baseLathe = this.colorizeLathe(new THREE.LatheGeometry(pts, 36), color, (y) => {
      if (y < 0.035) return { color: p.groove, isGroove: true };
      if (y < 0.075) return { color: p.base };
      if (y < 0.115) return { color: p.baseRim };
      if (y < 0.155) return { color: p.base };
      if (y < 0.40) return { color: p.stem, isStem: true };
      if (y < 0.44) return { color: p.groove, isGroove: true };
      if (y < 0.51) return { color: p.groove, isGroove: true };
      return { color: p.crownTop, isCrownTop: true };
    });

    const parts: THREE.BufferGeometry[] = [baseLathe];
    const numMerlons = 6;
    const radius = 0.18;
    for (let i = 0; i < numMerlons; i++) {
      const angle = (i / numMerlons) * Math.PI * 2;
      const merlon = new THREE.BoxGeometry(0.088, 0.075, 0.06);
      merlon.rotateY(-angle);
      merlon.translate(Math.cos(angle) * radius, 0.575, Math.sin(angle) * radius);
      parts.push(
        this.colorizeMesh(merlon, p.crownTop, color, { isCrownTop: true })
      );
    }

    return this.mergeGeometries(parts);
  }

  // --- 3. KNIGHT (Compact height 0.65, sculpted sideways horse head facing +X) ---
  private static createKnight(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const basePts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.28, 0),
      new THREE.Vector2(0.28, 0.035),
      new THREE.Vector2(0.25, 0.07),
      new THREE.Vector2(0.26, 0.105),
      new THREE.Vector2(0.215, 0.145),
      new THREE.Vector2(0.195, 0.185),
      new THREE.Vector2(0.21, 0.215),
      new THREE.Vector2(0, 0.215)
    ];

    const baseLathe = this.colorizeLathe(new THREE.LatheGeometry(basePts, 36), color, (y) => {
      if (y < 0.035) return { color: p.groove, isGroove: true };
      if (y < 0.075) return { color: p.base };
      if (y < 0.115) return { color: p.baseRim };
      if (y < 0.175) return { color: p.base };
      return { color: p.collar, isCollar: true };
    });

    // Sculpted horse head facing right (+X) with fuller chest/belly curve
    const horseShape = new THREE.Shape();
    horseShape.moveTo(-0.095, 0.20);
    horseShape.quadraticCurveTo(0.20, 0.25, 0.145, 0.39);
    horseShape.lineTo(0.095, 0.44);
    // Muzzle pointing right (+X)
    horseShape.lineTo(0.215, 0.415);
    horseShape.quadraticCurveTo(0.25, 0.45, 0.215, 0.50);
    // Forehead & ear
    horseShape.lineTo(0.085, 0.59);
    horseShape.lineTo(0.05, 0.67);
    horseShape.lineTo(-0.015, 0.61);
    // Curved neck back
    horseShape.quadraticCurveTo(-0.17, 0.51, -0.16, 0.34);
    horseShape.quadraticCurveTo(-0.15, 0.24, -0.095, 0.20);

    const headGeom = new THREE.ExtrudeGeometry(horseShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.026,
      bevelThickness: 0.026
    });
    headGeom.translate(0, 0, -0.06);
    const coloredHead = this.colorizeMesh(headGeom, p.knightBody, color);

    // Contrasting mane strip along back of neck
    const maneShape = new THREE.Shape();
    maneShape.moveTo(-0.10, 0.21);
    maneShape.quadraticCurveTo(-0.12, 0.47, -0.015, 0.61);
    maneShape.lineTo(-0.055, 0.63);
    maneShape.quadraticCurveTo(-0.195, 0.50, -0.185, 0.34);
    maneShape.quadraticCurveTo(-0.17, 0.24, -0.13, 0.21);
    maneShape.closePath();

    const maneGeom = new THREE.ExtrudeGeometry(maneShape, {
      depth: 0.085,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018
    });
    maneGeom.translate(0, 0, -0.0425);
    const coloredMane = this.colorizeMesh(maneGeom, p.knightMane, color, { isGroove: color === 'w' });

    return this.mergeGeometries([baseLathe, coloredHead, coloredMane]);
  }

  // --- 4. BISHOP (Compact height 0.70, bright white collar + miter band + finial) ---
  private static createBishop(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.285, 0),
      new THREE.Vector2(0.285, 0.035),
      new THREE.Vector2(0.255, 0.07),
      new THREE.Vector2(0.265, 0.105),
      new THREE.Vector2(0.22, 0.145),
      // Stem
      new THREE.Vector2(0.135, 0.24),
      new THREE.Vector2(0.115, 0.33),
      // Wide bright white collar
      new THREE.Vector2(0.185, 0.365),
      new THREE.Vector2(0.185, 0.405),
      new THREE.Vector2(0.14, 0.43),
      // Miter dome
      new THREE.Vector2(0.175, 0.49),
      new THREE.Vector2(0.175, 0.56),
      new THREE.Vector2(0.135, 0.62),
      new THREE.Vector2(0.06, 0.665),
      // Top ball finial
      new THREE.Vector2(0.055, 0.69),
      new THREE.Vector2(0.055, 0.72),
      new THREE.Vector2(0, 0.735)
    ];

    const lathe = new THREE.LatheGeometry(pts, 36);
    return this.colorizeLathe(lathe, color, (y) => {
      if (y < 0.035) return { color: p.groove, isGroove: true };
      if (y < 0.075) return { color: p.base };
      if (y < 0.115) return { color: p.baseRim };
      if (y < 0.16) return { color: p.base };
      if (y < 0.34) return { color: p.stem, isStem: true };
      if (y < 0.36) return { color: p.groove, isGroove: true };
      if (y < 0.415) return { color: p.collar, isCollar: true };
      if (y < 0.44) return { color: p.groove, isGroove: true };
      if (y < 0.51) return { color: p.baseRim };
      if (y < 0.67) return { color: p.head };
      return { color: p.collar, isCollar: true };
    });
  }

  // --- 5. QUEEN (Taller regal height 0.86, coronet with 8 crown pearls) ---
  private static createQueen(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.30, 0),
      new THREE.Vector2(0.30, 0.035),
      new THREE.Vector2(0.27, 0.075),
      new THREE.Vector2(0.28, 0.11),
      new THREE.Vector2(0.235, 0.155),
      // Elongated graceful stem
      new THREE.Vector2(0.15, 0.27),
      new THREE.Vector2(0.13, 0.45),
      // Collar
      new THREE.Vector2(0.20, 0.49),
      new THREE.Vector2(0.20, 0.53),
      new THREE.Vector2(0.155, 0.555),
      // Coronet cup flared wider for clearer crown points
      new THREE.Vector2(0.21, 0.64),
      new THREE.Vector2(0.24, 0.72),
      new THREE.Vector2(0.175, 0.685),
      // Flatter, less bulbous inner dome
      new THREE.Vector2(0.125, 0.69),
      new THREE.Vector2(0.095, 0.735),
      new THREE.Vector2(0.035, 0.758),
      new THREE.Vector2(0, 0.764)
    ];

    const baseLathe = this.colorizeLathe(new THREE.LatheGeometry(pts, 36), color, (y) => {
      if (y < 0.035) return { color: p.groove, isGroove: true };
      if (y < 0.08) return { color: p.base };
      if (y < 0.12) return { color: p.baseRim };
      if (y < 0.165) return { color: p.base };
      if (y < 0.46) return { color: p.stem, isStem: true };
      if (y < 0.485) return { color: p.groove, isGroove: true };
      if (y < 0.535) return { color: p.collar, isCollar: true };
      if (y < 0.56) return { color: p.groove, isGroove: true };
      if (y < 0.722) return { color: p.crownTop, isCrownTop: true };
      return { color: p.head };
    });

    const parts: THREE.BufferGeometry[] = [baseLathe];
    const numPearls = 8;
    const rimRadius = 0.22;
    for (let i = 0; i < numPearls; i++) {
      const angle = (i / numPearls) * Math.PI * 2;
      const pearl = new THREE.SphereGeometry(0.038, 12, 12);
      pearl.translate(Math.cos(angle) * rimRadius, 0.735, Math.sin(angle) * rimRadius);
      parts.push(this.colorizeMesh(pearl, p.collar, color, { isCollar: true }));
    }

    const topPearl = new THREE.SphereGeometry(0.028, 14, 14);
    topPearl.translate(0, 0.775, 0);
    parts.push(this.colorizeMesh(topPearl, p.collar, color, { isCollar: true }));

    return this.mergeGeometries(parts);
  }

  // --- 6. KING (Robust, broad-shouldered height 0.90) ---
  private static createKing(color: Color): THREE.BufferGeometry {
    const p = this.getPalette(color);
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.31, 0),
      new THREE.Vector2(0.31, 0.04),
      new THREE.Vector2(0.28, 0.08),
      new THREE.Vector2(0.29, 0.115),
      new THREE.Vector2(0.25, 0.16),
      // Thicker, broader stem
      new THREE.Vector2(0.185, 0.27),
      new THREE.Vector2(0.168, 0.41),
      // Broad Double Collar
      new THREE.Vector2(0.24, 0.445),
      new THREE.Vector2(0.245, 0.485),
      new THREE.Vector2(0.19, 0.51),
      new THREE.Vector2(0.22, 0.535),
      new THREE.Vector2(0.18, 0.56),
      // Broad Royal Crown
      new THREE.Vector2(0.25, 0.67),
      new THREE.Vector2(0.255, 0.72),
      new THREE.Vector2(0.175, 0.74),
      new THREE.Vector2(0.085, 0.76),
      new THREE.Vector2(0, 0.77)
    ];

    const baseLathe = this.colorizeLathe(new THREE.LatheGeometry(pts, 36), color, (y) => {
      if (y < 0.04) return { color: p.groove, isGroove: true };
      if (y < 0.085) return { color: p.base };
      if (y < 0.125) return { color: p.baseRim };
      if (y < 0.17) return { color: p.base };
      if (y < 0.42) return { color: p.stem, isStem: true };
      if (y < 0.44) return { color: p.groove, isGroove: true };
      if (y < 0.55) return { color: p.collar, isCollar: true };
      if (y < 0.57) return { color: p.groove, isGroove: true };
      if (y < 0.73) return { color: p.crownTop, isCrownTop: true };
      return { color: p.finial };
    });

    const finialNeck = new THREE.CylinderGeometry(0.04, 0.058, 0.04, 16);
    finialNeck.translate(0, 0.785, 0);

    const finialCrown = new THREE.CylinderGeometry(0.068, 0.048, 0.068, 18);
    finialCrown.translate(0, 0.835, 0);

    return this.mergeGeometries([
      baseLathe,
      this.colorizeMesh(finialNeck, p.collar, color, { isCollar: true }),
      this.colorizeMesh(finialCrown, p.finial, color)
    ]);
  }
}
