import * as THREE from 'three';
import { PieceSymbol } from 'chess.js';

/**
 * Creates high-detail procedural Staunton chess geometries.
 * Uses THREE.LatheGeometry for rotational pieces and THREE.ExtrudeGeometry for Knight.
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
        geom = this.createPawnGeometry();
        break;
      case 'r':
        geom = this.createRookGeometry();
        break;
      case 'n':
        geom = this.createKnightGeometry();
        break;
      case 'b':
        geom = this.createBishopGeometry();
        break;
      case 'q':
        geom = this.createQueenGeometry();
        break;
      case 'k':
        geom = this.createKingGeometry();
        break;
      default:
        geom = this.createPawnGeometry();
    }

    geom.computeVertexNormals();
    this.geometries.set(type, geom);
    return geom.clone();
  }

  // --- PAWN ---
  private static createPawnGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.38, 0));
    points.push(new THREE.Vector2(0.38, 0.05));
    points.push(new THREE.Vector2(0.34, 0.09));
    points.push(new THREE.Vector2(0.34, 0.12));
    points.push(new THREE.Vector2(0.26, 0.18));

    // Waist
    points.push(new THREE.Vector2(0.16, 0.35));
    points.push(new THREE.Vector2(0.14, 0.55));

    // Neck ring
    points.push(new THREE.Vector2(0.20, 0.60));
    points.push(new THREE.Vector2(0.22, 0.63));
    points.push(new THREE.Vector2(0.18, 0.66));
    points.push(new THREE.Vector2(0.12, 0.70));

    // Head sphere (half circle)
    const headRadius = 0.20;
    const headCenterY = 0.90;
    for (let i = 0; i <= 14; i++) {
      const angle = -Math.PI / 2 + (i / 14) * Math.PI;
      const x = Math.cos(angle) * headRadius;
      const y = headCenterY + Math.sin(angle) * headRadius;
      if (x >= 0) {
        points.push(new THREE.Vector2(x, y));
      }
    }
    points.push(new THREE.Vector2(0, headCenterY + headRadius));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- ROOK ---
  private static createRookGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.42, 0));
    points.push(new THREE.Vector2(0.42, 0.06));
    points.push(new THREE.Vector2(0.38, 0.11));
    points.push(new THREE.Vector2(0.38, 0.15));
    points.push(new THREE.Vector2(0.30, 0.22));

    // Tower Column
    points.push(new THREE.Vector2(0.25, 0.50));
    points.push(new THREE.Vector2(0.23, 0.85));

    // Flared machicolation
    points.push(new THREE.Vector2(0.32, 0.95));
    points.push(new THREE.Vector2(0.34, 1.02));
    points.push(new THREE.Vector2(0.32, 1.25));

    // Battlements outer lip to inside hollow
    points.push(new THREE.Vector2(0.24, 1.25));
    points.push(new THREE.Vector2(0.24, 1.10));
    points.push(new THREE.Vector2(0, 1.10));

    const baseLathe = new THREE.LatheGeometry(points, segments);

    // Note: Standard lathe already creates a realistic tournament tower rook
    return baseLathe;
  }

  // --- BISHOP ---
  private static createBishopGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 32;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.42, 0));
    points.push(new THREE.Vector2(0.42, 0.06));
    points.push(new THREE.Vector2(0.37, 0.12));
    points.push(new THREE.Vector2(0.30, 0.20));

    // Stem
    points.push(new THREE.Vector2(0.18, 0.45));
    points.push(new THREE.Vector2(0.16, 0.75));

    // Neck ring
    points.push(new THREE.Vector2(0.24, 0.82));
    points.push(new THREE.Vector2(0.22, 0.87));

    // Miter teardrop head
    points.push(new THREE.Vector2(0.26, 0.96));
    points.push(new THREE.Vector2(0.28, 1.15));
    points.push(new THREE.Vector2(0.24, 1.35));
    points.push(new THREE.Vector2(0.14, 1.52));
    points.push(new THREE.Vector2(0.06, 1.58));

    // Top bead
    points.push(new THREE.Vector2(0.09, 1.62));
    points.push(new THREE.Vector2(0.09, 1.68));
    points.push(new THREE.Vector2(0.04, 1.72));
    points.push(new THREE.Vector2(0, 1.74));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- KNIGHT ---
  private static createKnightGeometry(): THREE.BufferGeometry {
    // 1. Pedestal Base (Lathe)
    const basePoints: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.42, 0.06),
      new THREE.Vector2(0.37, 0.12),
      new THREE.Vector2(0.32, 0.20),
      new THREE.Vector2(0.24, 0.32),
      new THREE.Vector2(0.26, 0.36),
      new THREE.Vector2(0, 0.36)
    ];
    const baseGeom = new THREE.LatheGeometry(basePoints, 28);

    // 2. Horse Head Shape (Extrude)
    const horseShape = new THREE.Shape();
    horseShape.moveTo(-0.16, 0.35);
    // Chest curve
    horseShape.quadraticCurveTo(0.22, 0.45, 0.26, 0.80);
    // Chin and jaw
    horseShape.lineTo(0.32, 0.92);
    // Muzzle / nose
    horseShape.lineTo(0.30, 1.05);
    horseShape.lineTo(0.18, 1.15);
    // Forehead
    horseShape.lineTo(0.08, 1.25);
    // Ear tip
    horseShape.lineTo(0.06, 1.45);
    horseShape.lineTo(-0.02, 1.34);
    // Mane / Back of neck
    horseShape.quadraticCurveTo(-0.24, 1.05, -0.22, 0.70);
    horseShape.quadraticCurveTo(-0.20, 0.45, -0.16, 0.35);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05
    };

    const headGeom = new THREE.ExtrudeGeometry(horseShape, extrudeSettings);
    // Center head on Z axis
    headGeom.translate(0, 0, -0.17);

    // Merge geometries
    const group = new THREE.Group();
    const meshBase = new THREE.Mesh(baseGeom);
    const meshHead = new THREE.Mesh(headGeom);
    group.add(meshBase);
    group.add(meshHead);

    // Combine into single buffer geometry for performance
    const mergedGeom = new THREE.BufferGeometry();
    const posBase = baseGeom.attributes.position.array;
    const posHead = headGeom.attributes.position.array;
    const combinedPositions = new Float32Array(posBase.length + posHead.length);
    combinedPositions.set(posBase, 0);
    combinedPositions.set(posHead, posBase.length);
    mergedGeom.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));

    // If both have index or non-indexed, convert to non-indexed for safety
    const nonIndexedBase = baseGeom.toNonIndexed();
    const nonIndexedHead = headGeom.toNonIndexed();
    const p1 = nonIndexedBase.attributes.position.array;
    const p2 = nonIndexedHead.attributes.position.array;
    const finalPos = new Float32Array(p1.length + p2.length);
    finalPos.set(p1, 0);
    finalPos.set(p2, p1.length);

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(finalPos, 3));
    result.computeVertexNormals();

    return result;
  }

  // --- QUEEN ---
  private static createQueenGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.44, 0));
    points.push(new THREE.Vector2(0.44, 0.07));
    points.push(new THREE.Vector2(0.39, 0.13));
    points.push(new THREE.Vector2(0.32, 0.22));

    // Waist
    points.push(new THREE.Vector2(0.18, 0.55));
    points.push(new THREE.Vector2(0.17, 0.95));

    // Collar
    points.push(new THREE.Vector2(0.26, 1.05));
    points.push(new THREE.Vector2(0.24, 1.12));

    // Flared Coronet
    points.push(new THREE.Vector2(0.20, 1.25));
    points.push(new THREE.Vector2(0.33, 1.55));
    points.push(new THREE.Vector2(0.35, 1.68));

    // Crown rim
    points.push(new THREE.Vector2(0.22, 1.65));
    points.push(new THREE.Vector2(0.12, 1.68));

    // Center jewel / Pearl
    points.push(new THREE.Vector2(0.10, 1.76));
    points.push(new THREE.Vector2(0.06, 1.84));
    points.push(new THREE.Vector2(0, 1.86));

    return new THREE.LatheGeometry(points, segments);
  }

  // --- KING ---
  private static createKingGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector2[] = [];
    const segments = 36;

    // Broad majestic base
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.46, 0));
    points.push(new THREE.Vector2(0.46, 0.08));
    points.push(new THREE.Vector2(0.41, 0.14));
    points.push(new THREE.Vector2(0.35, 0.24));

    // Stately body
    points.push(new THREE.Vector2(0.21, 0.60));
    points.push(new THREE.Vector2(0.20, 1.05));

    // Double Ring Collar
    points.push(new THREE.Vector2(0.30, 1.15));
    points.push(new THREE.Vector2(0.26, 1.22));
    points.push(new THREE.Vector2(0.28, 1.26));

    // Royal Crown
    points.push(new THREE.Vector2(0.24, 1.38));
    points.push(new THREE.Vector2(0.34, 1.70));
    points.push(new THREE.Vector2(0.36, 1.84));
    points.push(new THREE.Vector2(0.25, 1.86));
    points.push(new THREE.Vector2(0.08, 1.88));

    // Finial Mount
    points.push(new THREE.Vector2(0.08, 1.95));
    points.push(new THREE.Vector2(0, 1.96));

    const kingBase = new THREE.LatheGeometry(points, segments);

    // Royal Cross Finial atop the King
    const crossVert = new THREE.BoxGeometry(0.08, 0.28, 0.08);
    crossVert.translate(0, 2.08, 0);

    const crossHoriz = new THREE.BoxGeometry(0.22, 0.08, 0.08);
    crossHoriz.translate(0, 2.12, 0);

    // Merge King Base and Cross into single geometry
    const nonIndexedBase = kingBase.toNonIndexed();
    const nonIndexedV = crossVert.toNonIndexed();
    const nonIndexedH = crossHoriz.toNonIndexed();

    const pBase = nonIndexedBase.attributes.position.array;
    const pV = nonIndexedV.attributes.position.array;
    const pH = nonIndexedH.attributes.position.array;

    const totalPos = new Float32Array(pBase.length + pV.length + pH.length);
    totalPos.set(pBase, 0);
    totalPos.set(pV, pBase.length);
    totalPos.set(pH, pBase.length + pV.length);

    const mergedKing = new THREE.BufferGeometry();
    mergedKing.setAttribute('position', new THREE.BufferAttribute(totalPos, 3));
    mergedKing.computeVertexNormals();

    return mergedKing;
  }
}
