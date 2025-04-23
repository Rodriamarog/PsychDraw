// import './App.css'
import { lazy, Suspense } from 'react'; // Import lazy and Suspense
import { LoginForm } from "@/components/LoginForm"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { ClientList } from "@/components/ClientList"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Import routing components and useLocation
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion
import { LogOut } from 'lucide-react'; // Import LogOut icon
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"; // Import Tooltip components
// Lazy load ClientDetail
const ClientDetail = lazy(() => 
  import('@/components/ClientDetail').then(module => ({ default: module.ClientDetail }))
);
// Corrected lazy load for CaptureDrawing (named export)
const CaptureDrawing = lazy(() => 
  import('@/components/CaptureDrawing').then(module => ({ default: module.CaptureDrawing }))
);
// Lazy load AnalysisDetail
const AnalysisDetail = lazy(() => 
  import('@/components/AnalysisDetail').then(module => ({ default: module.AnalysisDetail }))
);
// import { ClientDetail } from "@/components/ClientDetail"; // We'll create this next

// Simple fallback component for Suspense
const RouteLoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    {/* Optional: Add a Spinner component here later */}
    <p>Loading page...</p>
  </div>
);

// Animation settings
const pageVariants = {
  initial: {
    opacity: 0,
    // y: 20 // Optional: slight vertical slide
  },
  in: {
    opacity: 1,
    // y: 0
  },
  out: {
    opacity: 0,
    // y: -20 // Optional: slight vertical slide
  }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate", // Or "easeInOut"
  duration: 0.4 // Adjust duration as needed
};

function App() {
  const { session } = useAuth();
  const location = useLocation(); // Get location for AnimatePresence key

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      // Optionally show an error message to the user
    }
    // AuthProvider listener will automatically update the session state
  };

  // If loading session, show loading indicator (optional but good UX)
  // const { loading } = useAuth(); // Can get loading state if needed
  // if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      {session ? (
        // Wrap logged-in view with TooltipProvider
        <TooltipProvider delayDuration={100}> 
          <>
            <header className="sticky top-0 z-10 flex justify-between items-center p-3 md:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              {/* Removed the PsychDraw title span */}
              {/* Placeholder for potential future logo/branding if needed */}
              <div className="w-1/3"> {/* Add div to help balance flex layout */} </div> 
              
              {/* Centered element placeholder if needed */}
              <div className="w-1/3 text-center"></div>

              {/* Logout Button pushed to the right */}
              <div className="w-1/3 flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleLogout}
                      variant="ghost" 
                      size="icon" // Use icon size
                      className='h-8 w-8 md:h-9 md:w-9' // Slightly adjust size for touch/desktop
                    >
                      <LogOut className="h-4 w-4 md:h-5 md:w-5" /> {/* Icon */}
                      <span className="sr-only">Logout</span> {/* Screen reader text */}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </header>
            <main className="flex-grow p-4 md:p-6">
              {/* AnimatePresence manages exit/enter animations */}
              <AnimatePresence mode="wait">
                <Suspense fallback={<RouteLoadingFallback />}>
                  {/* Pass location and key to Routes for AnimatePresence */}
                  <Routes location={location} key={location.pathname}>
                    <Route 
                      path="/" 
                      element={
                        <motion.div // Wrap route element
                          initial="initial"
                          animate="in"
                          exit="out"
                          variants={pageVariants}
                          transition={pageTransition}
                        >
                          <ClientList />
                        </motion.div>
                      } 
                    />
                    <Route 
                      path="/client/:clientId" 
                      element={
                        <motion.div // Wrap route element
                          initial="initial"
                          animate="in"
                          exit="out"
                          variants={pageVariants}
                          transition={pageTransition}
                        >
                          <ClientDetail />
                        </motion.div>
                      } 
                    />
                    <Route 
                      path="/client/:clientId/capture/:drawingTypeId" 
                      element={
                        <motion.div 
                          initial="initial"
                          animate="in"
                          exit="out"
                          variants={pageVariants}
                          transition={pageTransition}
                        >
                          <CaptureDrawing />
                        </motion.div>
                      } 
                    />
                    <Route 
                      path="/analysis/:analysisId" 
                      element={
                        <motion.div 
                          initial="initial"
                          animate="in"
                          exit="out"
                          variants={pageVariants}
                          transition={pageTransition}
                        >
                          <AnalysisDetail />
                        </motion.div>
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} /> 
                  </Routes>
                </Suspense>
              </AnimatePresence>
            </main>
          </>
        </TooltipProvider>
      ) : (
        // Logged-out view: Only the Login Form, centered
        <div className="flex justify-center items-center flex-grow p-4">
          <LoginForm />
        </div>
      )}
    </div>
  )
}

export default App
