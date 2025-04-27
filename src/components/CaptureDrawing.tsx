import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, ArrowLeft, Check, RefreshCw, Image as ImageIcon, Loader2, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to convert Data URL to Blob
function dataURLtoBlob(dataurl: string): Blob | null {
    try {
        const arr = dataurl.split(',');
        if (!arr[0]) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch || !mimeMatch[1]) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[arr.length - 1]); // Use arr.length - 1 for robustness
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    } catch (error) {
        console.error("Error converting data URL to Blob:", error);
        return null;
    }
}

export function CaptureDrawing() {
  const { clientId, drawingTypeId } = useParams<{ clientId: string; drawingTypeId: string }>();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Store the original, unrotated image
  const [isConfirming, setIsConfirming] = useState(false);
  // State for dynamic aspect ratio
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(3/4); // Default aspect ratio (e.g., portrait)
  const [rotationAngle, setRotationAngle] = useState(0); // Track the current rotation angle

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

  // Function called when video metadata is loaded
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const aspectRatio = video.videoWidth / video.videoHeight;
      if (aspectRatio && !isNaN(aspectRatio)) {
        setVideoAspectRatio(aspectRatio);
        console.log("Video aspect ratio set:", aspectRatio);
      }
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
        setOriginalImage(dataUrl); // Store original image for rotations
        setRotationAngle(0); // Reset rotation angle
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
    setOriginalImage(null); // Clear original image too
    setRotationAngle(0); // Reset rotation angle
    setError(null); // Also clear any capture-related errors if needed
    // No need to restart camera, stream is still active
  };

  // Function to handle file selection from gallery
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous errors
    const file = event.target.files?.[0];
    if (file) {
      // Basic type check
      if (!file.type.startsWith('image/')) {
        setError("Selected file is not an image.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          const imageData = loadEvent.target.result as string;
          setCapturedImage(imageData);
          setOriginalImage(imageData); // Store original image for rotations
          setRotationAngle(0); // Reset rotation angle
        } else {
          setError("Failed to read selected file.");
        }
      };
      reader.onerror = () => {
        setError("Error reading file.");
      };
      reader.readAsDataURL(file);
    }
     // Reset input value so the same file can be selected again if needed
     if (event.target) {
         event.target.value = "";
     }
  };

  // Function to rotate the captured image
  const rotateImage = () => {
    if (!originalImage) return; // Use originalImage instead of capturedImage

    // Calculate new rotation angle (add 90 degrees)
    const newRotationAngle = (rotationAngle + 90) % 360;
    
    // Create a temporary image to get dimensions
    const img = new window.Image();
    img.src = originalImage; // Always use the original image for rotation
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Determine if output should be portrait or landscape
      const isPortrait = newRotationAngle === 90 || newRotationAngle === 270;
      
      // Set canvas dimensions based on rotation
      if (isPortrait) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Translate to center of canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotationAngle * Math.PI) / 180);
      
      // Draw the image centered
      ctx.drawImage(
        img, 
        -img.width / 2,
        -img.height / 2
      );
      
      // Update the image state with the rotated version
      const rotatedImage = canvas.toDataURL('image/jpeg');
      setCapturedImage(rotatedImage); // Only update the displayed image
      setRotationAngle(newRotationAngle);
    };
  };

  const handleConfirmPhoto = async () => {
    if (!capturedImage || !clientId || !drawingTypeId || !user) {
        setError("Missing required data or user information to confirm photo.");
        return;
    }

    setIsConfirming(true);
    setError(null);

    try {
        const blob = dataURLtoBlob(capturedImage);
        if (!blob) {
            throw new Error("Failed to convert image data.");
        }

        // Define unique file path starting with psychologist ID
        const fileExt = blob.type.split('/')[1] || 'jpg'; // Get extension from mime type
        const filePath = `${user.id}/${clientId}/${drawingTypeId}-${uuidv4()}.${fileExt}`; // Corrected path structure

        // Upload to Supabase Storage
        console.log(`Uploading to: ${filePath}`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('temp-drawings') // Corrected bucket name
            .upload(filePath, blob, {
                contentType: blob.type,
                upsert: false // Don't overwrite existing files (optional)
            });

        if (uploadError) {
            console.error("Supabase Storage Error:", uploadError);
            throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        console.log("Upload successful:", uploadData);

        // Insert into Database using temp_drawing_path
        const { error: dbError } = await supabase
            .from('drawing_analyses')
            .insert({
                client_id: clientId,
                drawing_type_id: drawingTypeId,
                temp_drawing_path: filePath, // Save the storage path
                psychologist_id: user.id, // Make sure psychologist_id is included!
                raw_analysis: {} // Add default empty JSONB for raw_analysis (assuming NOT NULL)
            });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            // TODO: Consider deleting the uploaded image from storage if DB insert fails?
            throw new Error(`Failed to save analysis record: ${dbError.message}`);
        }

        console.log("Analysis record created successfully!");
        // Success - Navigate back to client detail page
        navigate(`/client/${clientId}`); // Navigate directly to ensure state refresh

    } catch (err: any) {
        console.error("Error during confirmation:", err);
        setError(err.message || "An unexpected error occurred during confirmation.");
    } finally {
        setIsConfirming(false);
    }
  };

  // Function to trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
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

      {/* Camera container - Apply dynamic aspect ratio */}
      {/* Removed aspect-[3/4] class, added inline style */}
      <div 
        className="relative w-full max-w-md bg-muted rounded-md overflow-hidden mb-4 border mx-auto"
        style={{ aspectRatio: videoAspectRatio }}
      >
          {/* Error Display (always check first) */}
          {error && (
              <div className="absolute inset-0 flex items-center justify-center text-destructive text-center p-4 z-20 bg-background/80">
                  {error}
              </div>
          )}

          {/* Video Feed - Add onLoadedMetadata and hide if image captured */}
          {!error && (
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  onLoadedMetadata={handleVideoMetadataLoaded} // Add handler
                  // Hide if camera off OR if an image is captured
                  className={`w-full h-full object-cover ${ (isCameraOn && !capturedImage) ? '' : 'hidden'}`} 
              />
          )}
          
          {/* Captured Image Preview - Change to object-contain */}
          {capturedImage && (
              <img 
                  src={capturedImage} 
                  alt="Captured drawing" 
                  // Changed object-cover to object-contain
                  className="absolute inset-0 w-full h-full object-contain z-10 bg-muted" // Added bg-muted for letterboxing
              />
          )}

          {/* Loading/Camera Off Indicator (Handles initial state) */}
          {!isCameraOn && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-20 bg-background/80">
                  <Loader2 className="h-12 w-12 mb-3 animate-spin" />
                  <p>Starting camera...</p>
              </div>
          )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        style={{ display: 'none' }} 
      />

      <div className="flex flex-col space-y-4">
        <div className="flex justify-center space-x-4">
          {capturedImage ? (
            <>
              <Button 
                onClick={retakePhoto} 
                variant="outline"
                className="w-1/3 space-x-2"
                disabled={isConfirming}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </Button>
              
              {/* Rotate button */}
              <Button 
                onClick={rotateImage} 
                variant="outline"
                className="w-1/3 space-x-2"
                disabled={isConfirming}
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotate</span>
              </Button>

              <Button 
                onClick={handleConfirmPhoto} 
                variant="default"
                className="w-1/3 space-x-2" 
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isConfirming ? 'Confirming...' : 'Confirm'}</span>
              </Button>
            </>
          ) : (
            <>
                <Button variant="outline" onClick={triggerFileInput} className="flex-1"> 
                    <ImageIcon className="mr-2 h-4 w-4" /> Gallery 
                </Button>
                <Button disabled={!isCameraOn} onClick={capturePhoto} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" /> Capture
                </Button> 
            </>
         )}
        </div>
      </div>

    </div>
  );
} 