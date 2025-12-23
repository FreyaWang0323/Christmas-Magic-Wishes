import React, { useState, useRef } from 'react';
import { AppMode, WishType, ParticleConfig } from '../types';

interface OverlayProps {
  onAddWish: (type: WishType, content: string | File) => void;
  onMusicToggle: (playing: boolean) => void;
  onMusicUpload: (file: File) => void;
  mode: AppMode;
  loading: boolean;
  config: ParticleConfig;
  setConfig: (config: ParticleConfig) => void;
}

const Overlay: React.FC<OverlayProps> = ({ 
    onAddWish, onMusicToggle, onMusicUpload, mode, loading, config, setConfig 
}) => {
  const [tipsOpen, setTipsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wishInputOpen, setWishInputOpen] = useState(false);
  const [wishText, setWishText] = useState("");
  const [musicPlaying, setMusicPlaying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
          const type = file.type.startsWith('video') ? 'VIDEO' : 'PHOTO';
          onAddWish(type, file);
      });
      e.target.value = ''; // Reset input to allow re-selecting same files
    }
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        onMusicUpload(e.target.files[0]);
        setMusicPlaying(true);
    }
  };

  const toggleMusic = () => {
    setMusicPlaying(!musicPlaying);
    onMusicToggle(!musicPlaying);
  };

  // Helper for sliders
  const updateConfig = (key: keyof ParticleConfig, value: number) => {
      setConfig({ ...config, [key]: value });
  };

  const buttonClass = "bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full hover:bg-white/20 transition text-sm font-semibold shadow-lg flex items-center gap-2";

  if (loading) return (
    <div className="absolute inset-0 flex items-center justify-center bg-black z-[100] text-white flex-col">
       <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mb-4"></div>
       <h2 className="text-xl font-light tracking-widest text-gold-400">LOADING MAGIC...</h2>
       <p className="text-sm text-gray-400 mt-2">Allow camera access to interact</p>
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Header - Artistic Title */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-yellow-300 to-green-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform -rotate-2" style={{ fontFamily: '"Brush Script MT", cursive' }}>
          Merry Christmas~
        </h1>
        <p className="text-blue-100 text-lg ml-2 mt-[-5px] tracking-widest font-serif italic opacity-90 drop-shadow-md">
          ~ Where your wishes become stars ~
        </p>
      </div>

      {/* Top Right Controls: Wishes & Music */}
      <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-auto items-end">
        {/* Wish Buttons */}
        <div className="flex gap-2">
            <button 
                onClick={() => setWishInputOpen(true)}
                className={buttonClass}
            >
                <span>✨</span> Wishes
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className={buttonClass}
            >
                <span>📷</span> Photo/Video
            </button>
        </div>

        {/* Music Control Group - Redesigned */}
        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg overflow-hidden group">
            <button 
                onClick={() => musicInputRef.current?.click()}
                className="px-4 py-2 text-white hover:bg-white/10 border-r border-white/20 transition text-sm font-medium flex items-center gap-2"
            >
                <span>♫</span> Music
            </button>
            <button 
                onClick={toggleMusic}
                className={`w-12 h-full py-2 flex items-center justify-center transition hover:bg-white/20 ${musicPlaying ? 'text-green-400' : 'text-white'}`}
                title={musicPlaying ? "Pause" : "Play"}
            >
                {musicPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
            </button>
        </div>
      </div>

      {/* Bottom Left Stack: Horizontal Row of (Column) and (Mode) */}
      <div className="absolute bottom-6 left-6 flex flex-row items-end gap-3 pointer-events-auto">
          
          {/* Vertical Column: Settings (Top) -> Tips (Bottom) */}
          <div className="flex flex-col gap-3 items-center">
            
            {/* Settings Button (Top of column) */}
            <div className="relative">
                {/* Settings Panel (Pop up to the right or top - let's go top-right relative to button to avoid overlap) */}
                {settingsOpen && (
                  <div className="absolute bottom-14 left-0 w-64 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl z-50">
                      <h3 className="text-white text-sm font-bold mb-3 border-b border-white/10 pb-2">PARTICLE SETTINGS</h3>
                      
                      <div className="space-y-4">
                          <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Count</span>
                                  <span>{config.particleCount}</span>
                              </div>
                              <input 
                                  type="range" min="500" max="3000" step="100"
                                  value={config.particleCount} 
                                  onChange={(e) => updateConfig('particleCount', parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                              />
                          </div>

                          <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Size</span>
                                  <span>{config.baseSize.toFixed(1)}x</span>
                              </div>
                              <input 
                                  type="range" min="0.5" max="2.0" step="0.1"
                                  value={config.baseSize} 
                                  onChange={(e) => updateConfig('baseSize', parseFloat(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                              />
                          </div>

                          <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Glow/Bloom</span>
                                  <span>{config.bloomStrength.toFixed(1)}</span>
                              </div>
                              <input 
                                  type="range" min="0" max="3.0" step="0.1"
                                  value={config.bloomStrength} 
                                  onChange={(e) => updateConfig('bloomStrength', parseFloat(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                              />
                          </div>

                          <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Particle Emission</span>
                                  <span>{config.particleGlow.toFixed(1)}</span>
                              </div>
                              <input 
                                  type="range" min="0" max="5.0" step="0.2"
                                  value={config.particleGlow} 
                                  onChange={(e) => updateConfig('particleGlow', parseFloat(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                              />
                          </div>

                          <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Scatter Radius</span>
                                  <span>{config.scatterRadius}</span>
                              </div>
                              <input 
                                  type="range" min="10" max="100" step="5"
                                  value={config.scatterRadius} 
                                  onChange={(e) => updateConfig('scatterRadius', parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                          </div>

                           <div>
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
                                  <span>Tree Bottom Gaps</span>
                                  <span>{config.treeGapFactor.toFixed(1)}</span>
                              </div>
                              <input 
                                  type="range" min="1.0" max="5.0" step="0.5"
                                  value={config.treeGapFactor} 
                                  onChange={(e) => updateConfig('treeGapFactor', parseFloat(e.target.value))}
                                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                          </div>
                      </div>
                  </div>
                )}

                <button 
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition shadow-lg backdrop-blur-md text-xl ${settingsOpen ? 'bg-white/20 border-white/40 text-yellow-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                    title="Settings"
                >
                    ⚙
                </button>
            </div>

            {/* Tips Button (Bottom of column) */}
            <div className="relative">
              {/* Tips Pop-up */}
              {tipsOpen && (
                   <div className="absolute bottom-14 left-0 w-56 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white text-xs shadow-xl z-50">
                       <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                           <span className="font-bold text-yellow-400">GESTURES</span>
                           <button onClick={() => setTipsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                       </div>
                       <ul className="space-y-2">
                           <li className="flex items-center gap-2"><span className="text-lg">✊</span> <span>Fist: <b>TREE</b> mode</span></li>
                           <li className="flex items-center gap-2"><span className="text-lg">🖐</span> <span>Open: <b>SCATTER</b> mode</span></li>
                           <li className="flex items-center gap-2"><span className="text-lg">👌</span> <span>Pinch: <b>FOCUS</b> mode</span></li>
                       </ul>
                       <p className="mt-2 text-gray-400 italic font-thin opacity-70">
                           In Scatter mode, move hand to rotate view.
                       </p>
                   </div>
              )}
              
              <button 
                  onClick={() => setTipsOpen(!tipsOpen)} 
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition shadow-lg backdrop-blur-md text-lg font-serif italic ${tipsOpen ? 'bg-white/20 border-white/40 text-yellow-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
              >
                  ?
              </button>
            </div>
          </div>

          {/* Mode Indicator - To the right of the Tips button (since this flex row aligns items-end, it will be next to the bottom element) */}
          <div className="h-12 flex items-center px-4 bg-black/60 backdrop-blur rounded-full border border-white/10 text-white/90 text-xs tracking-widest uppercase shadow-lg">
              MODE: <span className="text-yellow-400 font-bold ml-2 text-sm">{mode}</span>
          </div>
      </div>

      {/* Inputs (Hidden) */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
      <input type="file" ref={musicInputRef} className="hidden" accept="audio/*" onChange={handleMusicChange} />

      {/* Text Wish Modal */}
      {wishInputOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
            <div className="bg-white/10 border border-white/20 p-6 rounded-xl w-80 shadow-2xl backdrop-blur-lg">
                <h3 className="text-white text-lg mb-4 font-semibold">Make a Wish</h3>
                <textarea 
                    value={wishText}
                    onChange={(e) => setWishText(e.target.value)}
                    className="w-full h-32 bg-black/30 text-white p-3 rounded border border-white/10 focus:outline-none focus:border-yellow-400 resize-none"
                    placeholder="Type your wish..."
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setWishInputOpen(false)} className="px-4 py-1 text-gray-300 hover:text-white">Cancel</button>
                    <button 
                        onClick={() => {
                            if(wishText) onAddWish('TEXT', wishText);
                            setWishText("");
                            setWishInputOpen(false);
                        }} 
                        className="px-4 py-1 bg-red-600 rounded text-white hover:bg-red-500"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Overlay;