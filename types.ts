import * as THREE from 'three';

export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS',
}

export type WishType = 'TEXT' | 'PHOTO' | 'VIDEO';

export interface WishItem {
  id: string;
  type: WishType;
  content: string; // Text content or URL
  texture?: THREE.Texture; // Pre-generated texture
  aspectRatio: number;
}

export interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3; // For tree/scatter formation
  randomOffset: THREE.Vector3; // For breathing animation
  phase: number;
  isWishItem: boolean;
  wishId?: string;
  originalScale: number;
}

export interface HandGesture {
  name: 'FIST' | 'OPEN' | 'PINCH' | 'NONE';
  pinchDistance: number;
  position: { x: number; y: number }; // Normalized 0-1
}

export interface ParticleConfig {
  particleCount: number;
  baseSize: number;
  bloomStrength: number;
  particleGlow: number;
  scatterRadius: number;
  treeGapFactor: number; // Controls the exponent for bottom gap/size distribution
}