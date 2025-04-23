import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, FilePlus2, FileText, Home, TreeDeciduous, User, Users, ChevronRight, XIcon, ClipboardList, Loader2 } from 'lucide-react'; // Icons
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Label } from "@/components/ui/label"; // Import Label
// Import motion and AnimatePresence
import { motion, AnimatePresence } from 'framer-motion'; 
// Import generated types
import type { Database } from '@/lib/database.types';

// Use generated types directly
type ClientDetails = Database['public']['Tables']['clients']['Row'];
// Define the shape for the analysis query result, including the joined type
type AnalysisQueryResult = (Database['public']['Tables']['drawing_analyses']['Row'] & {
  // Ensure Row includes temp_drawing_path and drawing_processed from the base type
  drawing_types: Pick<Database['public']['Tables']['drawing_types']['Row'], 'name'> | null;
});

// Use generated types for drawing types
type DrawingType = Database['public']['Tables']['drawing_types']['Row'];

// Helper function to get an icon based on drawing type name
const getDrawingTypeIcon = (typeName: string): React.ElementType => {
  // console.log("Mapping icon for type name:", typeName);
  const lowerCaseName = typeName.toLowerCase();
  let IconComponent: React.ElementType = FileText; // Default icon

  if (lowerCaseName.includes('house') && lowerCaseName.includes('tree') && lowerCaseName.includes('person')) {
    IconComponent = Home; 
    // console.log("-> Matched HTP (Home)");
  } else if (lowerCaseName.includes('kinetic') && lowerCaseName.includes('family')) {
    IconComponent = Users; // Use Users for KFD
    // console.log("-> Matched KFD (Users)");
  } else if (lowerCaseName.includes('family')) {
    IconComponent = Users;
    // console.log("-> Matched Family (Users)");
  } else if (lowerCaseName.includes('person')) {
    // Catch DAP and Person Under Rain
    IconComponent = User;
    // console.log("-> Matched Person (User)");
  } else if (lowerCaseName.includes('tree')) {
    IconComponent = TreeDeciduous;
    // console.log("-> Matched Tree (TreeDeciduous)");
  } else if (lowerCaseName.includes('house')) {
    IconComponent = Home;
    // console.log("-> Matched House (Home)");
  } else {
    // console.log("-> No specific match, using default (FileText)");
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
  
  // State for the new analysis form inside the dialog
  const [selectedDrawingTypeId, setSelectedDrawingTypeId] = useState<string>("");
  const [analysisTitle, setAnalysisTitle] = useState(""); // Add state for title later
  const [drawingImageFile, setDrawingImageFile] = useState<File | null>(null); // Add state for image later
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false); // Loading state for submission
  const [startAnalysisError, setStartAnalysisError] = useState<string | null>(null); // Error state for submission

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
                .select('id, name') // Select specific fields needed
                .eq('id', clientId)
                .returns<Pick<ClientDetails, 'id' | 'name'> | null>() // Specify return type shape
                .single(); 
            
            if (error) throw error;
            if (!data) throw new Error("Client not found");
            // We manually selected only id/name, so cast if needed or adjust select/return type
            setClient(data as ClientDetails); // Assuming full row is needed later, else use Pick<...>
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
        setError(null); // Reset error specifically for this fetch
        try {
            // Query now uses generated types
            const { data, error: dbError } = await supabase
                .from('drawing_analyses')
                // Specify the foreign key constraint name for the join
                .select(`
                    id,
                    analysis_date,
                    title,
                    temp_drawing_path,
                    drawing_processed,
                    raw_analysis,
                    drawing_types!fk_drawing_type ( name ) 
                `)
                .eq('client_id', clientId)
                .order('analysis_date', { ascending: false })
                .returns<AnalysisQueryResult[]>();

            if (dbError) throw dbError;
            
            setAnalyses(data || []); 

        } catch (err) {
            console.error("Error fetching analyses:", err);
            // Set a general error, or a specific one for analyses
            setError(err instanceof Error ? err.message : 'Failed to load analysis history');
            setAnalyses([]); // Ensure analyses is empty on error
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
            <Button asChild variant="outline" size="icon" className="h-8 w-8">
                <Link to="/"> 
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Clients</span>
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        </div>
        <div className="flex items-center gap-2 justify-end">
            {/* TODO: Add Edit Client Button/Functionality */}
            <Button variant="outline" size="sm">Edit Client</Button>
            
            {/* Changed to standard button to open manual modal */}
            <Button 
                size="sm" 
                disabled={loadingTypes || !!error} 
                onClick={() => setIsAnalysisDialogOpen(true)} // Open modal on click
            >
                <FilePlus2 className="mr-2 h-4 w-4" />
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

      {/* Analysis History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>View past analyses for {client.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAnalyses ? (
            <p>Loading analysis history...</p> 
          ) : analyses.length > 0 ? (
            <ul className="divide-y divide-border -mx-6 -my-4"> 
              {analyses.map((analysis) => {
                const showProcessedIcon = analysis.drawing_processed;
                // Define IconComponent based on processed status
                const IconComponent = showProcessedIcon ? ClipboardList : Loader2;

                const itemContent = (
                  <>
                    <IconComponent 
                      className={`h-5 w-5 mr-3 flex-shrink-0 ${ 
                        showProcessedIcon 
                          ? 'text-primary' 
                          : 'text-muted-foreground animate-spin' 
                      }`} // Correct class logic
                    />
                    <div className="flex-grow">
                      <p className="font-medium text-sm">
                        {/* Prioritize Drawing Type Name */}
                        {analysis.drawing_types?.name || analysis.title || 'Analysis Details'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : 'Date unknown'}
                      </p>
                    </div>
                    {showProcessedIcon && <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />}
                  </>
                );

                return (
                  <li key={analysis.id} className="px-6 py-3 first:pt-0 last:pb-0"> 
                    {showProcessedIcon ? (
                       <Link 
                          to={`/analysis/${analysis.id}`}
                          className="flex items-center w-full hover:bg-muted/50 rounded -mx-2 px-2 py-1 transition-colors duration-150"
                        >
                          {itemContent}
                        </Link>
                    ) : (
                      <div className="flex items-center w-full -mx-2 px-2 py-1 opacity-70 cursor-default"> 
                        {itemContent}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No analysis history found for this client.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 