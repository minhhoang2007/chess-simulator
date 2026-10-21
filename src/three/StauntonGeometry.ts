import * as THREE from 'three';
import { PieceSymbol } from 'chess.js';

/**
 * Authentic tournament Staunton chess geometries precisely shaped
 * to match the pieces in the user's reference photo.
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

  // --- PAWN ---
  private static createPawn(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Stepped circular base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.30, 0));
    points.push(new THREE.Vector2(0.30, 0.04));
    points.push(new THREE.Vector2(0.26, 0.08));
    points.push(new THREE.Vector2(0.26, 0.11));
    points.push(new THREE.Vector2(0.21, 0.16));

    // Concave slender body
    points.push(new THREE.Vector2(0.13, 0.28));
    points.push(new THREE.Vector2(0.11, 0.44));

    // Toroidal neck ring / collar
    points.push(new THREE.Vector2(0.16, 0.48));
    points.push(new THREE.Vector2(0.17, 0.51));
    points.push(new THREE.Vector2(0.14, 0.54));
    points.push(new THREE.Vector2(0.09, 0.56));

    // Spherical head
    const r = 0.15;
    const cy = 0.70;
    for (let i = 0; i <= 16; i++) {
      const angle = -Math.PI / 2 + (i / 16) * Math.PI;
      const x = Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (x >= 0) points.push(new THREE.Vector2(x, y));
    }
    points.push(new THREE.Vector2(0, cy + r));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- ROOK ---
  private static createRook(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Stepped base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.32, 0));
    points.push(new THREE.Vector2(0.32, 0.05));
    points.push(new THREE.Vector2(0.28, 0.10));
    points.push(new THREE.Vector2(0.24, 0.16));

    // Tapered cylindrical column
    points.push(new THREE.Vector2(0.19, 0.35));
    points.push(new THREE.Vector2(0.18, 0.60));

    // Flared machicolations rim
    points.push(new THREE.Vector2(0.24, 0.68));
    points.push(new THREE.Vector2(0.26, 0.74));
    points.push(new THREE.Vector2(0.25, 0.88));

    // Top battlements rim to hollow inside
    points.push(new THREE.Vector2(0.20, 0.88));
    points.push(new THREE.Vector2(0.19, 0.78));
    points.push(new THREE.Vector2(0, 0.78));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- KNIGHT ---
  private static createKnight(): THREE.BufferGeometry {
    // 1. Pedestal Base
    const basePoints: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.32, 0.05),
      new THREE.Vector2(0.28, 0.10),
      new THREE.Vector2(0.25, 0.16),
      new THREE.Vector2(0.19, 0.24),
      new THREE.Vector2(0.21, 0.28),
      new THREE.Vector2(0, 0.28)
    ];
    const baseGeom = new THREE.LatheGeometry(basePoints, 32);

    // 2. Horse Head Shape
    const s = 0.70;
    const horse = new THREE.Shape();
    horse.moveTo(-0.16 * s, 0.28);
    // Chest
    horse.quadraticCurveTo(0.22 * s, 0.38, 0.25 * s, 0.65);
    // Jaw and Muzzle
    horse.lineTo(0.32 * s, 0.75);
    horse.lineTo(0.30 * s, 0.86);
    horse.lineTo(0.18 * s, 0.95);
    // Forehead
    horse.lineTo(0.09 * s, 1.02);
    // Ear tip
    horse.lineTo(0.07 * s, 1.22);
    horse.lineTo(-0.02 * s, 1.12);
    // Mane / Back of neck curve
    horse.quadraticCurveTo(-0.25 * s, 0.90, -0.23 * s, 0.60);
    horse.quadraticCurveTo(-0.21 * s, 0.38, -0.16 * s, 0.28);

    const headGeom = new THREE.ExtrudeGeometry(horse, {
      depth: 0.20,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    });
    headGeom.translate(0, 0, -0.13);

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

  // --- BISHOP ---
  private static createBishop(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.32, 0));
    points.push(new THREE.Vector2(0.32, 0.05));
    points.push(new THREE.Vector2(0.28, 0.10));
    points.push(new THREE.Vector2(0.24, 0.17));

    // Slender Body
    points.push(new THREE.Vector2(0.14, 0.38));
    points.push(new THREE.Vector2(0.13, 0.58));

    // Neck Collar
    points.push(new THREE.Vector2(0.19, 0.64));
    points.push(new THREE.Vector2(0.18, 0.68));

    // Miter Teardrop
    points.push(new THREE.Vector2(0.21, 0.76));
    points.push(new THREE.Vector2(0.22, 0.88));
    points.push(new THREE.Vector2(0.19, 0.98));
    points.push(new THREE.Vector2(0.09, 1.10));

    // Finial Sphere
    points.push(new THREE.Vector2(0.07, 1.14));
    points.push(new THREE.Vector2(0.07, 1.18));
    points.push(new THREE.Vector2(0.03, 1.21));
    points.push(new THREE.Vector2(0, 1.22));

    const lathe = new THREE.LatheGeometry(points, segments);
    lathe.scale(0.88, 0.88, 0.88);
    return lathe;
  }

  // --- QUEEN ---
  private static createQueen(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.34, 0));
    points.push(new THREE.Vector2(0.34, 0.05));
    points.push(new THREE.Vector2(0.30, 0.11));
    points.push(new THREE.Vector2(0.25, 0.18));

    // Waist
    points.push(new THREE.Vector2(0.15, 0.44));
    points.push(new THREE.Vector2(0.14, 0.74));

    // Double Collar
    points.push(new THREE.Vector2(0.21, 0.82));
    points.push(new THREE.Vector2(0.19, 0.87));

    // Flared Coronet
    points.push(new THREE.Vector2(0.18, 0.96));
    points.push(new THREE.Vector2(0.26, 1.15));
    points.push(new THREE.Vector2(0.28, 1.26));
    points.push(new THREE.Vector2(0.19, 1.24));
    points.push(new THREE.Vector2(0.09, 1.26));

    // Pearl Finial
    points.push(new THREE.Vector2(0.08, 1.32));
    points.push(new THREE.Vector2(0.04, 1.37));
    points.push(new THREE.Vector2(0, 1.38));

    const lathe = new THREE.LatheGeometry(points, segments);
    lathe.scale(0.88, 0.88, 0.88);
    return lathe;
  }

  // --- KING ---
  private static createKing(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Stately Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.35, 0));
    points.push(new THREE.Vector2(0.35, 0.06));
    points.push(new THREE.Vector2(0.31, 0.11));
    points.push(new THREE.Vector2(0.26, 0.19));

    // Body
    points.push(new THREE.Vector2(0.17, 0.48));
    points.push(new THREE.Vector2(0.16, 0.80));

    // Collar
    points.push(new THREE.Vector2(0.23, 0.88));
    points.push(new THREE.Vector2(0.20, 0.94));
    points.push(new THREE.Vector2(0.22, 0.97));

    // Royal Crown
    points.push(new THREE.Vector2(0.19, 1.05));
    points.push(new THREE.Vector2(0.27, 1.28));
    points.push(new THREE.Vector2(0.29, 1.38));
    points.push(new THREE.Vector2(0.19, 1.40));
    points.push(new THREE.Vector2(0.07, 1.41));
    points.push(new THREE.Vector2(0.07, 1.46));
    points.push(new THREE.Vector2(0, 1.47));

    const kingBase = new THREE.LatheGeometry(points, segments);

    // Cross finial
    const crossV = new THREE.BoxGeometry(0.05, 0.20, 0.05);
    crossV.translate(0, 1.55, 0);

    const crossH = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    crossH.translate(0, 1.58, 0);

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
    kingGeom.scale(0.90, 0.90, 0.90);
    kingGeom.computeVertexNormals();

    return kingGeom;
  }
}
