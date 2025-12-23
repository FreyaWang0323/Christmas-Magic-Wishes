import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { MP_VISION_PATH } from "../constants";
import { HandGesture } from "../types";

export class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private drawingUtils: DrawingUtils | null = null;
  private running = false;
  private lastVideoTime = -1;

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(MP_VISION_PATH);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      return true;
    } catch (error) {
      console.error("Failed to init HandLandmarker", error);
      return false;
    }
  }

  setupCanvas(canvas: HTMLCanvasElement) {
    this.canvasCtx = canvas.getContext("2d");
    if (this.canvasCtx) {
      this.drawingUtils = new DrawingUtils(this.canvasCtx);
    }
  }

  detect(video: HTMLVideoElement, canvas: HTMLCanvasElement): HandGesture {
    if (!this.handLandmarker || !this.canvasCtx || !this.drawingUtils) {
        return { name: 'NONE', pinchDistance: 1, position: {x: 0.5, y: 0.5} };
    }

    // Process frame
    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const results = this.handLandmarker.detectForVideo(video, performance.now());

      // Clear canvas
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw landmarks
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Mirror effect for drawing
        this.canvasCtx.translate(canvas.width, 0);
        this.canvasCtx.scale(-1, 1);
        
        this.drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#FF0000",
          lineWidth: 2
        });
        this.drawingUtils.drawLandmarks(landmarks, {
          color: "#FFD700",
          lineWidth: 1,
          radius: 3
        });

        this.canvasCtx.restore();

        // Interpret Gestures
        return this.interpretGesture(landmarks);
      }
    }
    
    return { name: 'NONE', pinchDistance: 1, position: {x: 0.5, y: 0.5} };
  }

  private interpretGesture(landmarks: any[]): HandGesture {
    // MediaPipe Landmarks: 
    // 0: Wrist, 4: Thumb Tip, 8: Index Tip, 12: Middle Tip, 16: Ring Tip, 20: Pinky Tip
    // 9: Middle Finger MCP (Center of hand roughly)

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    // Position (using Middle MCP as center anchor)
    const position = { x: middleMCP.x, y: middleMCP.y };

    // Distance calculation helper
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));

    // 1. PINCH Detection (Thumb tip close to Index tip)
    const pinchDist = dist(thumbTip, indexTip);
    
    // 2. FIST Detection (Tips close to wrist or MCPs)
    // Heuristic: Check average distance of non-thumb tips to wrist
    const avgTipDistToWrist = (dist(indexTip, wrist) + dist(middleTip, wrist) + dist(ringTip, wrist) + dist(pinkyTip, wrist)) / 4;
    
    // Thresholds (tune these based on testing)
    const PINCH_THRESHOLD = 0.05;
    const FIST_THRESHOLD = 0.4; // If tips are close to wrist relative to hand size approx

    // Determine State
    if (pinchDist < PINCH_THRESHOLD) {
      return { name: 'PINCH', pinchDistance: pinchDist, position };
    } else if (avgTipDistToWrist < 0.25) { // Needs empirical tuning, assuming normalized coords
       // A tight fist usually has tips very close to palm
       return { name: 'FIST', pinchDistance: pinchDist, position };
    } else {
      // Default to OPEN if not fist or pinch
      return { name: 'OPEN', pinchDistance: pinchDist, position };
    }
  }
}

export const visionService = new VisionService();
