import * as THREE from 'three';

export const COLORS = {
  RED: 0xD42426,
  GREEN: 0x165B33,
  DARK_RED: 0x8B0000,
  DARK_GREEN: 0x0B301A,
  GOLD: 0xFFD700,
  WHITE: 0xFFFFFF,
  BLUE: 0x87CEEB,
};

export const PARTICLE_COUNT = 1500;
export const SNOW_COUNT = 300;

// MediaPipe HandLandmarker Options
export const MP_VISION_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";

// Geometry Reuse
export const GEOMETRIES = {
  SPHERE: new THREE.SphereGeometry(0.5, 8, 8),
  BOX: new THREE.BoxGeometry(0.7, 0.7, 0.7),
  STAR: new THREE.OctahedronGeometry(1.0, 0), // Simplistic star
};
