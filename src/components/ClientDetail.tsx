import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, FilePlus2, FileText, Home, TreeDeciduous, User, Users } from 'lucide-react'; // Icons
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger,
  DialogClose 
} from "@/components/ui/dialog"; // Already have Dialog
import { Label } from "@/components/ui/label"; // Import Label
// Import generated types
import type { Database } from '@/lib/database.types';

// Use generated types directly
type ClientDetails = Database['public']['Tables']['clients']['Row'];
// Define the shape for the analysis query result, including the joined type
type AnalysisQueryResult = (Database['public']['Tables']['drawing_analyses']['Row'] & {
  drawing_types: Pick<Database['public']['Tables']['drawing_types']['Row'], 'name'> | null;
});

// Use generated types for drawing types
type DrawingType = Database['public']['Tables']['drawing_types']['Row'];

// Helper function to get an icon based on drawing type name
const getDrawingTypeIcon = (typeName: string): React.ElementType => {
  const lowerCaseName = typeName.toLowerCase();
  let IconComponent: React.ElementType = FileText; // Default icon

  if (lowerCaseName.includes('house') && lowerCaseName.includes('tree') && lowerCaseName.includes('person')) {
    IconComponent = Home;
  } else if (lowerCaseName.includes('kinetic') && lowerCaseName.includes('family')) {
    IconComponent = Users; // Use Users for KFD
  } else if (lowerCaseName.includes('family')) {
    IconComponent = Users;
  } else if (lowerCaseName.includes('person')) {
    // Catch DAP and Person Under Rain
    IconComponent = User;
  } else if (lowerCaseName.includes('tree')) {
    IconComponent = TreeDeciduous;
  } else if (lowerCaseName.includes('house')) {
    IconComponent = Home;
  } else {
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
  const handleDialogChange = (open: boolean) => {
    setIsAnalysisDialogOpen(open);
    if (!open) {
        setSelectedDrawingTypeId("");
        setAnalysisTitle("");
        setDrawingImageFile(null);
        setStartAnalysisError(null);
    }
  }

  // --- TODO: handleStartAnalysis function --- 
  const handleStartAnalysis = async () => {
    if (!selectedDrawingTypeId /* || !drawingImageFile */) { // Add image check later
        setStartAnalysisError("Please select a drawing type and provide an image.");
        return;
    }
    // ... implementation for uploading image and creating analysis record ...
    console.log("Starting analysis with type:", selectedDrawingTypeId);
    setIsStartingAnalysis(true);
    setStartAnalysisError(null);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    setIsStartingAnalysis(false);
    // handleDialogChange(false); // Close dialog on success
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
            <Dialog open={isAnalysisDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                    {/* Disable button if drawing types haven't loaded */}
                    <Button size="sm" disabled={loadingTypes || !!error}> 
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Start New Analysis
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]"> {/* Adjust width if needed */}
                    <DialogHeader>
                        <DialogTitle>Start New Analysis for {client.name}</DialogTitle>
                        <DialogDescription>
                            Select the drawing type and provide the client's drawing. 
                        </DialogDescription>
                    </DialogHeader>
                    {/* Form content */}
                    <div className="grid gap-4 py-4">
                        {/* Drawing Type Selection using Cards */}
                        <div className="grid gap-2">
                            <Label htmlFor="drawing-type-selection">Drawing Type</Label>
                            {loadingTypes ? (
                                // Skeleton loader for cards
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
                                        // Get the specific Icon component based on the type name
                                        const IconComponent = getDrawingTypeIcon(type.name);
                                        // Return the Card JSX directly
                                        return (
                                            <Card 
                                                key={type.id} 
                                                className={`flex flex-col items-center justify-center px-4 cursor-pointer transition-colors duration-150 h-28 ${ // Use justify-center, remove vertical padding
                                                    selectedDrawingTypeId === type.id 
                                                        ? 'border-primary ring-2 ring-primary bg-muted' // Selected style
                                                        : 'border-border hover:bg-muted/50' // Default style
                                                }`}
                                                onClick={() => setSelectedDrawingTypeId(type.id)}
                                            >
                                                {/* Icon wrapper pushed down slightly */}
                                                <div 
                                                    className="mt-1" // Small margin-top to push icon down
                                                    style={{ width: '32px', height: '32px' }} // Apply fixed size to wrapper
                                                >
                                                    <IconComponent 
                                                        className="text-muted-foreground" // Apply color
                                                        style={{ width: '100%', height: '100%' }} // Icon fills the wrapper
                                                    />
                                                </div>
                                                {/* Text pulled up slightly, made smaller */}
                                                <span className="text-xs text-center font-medium -mt-1">{type.name}</span>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* TODO: Add inputs for Analysis Title and Image Upload */}
                        {/* Example placeholders: */}
                        {/* 
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="analysis-title" className="text-right">
                                Title (Optional)
                            </Label>
                            <Input id="analysis-title" value={analysisTitle} onChange={(e) => setAnalysisTitle(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="drawing-image" className="text-right">
                                Drawing
                            </Label>
                            <Input id="drawing-image" type="file" accept="image/*" onChange={(e) => setDrawingImageFile(e.target.files ? e.target.files[0] : null)} className="col-span-3" />
                        </div> 
                        */}
                         {/* Display submission error */}
                        {startAnalysisError && (
                            <p className="text-sm text-destructive text-center col-span-full">{startAnalysisError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button 
                            type="button" // Changed from submit as it's not a form yet
                            onClick={handleStartAnalysis} 
                            disabled={!selectedDrawingTypeId || isStartingAnalysis /* || !drawingImageFile */}
                        >
                            {isStartingAnalysis ? 'Starting...' : 'Start Analysis'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* TODO: Maybe add a Client Details Card here if more info is needed */}
      {/* <Card> ... </Card> */}

      {/* Analysis History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>View past analyses for {client.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAnalyses ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
              <p>No analyses found for this client yet.</p>
              {/* Optional: Add a subtle 'Start New Analysis' button here too? */}
            </div>
          ) : (
            <ul className="space-y-3">
              {analyses.map(analysis => (
                <li 
                  key={analysis.id} 
                  className="p-3 border rounded-md flex justify-between items-center hover:bg-muted/50 cursor-pointer"
                >
                  <div>
                    <span className="font-medium">
                      {analysis.title || 'Untitled Analysis'} 
                      ({analysis.drawing_types?.name || 'Unknown Type'})
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Date: {analysis.analysis_date 
                              ? new Date(analysis.analysis_date).toLocaleDateString()
                              : 'Date not available'}
                    </p>
                  </div>
                  {/* TODO: Add actions like View/Delete later */}
                  {/* <Button variant="ghost" size="sm">View</Button> */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 