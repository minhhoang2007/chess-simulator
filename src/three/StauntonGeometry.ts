import * as THREE from 'three';
import { PieceSymbol, Color } from 'chess.js';

/**
 * Builds high-detail, multi-toned 3D chess piece geometries with Vertex Colors
 * that replicate the exact pieces in the reference photo:
 * - Banded pawns with contrasting neck collars & base rings
 * - Castellated rooks with 6 distinct 3D merlon notches
 * - Two-tone sculpted knights facing right (+X) in profile
 * - Banded bishops with contrasting miter rings & ball finials
 * - Coronet queens with 8 3D spherical pearls around the crown rim
 * - Royal kings with contrasting collar bands & bronze/silver cross finials
 */
export class StauntonGeometryFactory {
  private static cache: Map<string, THREE.BufferGeometry> = new Map();

  public static getGeometry(type: PieceSymbol, color: Color): THREE.BufferGeometry {
    const key = `${type}_${color}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!.clone();
    }

    // Palette matching the reference photo's exact two-tone pieces
    const palette = color === 'w'
      ? {
          body: new THREE.Color(0xd2c5b0),      // Warm taupe-ivory body
          lightRing: new THREE.Color(0xf7f1e3), // Bright creamy white accent ring
          darkBand: new THREE.Color(0x2b1d14),  // Dark espresso brown accent band
          headTop: new THREE.Color(0xe5dac6),   // Warm ivory head
          cross: new THREE.Color(0x7c5836)      // Bronze-brown king cross
        }
      : {
          body: new THREE.Color(0x1e1e20),      // Deep charcoal-ebony body
          lightRing: new THREE.Color(0xdcdcdc), // Bright silver-white collar ring
          darkBand: new THREE.Color(0x0d0d0f),  // Jet black accent band
          headTop: new THREE.Color(0x28282b),   // Glossy charcoal head
          cross: new THREE.Color(0x9a9a9e)      // Silver-grey king cross
        };

    let geom: THREE.BufferGeometry;
    switch (type) {
      case 'p':
        geom = this.createPawn(palette, color);
        break;
      case 'r':
        geom = this.createRook(palette, color);
        break;
      case 'n':
        geom = this.createKnight(palette, color);
        break;
      case 'b':
        geom = this.createBishop(palette, color);
        break;
      case 'q':
        geom = this.createQueen(palette, color);
        break;
      case 'k':
        geom = this.createKing(palette, color);
        break;
      default:
        geom = this.createPawn(palette, color);
    }

    this.cache.set(key, geom);
    return geom.clone();
  }

  private static colorizeLatheByY(
    geom: THREE.BufferGeometry,
    colorFn: (y: number) => THREE.Color
  ): THREE.BufferGeometry {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    nonIndexed.computeVertexNormals();
    const pos = nonIndexed.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const c = colorFn(y);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return nonIndexed;
  }

  private static colorizeUniform(
    geom: THREE.BufferGeometry,
    color: THREE.Color
  ): THREE.BufferGeometry {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    nonIndexed.computeVertexNormals();
    const pos = nonIndexed.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
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

  // --- 1. PAWN ---
  private static createPawn(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.33, 0),
      new THREE.Vector2(0.33, 0.05),
      new THREE.Vector2(0.30, 0.09),
      new THREE.Vector2(0.31, 0.12),
      new THREE.Vector2(0.27, 0.16),
      new THREE.Vector2(0.24, 0.20),
      // Tapered stem
      new THREE.Vector2(0.16, 0.30),
      new THREE.Vector2(0.13, 0.44),
      // Prominent collar ring under head
      new THREE.Vector2(0.20, 0.48),
      new THREE.Vector2(0.21, 0.52),
      new THREE.Vector2(0.16, 0.55),
      new THREE.Vector2(0.11, 0.57)
    ];

    // Spherical head
    const r = 0.175;
    const cy = 0.72;
    for (let i = 0; i <= 18; i++) {
      const a = -Math.PI / 2 + (i / 18) * Math.PI;
      const x = Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (x >= 0) pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2(0, cy + r));

    const lathe = new THREE.LatheGeometry(pts, 40);
    return this.colorizeLatheByY(lathe, (y) => {
      if (y < 0.08) return p.body;
      if (y < 0.14) return color === 'w' ? p.lightRing : p.body;
      if (y < 0.22) return p.body;
      if (y < 0.46) return color === 'w' ? p.darkBand : p.darkBand;
      if (y < 0.56) return p.lightRing; // signature white/cream collar ring!
      return p.headTop;
    });
  }

  // --- 2. ROOK (with 6 3D Castle Merlons!) ---
  private static createRook(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.35, 0),
      new THREE.Vector2(0.35, 0.05),
      new THREE.Vector2(0.32, 0.10),
      new THREE.Vector2(0.33, 0.14),
      new THREE.Vector2(0.28, 0.19),
      // Column
      new THREE.Vector2(0.22, 0.34),
      new THREE.Vector2(0.20, 0.56),
      // Collar flare
      new THREE.Vector2(0.26, 0.62),
      new THREE.Vector2(0.28, 0.68),
      // Turret bowl
      new THREE.Vector2(0.27, 0.80),
      new THREE.Vector2(0.18, 0.80),
      new THREE.Vector2(0.18, 0.74),
      new THREE.Vector2(0, 0.74)
    ];

    const baseLathe = this.colorizeLatheByY(new THREE.LatheGeometry(pts, 40), (y) => {
      if (y < 0.10) return p.body;
      if (y < 0.15) return p.lightRing;
      if (y < 0.22) return p.body;
      if (y < 0.56) return color === 'w' ? p.darkBand : p.darkBand;
      if (y < 0.68) return p.body;
      if (y < 0.76) return p.darkBand;
      return color === 'w' ? p.lightRing : p.headTop;
    });

    // Add 6 distinct castle merlons (crenellations) around the top rim
    const parts: THREE.BufferGeometry[] = [baseLathe];
    const numMerlons = 6;
    const radius = 0.225;
    for (let i = 0; i < numMerlons; i++) {
      const angle = (i / numMerlons) * Math.PI * 2;
      const merlon = new THREE.BoxGeometry(0.11, 0.12, 0.08);
      merlon.rotateY(-angle);
      merlon.translate(Math.cos(angle) * radius, 0.85, Math.sin(angle) * radius);
      parts.push(
        this.colorizeUniform(merlon, color === 'w' ? p.lightRing : p.headTop)
      );
    }

    return this.mergeGeometries(parts);
  }

  // --- 3. KNIGHT (Two-Tone Sculpted Horse Facing Right +X, Matching Photo!) ---
  private static createKnight(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    // 1. Pedestal Base
    const basePts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.35, 0),
      new THREE.Vector2(0.35, 0.05),
      new THREE.Vector2(0.32, 0.10),
      new THREE.Vector2(0.33, 0.14),
      new THREE.Vector2(0.27, 0.19),
      new THREE.Vector2(0.24, 0.26),
      new THREE.Vector2(0.26, 0.30),
      new THREE.Vector2(0, 0.30)
    ];
    const baseLathe = this.colorizeLatheByY(new THREE.LatheGeometry(basePts, 36), (y) => {
      if (y < 0.10) return p.body;
      if (y < 0.15) return p.lightRing;
      if (y < 0.25) return p.body;
      return p.lightRing;
    });

    // 2. Front Horse Head & Muzzle (Facing +X right, just like in the reference photo!)
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-0.10, 0.28);
    // Chest swelling forward (+X)
    frontShape.quadraticCurveTo(0.20, 0.36, 0.16, 0.58);
    // Under jaw & throat
    frontShape.lineTo(0.12, 0.65);
    // Snout / Muzzle reaching right (+X)
    frontShape.lineTo(0.28, 0.62);
    frontShape.quadraticCurveTo(0.33, 0.66, 0.29, 0.74);
    // Bridge of nose up to forehead
    frontShape.lineTo(0.12, 0.88);
    // Perky ear tip
    frontShape.lineTo(0.08, 1.02);
    frontShape.lineTo(0.0, 0.94);
    // Inner division between face and mane
    frontShape.quadraticCurveTo(-0.10, 0.72, -0.10, 0.28);

    const frontGeom = new THREE.ExtrudeGeometry(frontShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035
    });
    frontGeom.translate(0, 0, -0.09);
    const coloredFront = this.colorizeUniform(
      frontGeom,
      color === 'w' ? p.lightRing : p.headTop
    );

    // 3. Back Mane Ridge (Contrasting dark brown on White Knight, silver-edged charcoal on Black Knight)
    const maneShape = new THREE.Shape();
    maneShape.moveTo(-0.08, 0.28);
    maneShape.quadraticCurveTo(-0.08, 0.72, 0.01, 0.94);
    maneShape.lineTo(-0.06, 0.96);
    maneShape.quadraticCurveTo(-0.26, 0.78, -0.24, 0.52);
    maneShape.quadraticCurveTo(-0.22, 0.35, -0.18, 0.28);
    maneShape.closePath();

    const maneGeom = new THREE.ExtrudeGeometry(maneShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025
    });
    maneGeom.translate(0, 0, -0.07);
    const coloredMane = this.colorizeUniform(
      maneGeom,
      color === 'w' ? p.darkBand : p.body
    );

    return this.mergeGeometries([baseLathe, coloredFront, coloredMane]);
  }

  // --- 4. BISHOP (with Contrasting Miter Band & Ball Finial) ---
  private static createBishop(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.35, 0),
      new THREE.Vector2(0.35, 0.05),
      new THREE.Vector2(0.32, 0.10),
      new THREE.Vector2(0.33, 0.14),
      new THREE.Vector2(0.27, 0.19),
      // Stem
      new THREE.Vector2(0.16, 0.36),
      new THREE.Vector2(0.14, 0.52),
      // Wide Collar Ring
      new THREE.Vector2(0.23, 0.56),
      new THREE.Vector2(0.24, 0.61),
      new THREE.Vector2(0.18, 0.64),
      // Bulbous Miter Head
      new THREE.Vector2(0.23, 0.72),
      new THREE.Vector2(0.24, 0.82),
      new THREE.Vector2(0.20, 0.92),
      new THREE.Vector2(0.10, 1.00),
      // Top Ball Finial
      new THREE.Vector2(0.08, 1.04),
      new THREE.Vector2(0.08, 1.09),
      new THREE.Vector2(0.03, 1.12),
      new THREE.Vector2(0, 1.13)
    ];

    const lathe = new THREE.LatheGeometry(pts, 40);
    return this.colorizeLatheByY(lathe, (y) => {
      if (y < 0.10) return p.body;
      if (y < 0.15) return p.lightRing;
      if (y < 0.24) return p.body;
      if (y < 0.53) return p.darkBand;
      if (y < 0.63) return p.lightRing; // bright collar
      if (y < 0.75) return color === 'w' ? p.darkBand : p.lightRing; // miter band!
      if (y < 1.01) return color === 'w' ? p.lightRing : p.headTop;
      return p.body;
    });
  }

  // --- 5. QUEEN (with 8 3D Crown Pearls around the Coronet!) ---
  private static createQueen(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.37, 0),
      new THREE.Vector2(0.37, 0.05),
      new THREE.Vector2(0.34, 0.10),
      new THREE.Vector2(0.35, 0.14),
      new THREE.Vector2(0.29, 0.20),
      // Waist
      new THREE.Vector2(0.18, 0.38),
      new THREE.Vector2(0.15, 0.60),
      // Collar
      new THREE.Vector2(0.24, 0.65),
      new THREE.Vector2(0.25, 0.70),
      new THREE.Vector2(0.19, 0.74),
      // Flared Coronet
      new THREE.Vector2(0.25, 0.86),
      new THREE.Vector2(0.28, 0.98),
      // Inner Crown Dome
      new THREE.Vector2(0.20, 0.96),
      new THREE.Vector2(0.15, 1.04),
      new THREE.Vector2(0.06, 1.10),
      new THREE.Vector2(0, 1.12)
    ];

    const baseLathe = this.colorizeLatheByY(new THREE.LatheGeometry(pts, 40), (y) => {
      if (y < 0.10) return p.body;
      if (y < 0.15) return p.lightRing;
      if (y < 0.25) return p.body;
      if (y < 0.62) return p.darkBand;
      if (y < 0.72) return p.lightRing;
      if (y < 0.99) return color === 'w' ? p.lightRing : p.headTop;
      return p.body;
    });

    // Add 8 3D Crown Pearls around the rim of the Queen's coronet
    const parts: THREE.BufferGeometry[] = [baseLathe];
    const numPearls = 8;
    const rimRadius = 0.25;
    for (let i = 0; i < numPearls; i++) {
      const angle = (i / numPearls) * Math.PI * 2;
      const pearl = new THREE.SphereGeometry(0.045, 12, 12);
      pearl.translate(Math.cos(angle) * rimRadius, 1.01, Math.sin(angle) * rimRadius);
      parts.push(this.colorizeUniform(pearl, p.lightRing));
    }

    // Center top finial pearl
    const topPearl = new THREE.SphereGeometry(0.055, 14, 14);
    topPearl.translate(0, 1.14, 0);
    parts.push(this.colorizeUniform(topPearl, p.lightRing));

    return this.mergeGeometries(parts);
  }

  // --- 6. KING (with Double Collar & Contrasting 3D Royal Cross Finial!) ---
  private static createKing(p: Record<string, THREE.Color>, color: Color): THREE.BufferGeometry {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.38, 0),
      new THREE.Vector2(0.38, 0.06),
      new THREE.Vector2(0.35, 0.11),
      new THREE.Vector2(0.36, 0.15),
      new THREE.Vector2(0.30, 0.21),
      // Stately Stem
      new THREE.Vector2(0.19, 0.42),
      new THREE.Vector2(0.16, 0.66),
      // Prominent Double Collar
      new THREE.Vector2(0.26, 0.71),
      new THREE.Vector2(0.27, 0.76),
      new THREE.Vector2(0.21, 0.80),
      new THREE.Vector2(0.24, 0.84),
      new THREE.Vector2(0.19, 0.88),
      // Royal Crown
      new THREE.Vector2(0.26, 1.04),
      new THREE.Vector2(0.27, 1.12),
      new THREE.Vector2(0.18, 1.14),
      new THREE.Vector2(0.10, 1.18),
      new THREE.Vector2(0, 1.19)
    ];

    const baseLathe = this.colorizeLatheByY(new THREE.LatheGeometry(pts, 40), (y) => {
      if (y < 0.11) return p.body;
      if (y < 0.16) return p.lightRing;
      if (y < 0.26) return p.body;
      if (y < 0.68) return p.darkBand;
      if (y < 0.86) return p.lightRing; // bright collar rings
      if (y < 1.13) return p.body;
      return p.cross;
    });

    // 3D Royal Cross Finial on top of the King
    const crossBase = new THREE.CylinderGeometry(0.06, 0.08, 0.06, 16);
    crossBase.translate(0, 1.21, 0);

    const crossVert = new THREE.BoxGeometry(0.065, 0.22, 0.065);
    crossVert.translate(0, 1.32, 0);

    const crossHoriz = new THREE.BoxGeometry(0.18, 0.065, 0.065);
    crossHoriz.translate(0, 1.34, 0);

    return this.mergeGeometries([
      baseLathe,
      this.colorizeUniform(crossBase, p.cross),
      this.colorizeUniform(crossVert, p.cross),
      this.colorizeUniform(crossHoriz, p.cross)
    ]);
  }
}
