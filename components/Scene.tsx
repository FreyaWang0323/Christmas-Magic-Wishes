import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore - types not always available for examples
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AppMode, HandGesture, ParticleData, WishItem, WishType, ParticleConfig } from '../types';
import { COLORS, GEOMETRIES, SNOW_COUNT } from '../constants';

interface SceneProps {
  mode: AppMode;
  gesture: HandGesture;
  wishes: WishItem[];
  setMode: (mode: AppMode) => void;
  onFocusItem: (item: WishItem | null) => void;
  config: ParticleConfig;
}

// Helper: Red/White Striped Texture for Candy Cane effect
const createStripedTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if(ctx) {
      // White Background
      ctx.fillStyle = '#E0E0E0'; 
      ctx.fillRect(0,0,128,128);
      
      // Red Stripes
      ctx.fillStyle = '#C02020'; 
      ctx.beginPath();
      // Draw diagonal stripes
      const step = 32;
      for(let i = -128; i < 256; i += step * 2) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i + step, 0);
          ctx.lineTo(i + step - 128, 128);
          ctx.lineTo(i - 128, 128);
          ctx.closePath();
      }
      ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter; 
  return tex;
};

const Scene: React.FC<SceneProps> = ({ mode, gesture, wishes, setMode, onFocusItem, config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  
  // State refs for animation loop
  const particlesRef = useRef<ParticleData[]>([]);
  const mainGroupRef = useRef<THREE.Group>(new THREE.Group());
  const snowGroupRef = useRef<THREE.Group>(new THREE.Group());
  const timeRef = useRef(0);
  const modeRef = useRef(mode);
  const gestureRef = useRef(gesture);
  const wishesRef = useRef(wishes);
  const configRef = useRef(config);
  
  const focusedItemRef = useRef<WishItem | null>(null);
  const activeWishIdRef = useRef<string | null>(null); // Track which wish is visible
  
  const materialsCacheRef = useRef<Record<number, THREE.Material>>({});
  const stripedTextureRef = useRef<THREE.Texture | null>(null);

  // Sync refs with props
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { gestureRef.current = gesture; }, [gesture]);
  useEffect(() => { configRef.current = config; }, [config]);

  // Handle Material Update on config change (Glow)
  useEffect(() => {
     Object.values(materialsCacheRef.current).forEach(mat => {
         if (mat instanceof THREE.MeshStandardMaterial) {
             // Only update standard particle materials, not wish frames (if they were cached, but they aren't)
             mat.emissiveIntensity = config.particleGlow;
             mat.needsUpdate = true;
         }
     });
  }, [config.particleGlow]);

  // Handle Particle Count Change
  useEffect(() => {
     if (sceneRef.current) {
         initParticles();
     }
  }, [config.particleCount, config.baseSize, config.treeGapFactor]); 
  
  // Handle Mode & Wish Selection
  useEffect(() => {
    // If no wishes, clear refs
    if (wishes.length === 0) {
        activeWishIdRef.current = null;
        focusedItemRef.current = null;
        return;
    }

    // Determine Active Wish
    if (mode === AppMode.FOCUS) {
        // Randomly select ONE wish to display when entering Focus mode
        // If activeWishIdRef matches a wish in the current list and we haven't switched modes, 
        // we might want to keep it? But usually 'mode' prop changes only on transition.
        const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
        activeWishIdRef.current = randomWish.id;
        focusedItemRef.current = randomWish;

        // Auto play video if applicable
        if (randomWish.type === 'VIDEO' && randomWish.texture) {
            const vidTex = randomWish.texture as THREE.VideoTexture;
            if (vidTex.image instanceof HTMLVideoElement) {
                vidTex.image.currentTime = 0;
                vidTex.image.play().catch(e => console.log("Auto-play blocked"));
            }
        }
    } else {
        // In non-Focus modes, we pause videos
        wishes.forEach(w => {
            if (w.type === 'VIDEO' && w.texture) {
                 const vidTex = w.texture as THREE.VideoTexture;
                 if (vidTex.image instanceof HTMLVideoElement) {
                     vidTex.image.pause();
                 }
            }
        });
        focusedItemRef.current = null;
        // We don't clear activeWishIdRef because we might want to remember the last one,
        // but for visibility logic, we'll just show ALL in Scatter/Tree.
    }
  }, [mode, wishes]);

  // Rebuild particles when wishes change
  useEffect(() => {
    if (sceneRef.current && wishes.length > 0) {
        wishesRef.current = wishes;
        rebuildWishParticles();
    }
  }, [wishes]);

  const rebuildWishParticles = () => {
    if (!sceneRef.current) return;
    initParticles();
  };

  const getCachedMaterial = (color: number) => {
      if (!materialsCacheRef.current[color]) {
          const isGreen = color === COLORS.GREEN || color === COLORS.DARK_GREEN;
          materialsCacheRef.current[color] = new THREE.MeshStandardMaterial({ 
              color: color, 
              roughness: isGreen ? 0.2 : 0.4, 
              metalness: isGreen ? 0.6 : 0.5, 
              emissive: color, 
              // Use current config for new materials
              emissiveIntensity: configRef.current ? configRef.current.particleGlow : 1.0 
          });
      }
      return materialsCacheRef.current[color];
  };

  const initParticles = () => {
    if (!mainGroupRef.current) return;
    
    if (!stripedTextureRef.current) {
        stripedTextureRef.current = createStripedTexture();
    }
    
    // Clear existing
    while(mainGroupRef.current.children.length > 0){ 
        const obj = mainGroupRef.current.children[0];
        if((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        mainGroupRef.current.remove(obj);
    }
    particlesRef.current = [];

    // 1. Create Wish Particles
    wishesRef.current.forEach((wish) => {
        let mesh;
        
        // --- Material Configuration ---
        // Frame: Standard matte material, NO GLOW (Emissive black)
        const frameMat = new THREE.MeshStandardMaterial({ 
            map: stripedTextureRef.current,
            color: 0xcccccc, 
            roughness: 0.8, 
            metalness: 0.1,
            emissive: 0x000000,
            emissiveIntensity: 0
        });

        // Content: MeshBasicMaterial is NOT affected by scene lights.
        const contentMat = new THREE.MeshBasicMaterial({ 
            map: wish.texture, 
            side: THREE.DoubleSide,
            color: 0xcccccc, 
        });

        // Text Card needs transparent background handling
        const isText = (wish.type === 'TEXT');
        if (isText) {
             contentMat.transparent = true;
        }

        if (wish.type === 'PHOTO' || wish.type === 'VIDEO') {
            const frameGeo = new THREE.BoxGeometry(1.1 * wish.aspectRatio, 1.1, 0.05);
            const frame = new THREE.Mesh(frameGeo, frameMat);
            
            const planeGeo = new THREE.PlaneGeometry(wish.aspectRatio, 1);
            const content = new THREE.Mesh(planeGeo, contentMat);
            content.position.z = 0.03;
            
            frame.add(content);
            mesh = frame;
        } else {
            // Text Card
            const frameGeo = new THREE.BoxGeometry(1.6 * wish.aspectRatio, 1.6, 0.05);
            const frame = new THREE.Mesh(frameGeo, frameMat);

            const planeGeo = new THREE.PlaneGeometry(wish.aspectRatio * 1.5, 1.5);
            const content = new THREE.Mesh(planeGeo, contentMat);
            content.position.z = 0.03;
            frame.add(content);
            mesh = frame;
        }
        
        mainGroupRef.current.add(mesh);
        particlesRef.current.push({
            mesh: mesh,
            velocity: new THREE.Vector3(),
            basePosition: new THREE.Vector3(),
            randomOffset: new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)),
            phase: Math.random() * Math.PI * 2,
            isWishItem: true,
            wishId: wish.id,
            originalScale: 1
        });
    });

    // 2. Create Standard Particles
    const getColor = () => {
        const r = Math.random();
        if (r < 0.3) return COLORS.RED;
        if (r < 0.6) return COLORS.GREEN;
        if (r < 0.7) return COLORS.DARK_RED;
        if (r < 0.8) return COLORS.DARK_GREEN;
        if (r < 0.9) return COLORS.GOLD;
        if (r < 0.95) return COLORS.WHITE;
        return COLORS.BLUE;
    };

    const count = configRef.current.particleCount;
    const baseSizeConfig = configRef.current.baseSize;
    const gapFactor = configRef.current.treeGapFactor;

    for (let i = 0; i < count; i++) {
        const type = Math.random();
        let geo = GEOMETRIES.SPHERE;
        if (type > 0.95) { geo = GEOMETRIES.STAR; }
        else if (type > 0.8) { geo = GEOMETRIES.BOX; }

        const color = getColor();
        const mat = getCachedMaterial(color);
        const mesh = new THREE.Mesh(geo, mat);
        
        mesh.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
        
        const heightFactor = 1 - (i / count); 
        const baseSize = (Math.random() * 0.2 + 0.15) * baseSizeConfig;
        const randomBonus = 0.5 + Math.random() * 1.0; 
        const sizeBonus = Math.pow(heightFactor, gapFactor) * randomBonus; 
        const finalScale = baseSize + sizeBonus;

        mesh.scale.setScalar(finalScale);
        
        mainGroupRef.current.add(mesh);
        
        particlesRef.current.push({
            mesh: mesh,
            velocity: new THREE.Vector3(),
            basePosition: new THREE.Vector3(),
            randomOffset: new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)),
            phase: Math.random() * Math.PI * 2,
            isWishItem: false,
            originalScale: finalScale
        });
    }

    // 3. Top Star
    const topStarGeo = new THREE.OctahedronGeometry(0.8, 0); 
    const topStarMat = new THREE.MeshStandardMaterial({ 
        color: COLORS.GOLD, 
        emissive: COLORS.GOLD, 
        emissiveIntensity: 1.0, 
        metalness: 1.0, 
        roughness: 0.2
    });
    const topStar = new THREE.Mesh(topStarGeo, topStarMat);
    mainGroupRef.current.add(topStar);
    particlesRef.current.push({
        mesh: topStar,
        velocity: new THREE.Vector3(),
        basePosition: new THREE.Vector3(0, 14, 0),
        randomOffset: new THREE.Vector3(),
        phase: 0,
        isWishItem: false,
        originalScale: 1.5
    });
  };

  const createSnow = () => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < SNOW_COUNT; i++) {
        vertices.push(
            (Math.random() - 0.5) * 60,
            Math.random() * 40 - 10,
            (Math.random() - 0.5) * 60
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true,
        opacity: 0.6
    });
    const snow = new THREE.Points(geometry, material);
    snowGroupRef.current.add(snow);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Init Scene ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000510, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 35);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Tone Mapping Settings to reduce burnout
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 0.9; 
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Post Processing ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    // Threshold high enough to ignore the card background (color 0.8 < 0.85)
    bloomPass.threshold = 0.85; 
    bloomPass.strength = 1.2; 
    bloomPass.radius = 0.5;
    bloomPassRef.current = bloomPass;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced ambient
    scene.add(ambientLight);
    
    // Front light specifically for Cards/Focus mode
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 0, 50);
    scene.add(frontLight);

    // Warm light
    const pointLight = new THREE.PointLight(0xffd700, 2.5, 100);
    pointLight.position.set(10, 20, 20);
    scene.add(pointLight);
    
    // Cool light
    const pointLight2 = new THREE.PointLight(0x87CEEB, 1.5, 100);
    pointLight2.position.set(-15, -10, 10);
    scene.add(pointLight2);
    
    const backLight = new THREE.DirectionalLight(0xff0000, 0.8);
    backLight.position.set(0, 5, -10);
    scene.add(backLight);

    // --- Objects ---
    scene.add(mainGroupRef.current);
    scene.add(snowGroupRef.current);

    initParticles();
    createSnow();

    // --- Animation Loop ---
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      timeRef.current += 0.01;
      const currentMode = modeRef.current;
      const currentGesture = gestureRef.current;
      const time = timeRef.current;
      const currentConfig = configRef.current;
      const activeWishId = activeWishIdRef.current;

      // Camera Movement
      const targetCamPos = (currentMode === AppMode.FOCUS) 
        ? new THREE.Vector3(0, 0, 7) 
        : new THREE.Vector3(0, 0, 35);
      
      const lerpFactor = currentMode === AppMode.FOCUS ? 0.1 : 0.05;
      camera.position.lerp(targetCamPos, lerpFactor);
      camera.lookAt(0, 0, 0);

      // Bloom Control
      if (bloomPassRef.current) {
         // Lower bloom strength further in focus mode to ensure clarity
         const targetStrength = currentMode === AppMode.FOCUS ? 0.2 : currentConfig.bloomStrength;
         bloomPassRef.current.strength = THREE.MathUtils.lerp(bloomPassRef.current.strength, targetStrength, 0.1);
      }

      // Group Rotation
      if (currentMode === AppMode.SCATTER && currentGesture.name !== 'NONE') {
          const targetRotY = (currentGesture.position.x - 0.5) * Math.PI * 2;
          const targetRotX = (currentGesture.position.y - 0.5) * Math.PI;
          mainGroupRef.current.rotation.y = THREE.MathUtils.lerp(mainGroupRef.current.rotation.y, targetRotY, 0.1);
          mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(mainGroupRef.current.rotation.x, targetRotX, 0.1);
      } else if (currentMode === AppMode.TREE) {
          mainGroupRef.current.rotation.y += 0.003;
          mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(mainGroupRef.current.rotation.x, 0, 0.05);
      } else if (currentMode === AppMode.SCATTER) {
          mainGroupRef.current.rotation.y += 0.0005;
      } else if (currentMode === AppMode.FOCUS) {
          mainGroupRef.current.rotation.y = THREE.MathUtils.lerp(mainGroupRef.current.rotation.y, 0, 0.05);
          mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(mainGroupRef.current.rotation.x, 0, 0.05);
      }

      // Particles
      let i = 0;
      const targetVec = new THREE.Vector3();
      const count = particlesRef.current.length;

      for (const p of particlesRef.current) {
        
        // Wish Item Visibility Logic
        if (p.isWishItem) {
            if (currentMode === AppMode.FOCUS) {
                // In FOCUS mode, ONLY show the active wish
                const isVisible = (p.wishId === activeWishId);
                p.mesh.visible = isVisible;
            } else {
                // In TREE/SCATTER, ALL wishes are visible particles
                p.mesh.visible = true;
            }
        }

        if (currentMode === AppMode.TREE) {
            const h = (i / count) * 25 - 12.5; 
            const radius = (12.5 - h) * 0.4; 
            const angle = i * 0.5 + time * 0.1;
            
            if (i === count - 1) {
                targetVec.set(0, 13, 0); 
            } else {
               targetVec.set(Math.cos(angle) * radius, h, Math.sin(angle) * radius);
            }
        } else if (currentMode === AppMode.SCATTER) {
            const noise = Math.sin(i * 0.5) + Math.cos(i * 0.3);
            const baseR = 12 + Math.abs(noise) * currentConfig.scatterRadius; 
            const theta = i * 0.05 + time * 0.02; 
            const phi = Math.acos( -1 + ( 2 * i ) / count ) + Math.sin(time * 0.2 + i) * 0.5;
            targetVec.setFromSphericalCoords(baseR, theta, phi);
        } else if (currentMode === AppMode.FOCUS) {
             if (p.isWishItem && p.wishId === activeWishId) {
                 // Active wish goes to center
                 targetVec.set(0, 0, 0); 
                 p.mesh.rotation.set(0,0,0);
             } else {
                 // All other particles (standard + hidden wishes) orbit around
                 const r = 40 + Math.sin(i)*10; 
                 const theta = i * 132.5;
                 const phi = i * 0.1;
                 targetVec.setFromSphericalCoords(r, theta, phi);
             }
        }

        p.mesh.position.lerp(targetVec, 0.06);
        
        // Scale & Animation
        let targetScale = p.originalScale;
        const breathe = Math.sin(time * 3 + p.phase) * 0.15 + 1.0;
        const metallicFlicker = Math.sin(time * 10 + p.phase * 10) * 0.1; 
        
        if (currentMode === AppMode.FOCUS && p.isWishItem && p.wishId === activeWishId) {
            targetScale = 2.5; 
            p.mesh.scale.setScalar(THREE.MathUtils.lerp(p.mesh.scale.x, targetScale, 0.15));
        } else {
            targetScale = p.originalScale * (breathe + metallicFlicker);
            p.mesh.scale.setScalar(targetScale);

            p.mesh.rotation.x += 0.02;
            p.mesh.rotation.y += 0.01;
        }

        if (currentMode !== AppMode.FOCUS || !p.isWishItem) {
            p.mesh.position.y += Math.sin(time * 2 + p.phase) * 0.02;
        }

        i++;
      }

      // Snow
      const positions = (snowGroupRef.current.children[0] as THREE.Points).geometry.attributes.position.array as Float32Array;
      for (let j = 1; j < positions.length; j += 3) {
          positions[j] -= 0.15;
          if (positions[j] < -25) positions[j] = 25;
      }
      (snowGroupRef.current.children[0] as THREE.Points).geometry.attributes.position.needsUpdate = true;

      composer.render();
    };

    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
          rendererRef.current.dispose();
          containerRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, []); 

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default Scene;