import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, ArrowLeft, Check, RefreshCcw } from 'lucide-react';

export function CaptureDrawing() {
  const { clientId, drawingTypeId } = useParams<{ clientId: string; drawingTypeId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Function to start the camera stream
  const startCamera = async () => {
    // Ensure any previous stream is stopped before starting a new one
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    setError(null); // Clear previous errors
    setIsCameraOn(false); // Show loading state
    setCapturedImage(null); // Ensure preview is cleared

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              facingMode: 'environment' // Prefer back camera if available
          } 
      });
      setStream(newStream);
      setIsCameraOn(true);
      if (videoRef.current) {
          videoRef.current.srcObject = newStream;
      }
      return newStream; // Return stream for cleanup reference
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof Error) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
               setError("Camera permission denied. Please enable camera access in your browser settings.");
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
               setError("No camera found. Please ensure a camera is connected and enabled.");
          } else {
               setError(`Failed to access camera: ${err.message}`);
          }
      } else {
          setError("An unknown error occurred while accessing the camera.");
      }
      setIsCameraOn(false);
      setStream(null);
      return null;
    }
  };

  // Request camera access on mount
  useEffect(() => {
    startCamera(); // Call the reusable function

    // Cleanup function: Use the stream from state
    return () => {
      // Access the stream directly from state for cleanup
      // This assumes the state holds the *last active* stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log("Camera stream stopped on unmount");
      } 
      // We don't need to setIsCameraOn(false) here as component is unmounting
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && isCameraOn) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth; 
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      } else {
        setError("Failed to get canvas context.");
      }
    } else {
        setError("Camera is not ready or refs are missing.");
    }
  };

  // Simplified retake function - just clear the image
  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null); // Also clear any capture-related errors if needed
    // No need to restart camera, stream is still active
  };

  const handleConfirmPhoto = () => {
    if (capturedImage) {
      console.log("Confirming image:", capturedImage.substring(0, 50) + "...");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <div className="relative flex justify-center items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-0 top-1/2 -translate-y-1/2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <h2 className="text-xl font-semibold">Capture Drawing</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-1 text-center">Client ID: {clientId}</p>
      <p className="text-sm text-muted-foreground mb-4 text-center">Drawing Type ID: {drawingTypeId}</p>

      <div className="relative w-full max-w-md aspect-video bg-muted rounded-md overflow-hidden mb-4 border mx-auto">
          {/* Error Display (always check first) */}
          {error && (
              <div className="absolute inset-0 flex items-center justify-center text-destructive text-center p-4 z-20 bg-background/80">
                  {error}
              </div>
          )}

          {/* Video Feed (Always rendered if camera is on and no error) */}
          {!error && (
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${isCameraOn ? '' : 'hidden'}`} // Only hide if camera is off
              />
          )}
          
          {/* Captured Image Preview (Absolutely positioned overlay) */}
          {capturedImage && (
              <img 
                  src={capturedImage} 
                  alt="Captured drawing" 
                  className="absolute inset-0 w-full h-full object-cover z-10"
              />
          )}

          {/* Loading/Camera Off Indicator (Handles initial state) */}
          {!isCameraOn && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-20 bg-background/80">
                  <CameraOff className="h-16 w-16 mb-2" />
                  <p>Starting camera...</p>
              </div>
          )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="flex justify-center gap-4 mt-4">
         {capturedImage ? (
            <>
                <Button variant="outline" onClick={retakePhoto}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Retake
                </Button>
                <Button size="lg" onClick={handleConfirmPhoto}>
                    <Check className="mr-2 h-4 w-4" /> Confirm
                </Button> 
            </>
         ) : (
            <>
                <Button variant="outline" disabled={!isCameraOn}>Gallery</Button>
                <Button size="lg" disabled={!isCameraOn} onClick={capturePhoto}>
                    <Camera className="mr-2 h-4 w-4" /> Capture
                </Button> 
            </>
         )}
      </div>

    </div>
  );
} 