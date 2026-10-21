import * as THREE from 'three';
import { PieceSymbol } from 'chess.js';

/**
 * Compact, tournament-proportioned Staunton chess pieces
 * designed specifically for 3D/2.5D top-down perspective so
 * pieces never block or occlude squares behind them.
 */
export class StauntonGeometryFactory {
  private static geometries: Map<PieceSymbol, THREE.BufferGeometry> = new Map();

  public static getGeometry(type: PieceSymbol): THREE.BufferGeometry {
    if (this.geometries.has(type)) {
      return this.geometries.get(type)!.clone();
    }

    let geom: THREE.BufferGeometry;
    switch (type) {
      case 'p':
        geom = this.createPawn();
        break;
      case 'r':
        geom = this.createRook();
        break;
      case 'n':
        geom = this.createKnight();
        break;
      case 'b':
        geom = this.createBishop();
        break;
      case 'q':
        geom = this.createQueen();
        break;
      case 'k':
        geom = this.createKing();
        break;
      default:
        geom = this.createPawn();
    }

    geom.computeVertexNormals();
    this.geometries.set(type, geom);
    return geom.clone();
  }

  // --- PAWN (Height ~0.65, Base Radius ~0.30) ---
  private static createPawn(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.28, 0));
    points.push(new THREE.Vector2(0.28, 0.04));
    points.push(new THREE.Vector2(0.24, 0.08));
    points.push(new THREE.Vector2(0.20, 0.12));

    // Waist
    points.push(new THREE.Vector2(0.12, 0.24));
    points.push(new THREE.Vector2(0.10, 0.38));

    // Neck Collar Ring
    points.push(new THREE.Vector2(0.15, 0.42));
    points.push(new THREE.Vector2(0.16, 0.45));
    points.push(new THREE.Vector2(0.13, 0.47));
    points.push(new THREE.Vector2(0.08, 0.49));

    // Head Sphere
    const headRadius = 0.14;
    const headY = 0.62;
    for (let i = 0; i <= 14; i++) {
      const angle = -Math.PI / 2 + (i / 14) * Math.PI;
      const x = Math.cos(angle) * headRadius;
      const y = headY + Math.sin(angle) * headRadius;
      if (x >= 0) points.push(new THREE.Vector2(x, y));
    }
    points.push(new THREE.Vector2(0, headY + headRadius));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- ROOK (Height ~0.76, Base Radius ~0.32) ---
  private static createRook(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.31, 0));
    points.push(new THREE.Vector2(0.31, 0.05));
    points.push(new THREE.Vector2(0.26, 0.10));
    points.push(new THREE.Vector2(0.22, 0.15));

    // Tower Column
    points.push(new THREE.Vector2(0.18, 0.35));
    points.push(new THREE.Vector2(0.17, 0.55));

    // Machicolation flare
    points.push(new THREE.Vector2(0.23, 0.62));
    points.push(new THREE.Vector2(0.24, 0.67));
    points.push(new THREE.Vector2(0.23, 0.78));

    // Top Rim & Inside hollow
    points.push(new THREE.Vector2(0.18, 0.78));
    points.push(new THREE.Vector2(0.18, 0.70));
    points.push(new THREE.Vector2(0, 0.70));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- KNIGHT (Height ~0.84, Base Radius ~0.31) ---
  private static createKnight(): THREE.BufferGeometry {
    // 1. Pedestal Base
    const basePoints: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.31, 0),
      new THREE.Vector2(0.31, 0.05),
      new THREE.Vector2(0.26, 0.10),
      new THREE.Vector2(0.23, 0.16),
      new THREE.Vector2(0.17, 0.24),
      new THREE.Vector2(0.19, 0.28),
      new THREE.Vector2(0, 0.28)
    ];
    const baseGeom = new THREE.LatheGeometry(basePoints, 28);

    // 2. Horse Head Shape
    const s = 0.65; // scale factor
    const horseShape = new THREE.Shape();
    horseShape.moveTo(-0.16 * s, 0.26);
    // Chest
    horseShape.quadraticCurveTo(0.20 * s, 0.35, 0.24 * s, 0.60);
    // Jaw and Muzzle
    horseShape.lineTo(0.30 * s, 0.70);
    horseShape.lineTo(0.28 * s, 0.80);
    horseShape.lineTo(0.16 * s, 0.88);
    // Forehead
    horseShape.lineTo(0.08 * s, 0.95);
    // Ear tip
    horseShape.lineTo(0.06 * s, 1.15);
    horseShape.lineTo(-0.02 * s, 1.05);
    // Mane / Back of neck
    horseShape.quadraticCurveTo(-0.24 * s, 0.85, -0.22 * s, 0.55);
    horseShape.quadraticCurveTo(-0.20 * s, 0.35, -0.16 * s, 0.26);

    const headGeom = new THREE.ExtrudeGeometry(horseShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    });
    headGeom.translate(0, 0, -0.12);

    // Merge non-indexed buffer geometries
    const b1 = baseGeom.toNonIndexed();
    const b2 = headGeom.toNonIndexed();
    const p1 = b1.attributes.position.array;
    const p2 = b2.attributes.position.array;
    const combined = new Float32Array(p1.length + p2.length);
    combined.set(p1, 0);
    combined.set(p2, p1.length);

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(combined, 3));
    result.computeVertexNormals();
    return result;
  }

  // --- BISHOP (Height ~0.94, Base Radius ~0.31) ---
  private static createBishop(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.31, 0));
    points.push(new THREE.Vector2(0.31, 0.05));
    points.push(new THREE.Vector2(0.26, 0.10));
    points.push(new THREE.Vector2(0.22, 0.16));

    // Slender Stem
    points.push(new THREE.Vector2(0.13, 0.35));
    points.push(new THREE.Vector2(0.12, 0.52));

    // Neck Collar
    points.push(new THREE.Vector2(0.17, 0.57));
    points.push(new THREE.Vector2(0.16, 0.61));

    // Miter Teardrop
    points.push(new THREE.Vector2(0.19, 0.68));
    points.push(new THREE.Vector2(0.20, 0.78));
    points.push(new THREE.Vector2(0.17, 0.88));
    points.push(new THREE.Vector2(0.08, 0.98));

    // Small Top Finial Bead
    points.push(new THREE.Vector2(0.06, 1.02));
    points.push(new THREE.Vector2(0.06, 1.06));
    points.push(new THREE.Vector2(0.02, 1.09));
    points.push(new THREE.Vector2(0, 1.10));

    // Scale to ~0.92
    const lathe = new THREE.LatheGeometry(points, segments);
    lathe.scale(0.85, 0.85, 0.85);
    return lathe;
  }

  // --- QUEEN (Height ~1.08, Base Radius ~0.33) ---
  private static createQueen(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.33, 0));
    points.push(new THREE.Vector2(0.33, 0.05));
    points.push(new THREE.Vector2(0.28, 0.10));
    points.push(new THREE.Vector2(0.23, 0.17));

    // Waist
    points.push(new THREE.Vector2(0.14, 0.40));
    points.push(new THREE.Vector2(0.13, 0.68));

    // Collar
    points.push(new THREE.Vector2(0.19, 0.74));
    points.push(new THREE.Vector2(0.18, 0.79));

    // Flared Coronet
    points.push(new THREE.Vector2(0.16, 0.88));
    points.push(new THREE.Vector2(0.24, 1.05));
    points.push(new THREE.Vector2(0.26, 1.14));
    points.push(new THREE.Vector2(0.17, 1.12));
    points.push(new THREE.Vector2(0.08, 1.14));

    // Pearl Bead
    points.push(new THREE.Vector2(0.07, 1.20));
    points.push(new THREE.Vector2(0.04, 1.25));
    points.push(new THREE.Vector2(0, 1.26));

    const lathe = new THREE.LatheGeometry(points, segments);
    lathe.scale(0.86, 0.86, 0.86);
    return lathe;
  }

  // --- KING (Height ~1.20, Base Radius ~0.34) ---
  private static createKing(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Stately Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.34, 0));
    points.push(new THREE.Vector2(0.34, 0.06));
    points.push(new THREE.Vector2(0.29, 0.11));
    points.push(new THREE.Vector2(0.24, 0.18));

    // Waist
    points.push(new THREE.Vector2(0.16, 0.44));
    points.push(new THREE.Vector2(0.15, 0.74));

    // Double Collar
    points.push(new THREE.Vector2(0.22, 0.80));
    points.push(new THREE.Vector2(0.19, 0.85));
    points.push(new THREE.Vector2(0.21, 0.88));

    // Royal Crown Flare
    points.push(new THREE.Vector2(0.18, 0.96));
    points.push(new THREE.Vector2(0.25, 1.16));
    points.push(new THREE.Vector2(0.27, 1.25));
    points.push(new THREE.Vector2(0.18, 1.27));
    points.push(new THREE.Vector2(0.06, 1.28));
    points.push(new THREE.Vector2(0.06, 1.33));
    points.push(new THREE.Vector2(0, 1.34));

    const kingBase = new THREE.LatheGeometry(points, segments);

    // Cross Finial atop King
    const crossV = new THREE.BoxGeometry(0.05, 0.18, 0.05);
    crossV.translate(0, 1.42, 0);

    const crossH = new THREE.BoxGeometry(0.14, 0.05, 0.05);
    crossH.translate(0, 1.45, 0);

    // Merge
    const bBase = kingBase.toNonIndexed();
    const bV = crossV.toNonIndexed();
    const bH = crossH.toNonIndexed();

    const p1 = bBase.attributes.position.array;
    const p2 = bV.attributes.position.array;
    const p3 = bH.attributes.position.array;

    const total = new Float32Array(p1.length + p2.length + p3.length);
    total.set(p1, 0);
    total.set(p2, p1.length);
    total.set(p3, p1.length + p2.length);

    const kingGeom = new THREE.BufferGeometry();
    kingGeom.setAttribute('position', new THREE.BufferAttribute(total, 3));
    kingGeom.scale(0.88, 0.88, 0.88);
    kingGeom.computeVertexNormals();

    return kingGeom;
  }
}
