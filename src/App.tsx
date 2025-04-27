// import './App.css'
import { lazy, Suspense } from 'react'; // Import lazy and Suspense
import { LoginForm } from "@/components/LoginForm"
import { useAuth } from "@/contexts/AuthContext"
import { ClientList } from "@/components/ClientList"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Import routing components and useLocation
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion
// import { LogOut } from 'lucide-react'; // Import LogOut icon ONLY
// import { 
//   Tooltip, 
//   TooltipContent, 
//   TooltipProvider, 
//   TooltipTrigger 
// } from "@/components/ui/tooltip"; // Import Tooltip components
// Import BottomNav
import BottomNav from '@/components/BottomNav';
// Import SidebarNav
import SidebarNav from '@/components/SidebarNav';
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
// Lazy load SettingsPage
const SettingsPage = lazy(() =>
  import('@/components/SettingsPage').then(module => ({ default: module.SettingsPage }))
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

  // If loading session, show loading indicator (optional but good UX)
  // const { loading } = useAuth(); // Can get loading state if needed
  // if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      {session ? (
        // Changed structure: Flex container for Sidebar + Main Content
        <div className="flex h-screen">
          {/* Sidebar (Desktop Only) */}
          <SidebarNav />
              
          {/* Main Content Area (takes remaining space, handles scrolling) */}
          <div className="flex-grow flex flex-col">
            {/* Main scrollable content with padding */}
            {/* Added ml-0 md:ml-60 for sidebar offset */}
            <main className="flex-grow overflow-y-auto p-4 pb-20 md:p-6 md:pb-6 md:ml-60">
              {/* AnimatePresence manages exit/enter animations */}
              <AnimatePresence mode="wait">
                <Suspense fallback={<RouteLoadingFallback />}>
                  {/* Routes remain inside the scrollable main area */}
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
                    <Route 
                      path="/settings"
                      element={
                        <motion.div
                          initial="initial"
                          animate="in"
                          exit="out"
                          variants={pageVariants}
                          transition={pageTransition}
                        >
                          <SettingsPage />
                        </motion.div>
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} /> 
                  </Routes>
                </Suspense>
              </AnimatePresence>
            </main>

            {/* Bottom Nav (Mobile Only) */}
            <BottomNav /> 
          </div>
        </div>
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
