import React, { useState, useRef, useEffect, useCallback } from 'react';
import Scene from './components/Scene';
import WebcamInput from './components/WebcamInput';
import Overlay from './components/Overlay';
import * as THREE from 'three';
import { AppMode, HandGesture, WishItem, WishType, ParticleConfig } from './types';
import { PARTICLE_COUNT } from './constants';

// Helper to create Text Texture
const createTextTexture = (text: string): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Bg - Beige (Rice White)
        ctx.fillStyle = '#F5F5DC'; 
        ctx.fillRect(0, 0, 512, 300);
        
        // Border
        ctx.strokeStyle = '#B01010'; // Darker red
        ctx.lineWidth = 15;
        ctx.strokeRect(0, 0, 512, 300);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, 492, 280);

        // Text - Title
        ctx.fillStyle = '#104020'; // Dark green
        ctx.font = 'bold 40px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 2;
        ctx.fillText("My Christmas Wish", 256, 60);
        ctx.shadowBlur = 0;
        
        // Text - Content
        ctx.fillStyle = '#111111'; // Black
        ctx.font = 'bold 32px Arial, sans-serif'; 
        const words = text.split(' ');
        let line = '';
        let y = 120;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > 450 && n > 0) {
                ctx.fillText(line, 256, y);
                line = words[n] + ' ';
                y += 40;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 256, y);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [gesture, setGesture] = useState<HandGesture>({ name: 'NONE', pinchDistance: 1, position: {x: 0.5, y: 0.5} });
  const [wishes, setWishes] = useState<WishItem[]>([]);
  
  // Configuration State
  const [config, setConfig] = useState<ParticleConfig>({
      particleCount: PARTICLE_COUNT,
      baseSize: 1.0, // Multiplier
      bloomStrength: 1.5,
      particleGlow: 1.0, // Default glow
      scatterRadius: 35,
      treeGapFactor: 3.0 // Higher = more gaps/size variation at bottom
  });

  const audioRef = useRef<HTMLAudioElement>(new Audio());

  const handleGesture = (g: HandGesture) => {
    setGesture(g);
    
    // State machine logic
    if (g.name === 'FIST') {
        setMode(AppMode.TREE);
    } else if (g.name === 'OPEN') {
        setMode(AppMode.SCATTER);
    } else if (g.name === 'PINCH' && mode !== AppMode.FOCUS) {
        setMode(AppMode.FOCUS);
    } else if (g.name !== 'PINCH' && mode === AppMode.FOCUS) {
        // Exit focus on release
        setMode(AppMode.SCATTER);
    } else if (g.name === 'NONE') {
        // Default to TREE if no gesture found
        setMode(AppMode.TREE);
    }
  };

  const addWish = async (type: WishType, content: string | File) => {
    const id = Date.now().toString();
    let texture: THREE.Texture | undefined;
    let aspectRatio = 1;

    if (type === 'TEXT') {
        texture = createTextTexture(content as string);
        aspectRatio = 1.7;
    } else if (type === 'PHOTO' && content instanceof File) {
        const url = URL.createObjectURL(content);
        const img = new Image();
        img.src = url;
        await new Promise((resolve) => { img.onload = resolve; });
        texture = new THREE.TextureLoader().load(url);
        // Fix color space for Three.js standard material
        texture.colorSpace = THREE.SRGBColorSpace; 
        aspectRatio = img.width / img.height;
    } else if (type === 'VIDEO' && content instanceof File) {
        const url = URL.createObjectURL(content);
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true; // Muted by default as requested
        video.playsInline = true;
        // video.play() is handled in Scene on focus
        
        // Wait for metadata to get ratio
        await new Promise((resolve) => { video.onloadedmetadata = resolve; });
        aspectRatio = video.videoWidth / video.videoHeight;
        texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
    }

    if (texture) {
        setWishes(prev => [...prev, { id, type, content: type === 'TEXT' ? content as string : '', texture, aspectRatio }]);
    }
  };

  const toggleMusic = (play: boolean) => {
    if (play) {
        audioRef.current.play().catch(e => {
            alert("Please interact with the page first to play audio.");
        });
    } else {
        audioRef.current.pause();
    }
  };

  const uploadMusic = (file: File) => {
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    audioRef.current.loop = true;
    audioRef.current.play();
  };

  return (
    <div className="relative w-full h-screen bg-[#000510] overflow-hidden select-none font-sans">
      <Scene 
        mode={mode} 
        gesture={gesture} 
        wishes={wishes} 
        setMode={setMode}
        config={config}
        onFocusItem={() => {}} // Handled inside scene usually but exposed if needed
      />
      
      <Overlay 
        mode={mode}
        loading={loading}
        config={config}
        setConfig={setConfig}
        onAddWish={addWish}
        onMusicToggle={toggleMusic}
        onMusicUpload={uploadMusic}
      />

      <WebcamInput 
        onGesture={handleGesture} 
        onLoaded={() => setLoading(false)} 
      />
    </div>
  );
};

export default App;