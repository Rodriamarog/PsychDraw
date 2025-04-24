import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, FilePlus2, FileText, Home, TreeDeciduous, User, Users, ChevronRight, XIcon, ClipboardList, Loader2, ChevronLeft, Mars, Venus, Transgender, CloudHail, Component } from 'lucide-react'; // Icons
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Label } from "@/components/ui/label"; // Import Label
import { Badge } from "@/components/ui/badge"; // Import Badge
// Import Input
import { Input } from "@/components/ui/input";
// Import motion and AnimatePresence
import { motion, AnimatePresence } from 'framer-motion'; 
// Import generated types
import type { Database } from '@/lib/database.types';
// Import AlertDialog components
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

// Use generated types directly
// Redefine ClientDetails to match the selected fields precisely
type ClientDetails = {
  id: string;
  name: string;
  age: number | null;
  gender: Database['public']['Enums']['gender_enum'] | null; // Use generated Enum type
};

// Define the shape for the analysis query result, including the joined type
type AnalysisQueryResult = (Database['public']['Tables']['drawing_analyses']['Row'] & {
  // Ensure Row includes temp_drawing_path and drawing_processed from the base type
  drawing_types: Pick<Database['public']['Tables']['drawing_types']['Row'], 'name'> | null;
  // Add visual stage tracking
  visual_stage?: 'analyzing' | 'generating' | 'finalizing' | 'complete' | null; 
  backend_processed?: boolean; // Track actual backend status separately
});

// Use generated types for drawing types
type DrawingType = Database['public']['Tables']['drawing_types']['Row'];

// Helper function to get an icon based on drawing type name
const getDrawingTypeIcon = (typeName: string): React.ElementType => {
  const lowerCaseName = typeName.toLowerCase();
  let IconComponent: React.ElementType = FileText; // Default icon

  // Order matters - check more specific terms first
  if (lowerCaseName.includes('house') && lowerCaseName.includes('tree') && lowerCaseName.includes('person')) {
    IconComponent = Home; 
  } else if (lowerCaseName.includes('kinetic') && lowerCaseName.includes('family')) {
    IconComponent = Component; // Changed to Component for KFD
  } else if (lowerCaseName.includes('person') && lowerCaseName.includes('rain')) {
    IconComponent = CloudHail; // Added specific icon for Person Under Rain
  } else if (lowerCaseName.includes('family')) {
    IconComponent = Users;
  } else if (lowerCaseName.includes('person')) {
    // Catch DAP (Draw-A-Person) that doesn't include 'rain'
    IconComponent = User;
  } else if (lowerCaseName.includes('tree')) {
    IconComponent = TreeDeciduous;
  } else if (lowerCaseName.includes('house')) {
    IconComponent = Home;
  }
  
  return IconComponent; 
};

