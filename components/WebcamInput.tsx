import React, { useEffect, useRef, useState } from 'react';
import { visionService } from '../services/visionService';
import { HandGesture } from '../types';

interface WebcamInputProps {
  onGesture: (gesture: HandGesture) => void;
  onLoaded: () => void;
}

const WebcamInput: React.FC<WebcamInputProps> = ({ onGesture, onLoaded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const init = async () => {
      const success = await visionService.initialize();
      if (!success) return;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 320, height: 240, frameRate: 30 } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
              if (canvasRef.current) {
                  visionService.setupCanvas(canvasRef.current);
              }
              onLoaded();
              detectLoop();
            };
          }
        } catch (err) {
          console.error("Webcam access denied", err);
        }
      }
    };

    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Clean up stream tracks
      if (videoRef.current && videoRef.current.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const detectLoop = () => {
    if (videoRef.current && canvasRef.current) {
       const gesture = visionService.detect(videoRef.current, canvasRef.current);
       onGesture(gesture);
    }
    requestRef.current = requestAnimationFrame(detectLoop);
  };

  return (
    <div className={`absolute bottom-4 right-4 bg-black/80 rounded-lg overflow-hidden border border-white/20 shadow-2xl z-50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-10 h-10 flex items-center justify-center cursor-pointer' : 'w-32 h-24 sm:w-48 sm:h-36'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        className={`absolute z-50 text-white/80 hover:text-white bg-black/40 rounded-full flex items-center justify-center transition-all ${isCollapsed ? 'inset-0 w-full h-full' : 'top-1 right-1 w-6 h-6'}`}
        title={isCollapsed ? "Show Webcam" : "Hide Webcam"}
      >
         {isCollapsed ? '📷' : '▼'}
      </button>

      {/* Video Content */}
      <div className={`relative w-full h-full transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-50" />
         <canvas ref={canvasRef} width={320} height={240} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default WebcamInput;