// Skeleton for Client Detail Page
const ClientDetailSkeleton = () => (
  <div className="space-y-6 max-w-4xl mx-auto">
    {/* Header Section Skeleton */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" /> {/* Back button */}
        <Skeleton className="h-7 w-48" /> {/* Client Name */}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Skeleton className="h-9 w-24 rounded-md" /> {/* Edit button */}
        <Skeleton className="h-9 w-40 rounded-md" /> {/* New Analysis button */}
      </div>
    </div>

    {/* Analysis History Card Skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3 mb-1" /> {/* Card Title */}
        <Skeleton className="h-4 w-2/3" /> {/* Card Description */}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Skeleton list items */}
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  </div>
);

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate(); // Initialize useNavigate
  
  // Use generated types for state
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisQueryResult[]>([]); // Use the query result type
  const [drawingTypes, setDrawingTypes] = useState<DrawingType[]>([]); // State for drawing types
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true); // Loading state for types
  const [error, setError] = useState<string | null>(null);
  
  // State for New Analysis Dialog
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  // State for Edit Client Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editClientAge, setEditClientAge] = useState<string | number>(""); // Use string for input binding
  const [editClientGender, setEditClientGender] = useState<ClientDetails['gender'] | "">(null);
  const [isUpdatingClient, setIsUpdatingClient] = useState(false); // Loading state for update
  const [updateClientError, setUpdateClientError] = useState<string | null>(null); // Error state for update
  // State for Delete Confirmation
  const [isDeletingClient, setIsDeletingClient] = useState(false); // Loading state for delete
  
  // Pagination State
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for the new analysis form inside the dialog
  const [selectedDrawingTypeId, setSelectedDrawingTypeId] = useState<string>("");
  const [analysisTitle, setAnalysisTitle] = useState(""); // Add state for title later
  const [drawingImageFile, setDrawingImageFile] = useState<File | null>(null); // Add state for image later
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false); // Loading state for submission
  const [startAnalysisError, setStartAnalysisError] = useState<string | null>(null); // Error state for submission

  // Calculate pagination variables
  const totalPages = Math.ceil(analyses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAnalyses = analyses.slice(startIndex, endIndex);

  const analysisTimers = useRef<{ [key: string]: NodeJS.Timeout[] }>({}); // Store timers per analysis ID

  // --- Data Fetching Effects --- (Basic implementations)
  useEffect(() => {
    const fetchClientData = async () => {
        if (!clientId) return;
        setLoadingClient(true);
        setError(null);
        try {
            // Type safety from generated types!
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, age, gender') 
                .eq('id', clientId)
                .returns<ClientDetails | null>() // Use the redefined ClientDetails type
                .single(); 
            
            if (error) throw error;
            if (!data) throw new Error("Client not found");
            // Set the client state - type should now match
            setClient(data);
        } catch (err) {
            console.error("Error fetching client details:", err);
            setError(err instanceof Error ? err.message : 'Failed to load client data');
        } finally {
            setLoadingClient(false);
        }
    };

    // Implement actual fetching for analyses
    const fetchAnalyses = async () => {
        if (!clientId) return;
        setLoadingAnalyses(true);
        setError(null); 
        try {
            const { data, error: dbError } = await supabase
                .from('drawing_analyses')
                .select(`
                    id, analysis_date, title, temp_drawing_path, 
                    drawing_processed, raw_analysis, 
                    drawing_types!fk_drawing_type ( name ) 
                `)
                .eq('client_id', clientId)
                .order('analysis_date', { ascending: false })
                .returns<Omit<AnalysisQueryResult, 'visual_stage' | 'backend_processed'>[]>(); // Fetch base data

            if (dbError) throw dbError;
            
            // Initialize visual state for fetched analyses
            const initializedAnalyses = (data || []).map(a => ({
                ...a,
                // Map null/false from DB to false, true to true
                backend_processed: a.drawing_processed === true, 
                // Explicitly cast the initial stage to the correct type
                visual_stage: (a.drawing_processed ? 'complete' : 'analyzing') as AnalysisQueryResult['visual_stage'] 
            }));
            setAnalyses(initializedAnalyses);

        } catch (err) {
            console.error("Error fetching analyses:", err);
            setError(err instanceof Error ? err.message : 'Failed to load analysis history');
            setAnalyses([]);
        } finally {
            setLoadingAnalyses(false);
        }
    };

    // Fetch Drawing Types
    const fetchDrawingTypes = async () => {
        setLoadingTypes(true);
        try {
            const { data, error } = await supabase
                .from('drawing_types')
                // Select fields matching the generated DrawingType
                .select('id, name, description, created_at') 
                .order('name')
                .returns<DrawingType[]>(); // Use the type here
            
            if (error) throw error;
            setDrawingTypes(data || []);
        } catch (err) { 
            console.error("Error fetching drawing types:", err);
            // Handle error - maybe disable the New Analysis button?
            setError(err instanceof Error ? err.message : 'Failed to load drawing types');
        } finally {
            setLoadingTypes(false);
        }
    };

    fetchClientData();
    fetchAnalyses();
    fetchDrawingTypes(); // Fetch types on component mount

  }, [clientId]);

  // --- Realtime Subscription for Analysis Updates ---
  useEffect(() => {
    if (!clientId) return; // Don't subscribe without a client ID

    // Define the channel specific to this client's analyses
    const channel = supabase.channel(`analysis-updates-${clientId}`)
      .on<
        Database['public']['Tables']['drawing_analyses']['Row'] // Specify the payload type
      >(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'drawing_analyses', 
          filter: `client_id=eq.${clientId}` // Filter for the current client
        },
        (payload) => {
          console.log('Realtime update (backend processed):', payload.new.id, payload.new.drawing_processed);
          // Mark backend as processed, but don't change visual stage here
          setAnalyses(currentAnalyses => 
            currentAnalyses.map(analysis => 
              analysis.id === payload.new.id 
                ? { ...analysis, backend_processed: payload.new.drawing_processed ?? analysis.backend_processed }
                : analysis
            )
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime channel subscribed for client ${clientId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error:', err);
          // Optionally set an error state or notify the user
        }
      });

    // Cleanup function to remove the channel subscription
    return () => {
      supabase.removeChannel(channel);
      console.log(`Realtime channel unsubscribed for client ${clientId}`);
    };

  }, [clientId]); // Re-run effect if clientId changes

  // --- Visual Stage Timer Logic ---
  useEffect(() => {
    analyses.forEach(analysis => {
      if (analysis.visual_stage && analysis.visual_stage !== 'complete' && !analysisTimers.current[analysis.id]) {
        // Clear any lingering timers for this ID just in case
        if (analysisTimers.current[analysis.id]) {
            analysisTimers.current[analysis.id].forEach(clearTimeout);
        }
        analysisTimers.current[analysis.id] = []; // Initialize timer array for this analysis
        
        console.log(`Starting visual timer sequence for ${analysis.id} at stage ${analysis.visual_stage}`);

        let currentStage = analysis.visual_stage;

        const scheduleNextStage = (stage: AnalysisQueryResult['visual_stage'], delay: number) => {
          const timerId = setTimeout(() => {
            // Only proceed if backend is actually done when reaching final visual stage
            if (stage === 'complete' && !analysis.backend_processed) {
              console.log(`Visual stage ${analysis.id} waiting for backend completion before marking complete.`);
              // Re-schedule check for completion later? Or rely on backend_processed update? 
              // For simplicity, let's just wait. The Realtime update effect will trigger re-render.
              // We could potentially reschedule this check if needed:
              // analysisTimers.current[analysis.id] = [scheduleNextStage('complete', 1000)]; // Check again in 1s
              return; 
            }
            
            console.log(`Updating visual stage for ${analysis.id} to ${stage}`);
            setAnalyses(prev => prev.map(a => a.id === analysis.id ? { ...a, visual_stage: stage } : a));
            // Remove this timer ID from the ref
            analysisTimers.current[analysis.id] = analysisTimers.current[analysis.id]?.filter(id => id !== timerId) || [];
            // Clean up ref entry if no more timers
            if(analysisTimers.current[analysis.id].length === 0) {
                delete analysisTimers.current[analysis.id];
            }
          }, delay);
          analysisTimers.current[analysis.id].push(timerId);
        };

        // Start the sequence based on the current stage
        if (currentStage === 'analyzing') {
          scheduleNextStage('generating', 9000); // 9 seconds for analyzing
        } else if (currentStage === 'generating') {
          scheduleNextStage('finalizing', 3000); // 3 seconds for generating
        } else if (currentStage === 'finalizing') {
          scheduleNextStage('complete', 1000); // 1 second for finalizing
        }
      }
    });

    // Cleanup timers on unmount or if analyses array changes drastically
    return () => {
      Object.values(analysisTimers.current).forEach(timers => timers.forEach(clearTimeout));
      analysisTimers.current = {};
    };
  }, [analyses]); // Rerun when analyses array changes (e.g., state updates)

  // --- Dialog form state reset --- 
  const handleModalClose = () => {
    setIsAnalysisDialogOpen(false);
    // Reset form state if needed when modal closes
    setSelectedDrawingTypeId("");
    setAnalysisTitle("");
    setDrawingImageFile(null);
    setStartAnalysisError(null);
  }

  // --- Modified handleStartAnalysis function --- 
  const handleStartAnalysis = () => {
    // No longer async, just navigates
    if (!selectedDrawingTypeId) {
      // This error should ideally not happen if button is disabled, but good practice
      setStartAnalysisError("Please select a drawing type."); 
      return;
    }
    if (!clientId) {
      // Should also not happen due to page structure
      setStartAnalysisError("Client ID is missing.");
      return;
    }

    // Clear any previous errors and close the modal immediately
    setStartAnalysisError(null);
    handleModalClose(); 

    // Navigate to the new capture route
    // Use requestAnimationFrame to ensure navigation happens after modal closes smoothly
    requestAnimationFrame(() => {
        navigate(`/client/${clientId}/capture/${selectedDrawingTypeId}`);
    });

    // Remove old logic:
    // console.log("Starting analysis with type:", selectedDrawingTypeId);
    // setIsStartingAnalysis(true);
    // setStartAnalysisError(null);
    // // Simulate API call
    // await new Promise(resolve => setTimeout(resolve, 1500)); 
    // setIsStartingAnalysis(false);
    // handleModalClose(); 
  };

  // --- Edit Client Modal Open Handler --- 
  const handleOpenEditModal = () => {
    if (!client) return; // Should not happen if button is visible
    setEditClientName(client.name);
    setEditClientAge(client.age !== null && client.age !== undefined ? client.age.toString() : ""); // Initialize with current age or empty string
    setEditClientGender(client.gender || null); // Initialize with current gender or null
    setUpdateClientError(null); // Clear previous errors
    setIsEditDialogOpen(true);
  };

  // --- Edit Client Modal Close Handler --- 
  const handleCloseEditModal = () => {
    setIsEditDialogOpen(false);
    // Optionally reset edit state here, though initializing on open is often sufficient
    // setEditClientName("");
    // setEditClientAge("");
    // setEditClientGender(null);
  };

  // --- Handle Client Update --- 
  const handleUpdateClient = async () => {
    if (!client) return; // Should not happen

    // Validation
    if (!editClientName.trim()) {
      setUpdateClientError("Client name cannot be empty.");
      return;
    }
    const ageNum = editClientAge ? parseInt(editClientAge.toString(), 10) : null;
    if (ageNum !== null && (isNaN(ageNum) || ageNum < 0 || ageNum > 120)) {
        setUpdateClientError("Please enter a valid age between 0 and 120.");
        return;
    }

    setIsUpdatingClient(true);
    setUpdateClientError(null);

    try {
      const updateData = {
        name: editClientName.trim(),
        age: ageNum,
        gender: editClientGender || null,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
      };

      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', client.id);

      if (updateError) throw updateError;

      // Success! Update local state and close modal
      setClient(prev => prev ? { ...prev, ...updateData } : null);
      handleCloseEditModal();

    } catch (err) {
      console.error("Error updating client:", err);
      setUpdateClientError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setIsUpdatingClient(false);
    }
  };

  // --- Handle Client Delete --- 
  const handleDeleteClient = async () => {
    if (!client) return; 

    setIsDeletingClient(true);
    // No need for separate error state, can potentially reuse updateClientError or handle inline

    try {
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (deleteError) throw deleteError;

      // Success! Navigate back to the client list
      navigate('/'); 
      // No need to close modals manually, the component will unmount

    } catch (err) {
      console.error("Error deleting client:", err);
      // Display error to user (e.g., using a toast notification or setting an error state)
      setUpdateClientError(err instanceof Error ? err.message : 'Failed to delete client'); // Reuse error state for simplicity
      setIsDeletingClient(false); // Ensure loading state is reset on error
    } 
    // No finally needed here as success leads to navigation
  };

  // --- Render Logic --- 

  // Use Skeleton for initial client loading
  if (loadingClient) {
    return <ClientDetailSkeleton />;
  }

  if (error) {
    return (
        <div className="text-center p-10 text-destructive">
            <p>Error: {error}</p>
            <Button asChild variant="link" className="mt-4">
              <Link to="/">Back to Client List</Link>
            </Button>
        </div>
    );
  }

  if (!client) {
     return <div className="text-center p-10">Client not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link to="/"> 
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Clients</span>
                </Link>
            </Button>
            {/* Client Name and Details - Use flex for inline display */}
            <div className="flex items-baseline gap-4"> {/* Changed items-center back to items-baseline */} 
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
              {/* Conditionally render age and gender inline */}
              {(client.age || client.gender) && ( 
                <span className="text-sm text-muted-foreground">
                  {/* Removed labels, show only values */} 
                  {client.age}
                  {client.age && client.gender && ', '}{/* Separator */} 
                  {client.gender}
                </span>
              )}
            </div>
        </div>
        {/* Apply v0 responsive classes and justification */}
        <div className="flex flex-col w-full gap-2 sm:flex-row sm:gap-3">
            {/* Edit Client Button - Add onClick handler */}
            <Button 
              variant="outline" 
              className="w-full sm:w-auto justify-center cursor-pointer"
              onClick={handleOpenEditModal} // Add onClick to open modal
              disabled={loadingClient || !client} // Disable if loading or no client
            >
              Edit Client
            </Button> 
            
            {/* Add justify-center, use sm breakpoint, ensure icon gap */}
            <Button 
                // variant default (filled)
                disabled={loadingTypes || !!error} 
                onClick={() => setIsAnalysisDialogOpen(true)}
                className="w-full sm:w-auto justify-center gap-2 cursor-pointer"
            >
                <FilePlus2 className="h-4 w-4" /> 
                Start New Analysis
            </Button>
        </div>
      </div>

      {/* Manual Modal Implementation */}
      <AnimatePresence>
          {isAnalysisDialogOpen && (
              <> {/* Fragment to hold overlay and modal content */} 
                  {/* Overlay */}
                  <motion.div
                      key="analysis-modal-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="fixed inset-0 bg-black/50 z-40" // Ensure z-index is below content
                      onClick={handleModalClose} // Close on overlay click
                  />

                  {/* Modal Content Wrapper (Handles animation and positioning) */}
                  <motion.div
                      key="analysis-modal-content"
                      initial={{ opacity: 0, scale: 0.95 }} // Start slightly smaller and faded
                      animate={{ opacity: 1, scale: 1 }}    // Animate to full size and opacity
                      exit={{ opacity: 0, scale: 0.95 }}      // Exit animation
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-[525px] -translate-x-1/2 -translate-y-1/2" 
                  >
                      <Card className="relative p-6"> {/* Use Card for background/padding, add relative for close button */}
                          {/* Manual Close Button */}
                          <button
                              onClick={handleModalClose}
                              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label="Close dialog"
                          >
                              <XIcon className="h-5 w-5" />
                          </button>

                          {/* Moved Header Content Here */}
                          <div className="mb-4"> {/* Equivalent of DialogHeader padding */} 
                              <h2 className="text-lg font-semibold">Start New Analysis for {client?.name}</h2>
                              <p className="text-sm text-muted-foreground">
                                  Select the drawing type and provide the client's drawing. 
                              </p>
                          </div>

                          {/* Form content (Grid with cards) - Copied from original DialogContent */}
                          <div className="grid gap-4 py-4">
                              {/* Drawing Type Selection using Cards */}
                              <div className="grid gap-2">
                                  <Label htmlFor="drawing-type-selection">Drawing Type</Label>
                                  {loadingTypes ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" id="drawing-type-selection">
                                          {[1, 2, 3].map((i) => (
                                              <Card key={i} className="flex flex-col items-center justify-center p-4 h-28">
                                                  <Skeleton className="h-8 w-8 mb-2 rounded-md" />
                                                  <Skeleton className="h-4 w-16" />
                                              </Card>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" id="drawing-type-selection">
                                          {drawingTypes.map((type) => {
                                              const IconComponent = getDrawingTypeIcon(type.name);
                                              return (
                                                  <Card 
                                                      key={type.id} 
                                                      className={`flex flex-col items-center justify-center px-4 cursor-pointer transition-colors duration-150 h-28 ${ 
                                                          selectedDrawingTypeId === type.id 
                                                              ? 'border-primary ring-2 ring-primary bg-muted' 
                                                              : 'border-border hover:bg-muted/50' 
                                                      }`}
                                                      onClick={() => setSelectedDrawingTypeId(type.id)}
                                                  >
                                                      <div className="mt-1" style={{ width: '32px', height: '32px' }}>
                                                          <IconComponent className="text-muted-foreground" style={{ width: '100%', height: '100%' }} />
                                                      </div>
                                                      <span className="text-xs text-center font-medium -mt-1">{type.name}</span>
                                                  </Card>
                                              );
                                          })}
                                      </div>
                                  )}
                              </div>
                              {/* TODO: Add inputs for Analysis Title and Image Upload */} 
                              {startAnalysisError && (
                                  <p className="text-sm text-destructive text-center col-span-full">{startAnalysisError}</p>
                              )}
                          </div>

                          {/* Moved Footer Content Here */}
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4"> {/* Equivalent of DialogFooter */} 
                              <Button variant="outline" onClick={handleModalClose}>Cancel</Button>
                              <Button 
                                  type="button"
                                  onClick={handleStartAnalysis} 
                                  disabled={!selectedDrawingTypeId || isStartingAnalysis}
                              >
                                  {isStartingAnalysis ? 'Starting...' : 'Start Analysis'}
                              </Button>
                          </div>
                      </Card>
                  </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* --- Edit Client Modal Implementation --- */} 
      <AnimatePresence>
        {isEditDialogOpen && (
          <> {/* Fragment for overlay and modal */} 
            {/* Overlay */} 
            <motion.div
              key="edit-client-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40" 
              onClick={handleCloseEditModal} // Close on overlay click
            />

            {/* Modal Content Wrapper */} 
            <motion.div
              key="edit-client-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-[525px] -translate-x-1/2 -translate-y-1/2" 
            >
              <Card className="relative p-6"> 
                {/* Close Button */} 
                <button
                  onClick={handleCloseEditModal}
                  className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close dialog"
                >
                  <XIcon className="h-5 w-5" />
                </button>

                {/* Header */} 
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Edit Client: {client?.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Update the client's details below.
                  </p>
                </div>

                {/* Form Content */} 
                <div className="grid gap-6 py-4"> {/* Increased gap */} 
                  {/* Name Row */}
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                    <Label htmlFor="edit-name" className="text-right">Name</Label>
                    <Input 
                      id="edit-name" 
                      value={editClientName} 
                      onChange={(e) => setEditClientName(e.target.value)}
                      placeholder="Client's name"
                      disabled={isUpdatingClient}
                    />
                  </div>
                  {/* Age Row */} 
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-6">
                    <Label htmlFor="edit-age" className="text-right">Age</Label>
                    <Input 
                      id="edit-age"
                      type="number"
                      value={editClientAge}
                      onChange={(e) => setEditClientAge(e.target.value)}
                      disabled={isUpdatingClient}
                    />
                  </div>
                  {/* Gender Row */} 
                  <div className="grid gap-2">
                    <Label className="text-center mb-2">Gender</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Male', 'Female', 'Non-Binary'] as const).map((genderOption) => {
                        const isSelected = editClientGender === genderOption;
                        // Update icon selection logic
                        let IconComponent: React.ElementType;
                        if (genderOption === 'Male') {
                          IconComponent = Mars;
                        } else if (genderOption === 'Female') {
                          IconComponent = Venus;
                        } else { // Non-Binary
                          IconComponent = Transgender;
                        }
                        return (
                          <Card 
                            key={genderOption} 
                            className={`flex flex-col items-center justify-center p-3 cursor-pointer transition-colors duration-150 h-24 ${ 
                              isSelected ? 'border-primary ring-2 ring-primary bg-muted' : 'border-border hover:bg-muted/50' 
                            }`}
                            onClick={() => !isUpdatingClient && setEditClientGender(genderOption)} // Prevent change while updating
                          >
                            <IconComponent className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs text-center font-medium">{genderOption}</span>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  {updateClientError && <p className="text-sm text-destructive text-center mt-2">{updateClientError}</p>} 
                </div>

                {/* Footer */} 
                {/* Added justify-between for delete button placement */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between mt-4"> 
                  {/* Delete Button wrapped in AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive"
                        disabled={isUpdatingClient || isDeletingClient} // Disable if updating or deleting
                      >
                        Delete Client
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the client 
                          "{client?.name}" and all associated analysis data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingClient}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteClient}
                          disabled={isDeletingClient}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive style for action
                        >
                          {isDeletingClient ? "Deleting..." : "Yes, delete client"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Right Aligned Buttons */} 
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={handleCloseEditModal} disabled={isUpdatingClient}>Cancel</Button>
                    <Button 
                      type="button"
                      onClick={handleUpdateClient} 
                      disabled={isUpdatingClient || !editClientName.trim()} 
                    >
                      {isUpdatingClient ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                          </div>
                      </Card>
                  </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* Analysis History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"> {/* Added flex for badge positioning */}
          <div> {/* Wrap title/description */} 
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>View past analyses for {client.name}.</CardDescription>
          </div>
          {/* Added Badge for total count */}
          {!loadingAnalyses && analyses.length > 0 && (
             <Badge variant="secondary">{analyses.length} Total</Badge>
          )}
        </CardHeader>
        <CardContent>
          {loadingAnalyses ? (
            <p>Loading analysis history...</p> 
          ) : analyses.length > 0 ? (
            <ul className="divide-y divide-border -mx-6 -my-4 relative h-[23rem]"> {/* Changed 22rem to 23rem */}
              <AnimatePresence mode="wait">
                {paginatedAnalyses.map((analysis) => {
                  // Determine content based on visual stage or processed status
                  const isProcessing = !analysis.drawing_processed;
                  // Default to 'complete' if processed but stage isn't set yet
                  const currentStage = analysis.visual_stage || (analysis.drawing_processed ? 'complete' : null);

                  let stageText = 'Processing...';
                  let showSpinner = isProcessing && currentStage !== 'complete';

                  if (currentStage === 'analyzing') {
                    stageText = 'Analyzing features...';
                  } else if (currentStage === 'generating') {
                    stageText = 'Generating interpretation...';
                  } else if (currentStage === 'finalizing') {
                    stageText = 'Finalizing report...';
                  } else if (currentStage === 'complete') {
                    showSpinner = false; // Ensure spinner is off for complete
                  }
                  
                  const IconComponent = showSpinner ? Loader2 : ClipboardList; // Use spinner or final icon

                const itemContent = (
                  <>
                    <IconComponent 
                      className={`h-5 w-5 mr-3 flex-shrink-0 ${ 
                          showSpinner 
                            ? 'text-muted-foreground animate-spin' // Spinner style
                            : 'text-primary' // Completed style
                        }`} 
                    />
                    <div className="flex-grow">
                        {/* Show stage text or final details */} 
                        {currentStage === 'complete' ? (
                          <>
                      <p className="font-medium text-sm">
                        {analysis.drawing_types?.name || analysis.title || 'Analysis Details'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : 'Date unknown'}
                      </p>
                          </>
                        ) : (
                          // Add placeholder paragraph for alignment
                          <>
                            <p className="font-medium text-sm text-muted-foreground">{stageText}</p>
                            <p className="text-xs invisible" aria-hidden="true">&nbsp;</p> {/* Placeholder */} 
                          </>
                        )}
                    </div>
                      {/* Only show chevron if complete */}
                      {currentStage === 'complete' && <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />} 
                  </>
                );

                  // Change li to motion.li and add animation props
                return (
                    <motion.li 
                      key={analysis.id} // Key is crucial for AnimatePresence
                      className="px-6 py-3 first:pt-0 last:pb-0" 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Render Button/Link only when complete */} 
                      {currentStage === 'complete' ? (
                         <Button asChild variant="ghost" className="w-full justify-start h-auto px-2 py-2">
                       <Link 
                          to={`/analysis/${analysis.id}`}
                              className="flex items-center w-full transition-colors duration-150" 
                        >
                          {itemContent}
                        </Link>
                         </Button>
                    ) : (
                        // Non-clickable div while processing
                        <div className="flex items-center w-full -mx-2 px-2 py-2 opacity-70 cursor-default"> 
                        {itemContent}
                      </div>
                    )}
                    </motion.li>
                );
              })}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No analysis history found for this client.</p>
          )}
          {/* Add Pagination Controls if more than one page */} 
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border"> 
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous Page</span>
              </Button>
              <span className="text-sm text-muted-foreground"> 
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 