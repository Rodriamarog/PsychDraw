import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight, User, XIcon, Mars, Venus, Transgender } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Search } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';

// Define a type for the client data we expect
// Include optional age and gender AND psychologist_id
type Client = {
  id: string;
  psychologist_id: string; // Added psychologist_id
  name: string;
  age?: number | null; // Optional age
  gender?: 'Male' | 'Female' | 'Non-Binary' | null; // Optional gender enum
  // Add other fields from DB if needed for display/logic later, e.g., created_at, is_active
};

// Skeleton component for loading state
const ClientListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, index) => ( // Show 3 skeleton items
      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-4 flex-grow" /> 
      </div>
    ))}
  </div>
);

export function ClientList() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term
  
  // State for the Add Client Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAge, setNewClientAge] = useState(""); // Added state for age (string for input)
  const [newClientGender, setNewClientGender] = useState<Client['gender'] | "">(null); // Added state for gender
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- Data Fetching --- 
  // Wrap fetchClients in useCallback for stability
  const fetchClients = useCallback(async () => {
    if (!user) return; 

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('clients')
        .select('id, name, age, gender, psychologist_id') // Select all needed fields
        .eq('psychologist_id', user.id)
        .order('name');

      if (dbError) throw dbError;
      // Remove temporary type assertion
      setClients(data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency: user

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // --- Add Client Logic --- 
  const handleSaveClient = async () => {
    if (!user || !newClientName.trim()) {
      setSaveError("Client name cannot be empty.");
      return;
    }
    // Basic age validation (if entered, must be a plausible number)
    const ageNum = newClientAge ? parseInt(newClientAge, 10) : null;
    // Refined validation check for non-null ageNum
    if (ageNum !== null && (isNaN(ageNum) || ageNum < 0 || ageNum > 120)) {
        setSaveError("Please enter a valid age between 0 and 120.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Construct client data matching the DB table structure for insertion
      // Note: We don't insert 'id' as it's auto-generated
      const clientDataToInsert = {
        name: newClientName.trim(),
        psychologist_id: user.id, 
        age: ageNum, // Use the parsed number or null
        gender: newClientGender || null // Use state value or null
      };

      const { error: insertError } = await supabase
        .from('clients')
        // Pass the correctly structured object for insertion
        .insert(clientDataToInsert); 

      if (insertError) {
        // Handle potential unique constraint violation (same name for same psych)
        if (insertError.code === '23505') { 
            throw new Error(`Client named "${newClientName.trim()}" already exists.`);
        } else {
            throw insertError;
        }
      }

      // Success!
      setNewClientName(""); // Reset input
      setIsDialogOpen(false); // Close dialog
      await fetchClients(); // Refetch the client list to include the new one

    } catch (err) {
      console.error("Error saving client:", err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form state when dialog closes
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
        setNewClientName("");
        setNewClientAge(""); // Reset age
        setNewClientGender(null); // Reset gender
        setSaveError(null);
    }
  }

  // --- Filtering Logic --- 
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Rendering Logic --- 

  // Loading State - Use Skeleton
  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Clients</h2>
            {/* Placeholder for button while loading */}
            <Skeleton className="h-10 w-32" />
        </div>
        <ClientListSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  }
  
  // Render Search Input 
  const renderSearchBar = () => (
    <div className="relative w-full mb-4"> 
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search clients..." 
        className="pl-8 w-full"
        value={searchTerm} // Bind value to state
        onChange={(e) => setSearchTerm(e.target.value)} // Update state on change
      />
    </div>
  );
  
  return (
    // Use flex column layout for the whole component
    <div className="flex flex-col h-full max-w-lg mx-auto p-4"> 
      {/* Header: Title and Badge */}
      <div className="flex justify-between items-center mb-4"> {/* Reduced margin-bottom */}
          <h2 className="text-2xl font-bold">Your Clients</h2> {/* Use font-bold */}
          {/* Show badge only if not loading and there are clients */} 
          {!loading && clients.length > 0 && (
            <Badge variant="secondary">{clients.length} Total</Badge>
          )}
      </div>

      {/* Search Bar */}
      {renderSearchBar()}

      {/* Client List Area - Use flex-grow to push button down */}
      <div className="flex-grow space-y-3 overflow-y-auto"> 
        {/* Show loading or error if applicable */}
        {loading && <ClientListSkeleton />}
        {error && <div className="text-center p-4 text-red-600">Error: {error}</div>}
        
        {/* Show list or messages based on filtered results */} 
        {!loading && !error && (
          <> {/* Fragment to handle conditional rendering */} 
      {clients.length === 0 ? (
              <div className="text-center p-4 border border-dashed rounded-md mt-4"> 
          You haven't added any clients yet.
        </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground mt-4">
                No clients match "{searchTerm}".
        </div>
      ) : (
              <div className="space-y-3"> 
                {filteredClients.map((client) => ( // Map over filteredClients
                  <Card key={client.id} className="overflow-hidden p-3"> 
                    <motion.div // Use motion.div as the direct child for layout consistency if Link causes issues
                      whileTap={{ scale: 0.98 }} 
                      className="block" // Make div behave like a block element
                    >
              <Link 
                to={`/client/${client.id}`} 
                        // Use flex, padding, alignment, hover state on the link itself
                        className="flex items-center gap-3 transition-colors hover:bg-muted/50"
                      >
                        {/* Left Icon */}
                        <div className="p-2 bg-muted rounded-full flex-shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" /> 
                        </div>
                        
                        {/* Center Content (Name) - Grow to take space */}
                        <div className="flex-grow">
                          <p className="font-medium text-base">{client.name}</p>
                          {/* Placeholder for future secondary details */}
                          {/* <p className="text-xs text-muted-foreground">34 years old</p> */}
                        </div>
              </Link>
                    </motion.div>
                  </Card>
          ))}
              </div>
      )}
          </>
        )}
      </div>

      {/* --- Manual Modal Implementation --- */} 
      {/* Update Button to directly set state */}
      <motion.div whileTap={{ scale: 0.97 }} className="mt-6"> {/* Keep tap animation, move margin here */} 
        <Button 
          className="w-full gap-2" 
          onClick={() => setIsDialogOpen(true)} // Directly set state
        >
            <Plus className="h-4 w-4" /> Add New Client
              </Button>
      </motion.div>

      <AnimatePresence>
        {isDialogOpen && (
          <> {/* Fragment to hold overlay and modal */}
            {/* Overlay */} 
            <motion.div
                key="add-client-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-40" 
                onClick={() => handleDialogChange(false)} // Close on overlay click
            />

            {/* Modal Content Wrapper */} 
            <motion.div
                key="add-client-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-[425px] -translate-x-1/2 -translate-y-1/2" 
            >
              {/* Card containing the actual content */}
              <Card className="relative p-6"> 
                {/* Manual Close Button */}
                <button
                    onClick={() => handleDialogChange(false)} // Use handler to close and reset state
                    className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Close dialog"
                >
                    <XIcon className="h-5 w-5" />
                </button>

                {/* Header Content (Replicated from previous DialogHeader) */} 
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Add New Client</h2>
                  <p className="text-sm text-muted-foreground">
                      Enter the name for your new client.
                  </p>
                </div>

                {/* Form Content (Replicated from previous main div) */} 
                <div className="grid gap-6 py-4"> {/* Changed gap-4 to gap-6 */} 
                    {/* Name Row */}
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                      <Label htmlFor="name" className="text-right">
                          Name
                      </Label>
                      <Input 
                          id="name" 
                          value={newClientName} 
                          onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Client's name"
                            disabled={isSaving}
                        />
                    </div>
                    {/* Age Row */}
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-6">
                        <Label htmlFor="age" className="text-right">
                            Age
                        </Label>
                        <Input 
                            id="age"
                            type="number" 
                            value={newClientAge} 
                            onChange={(e) => setNewClientAge(e.target.value)}
                          disabled={isSaving}
                      />
                  </div>
                    {/* Gender Row - Label centered above cards */}
                    <div className="grid gap-2"> {/* Simplified outer grid row, adjust gap if needed */} 
                        <Label className="text-center mb-2"> {/* Centered label, added margin-bottom */} 
                            Gender
                        </Label>
                        {/* Grid for Gender Cards (stays the same) */}
                        <div className="grid grid-cols-3 gap-3">
                          {(['Male', 'Female', 'Non-Binary'] as const).map((genderOption) => {
                            const isSelected = newClientGender === genderOption;
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
                                    isSelected 
                                        ? 'border-primary ring-2 ring-primary bg-muted' 
                                        : 'border-border hover:bg-muted/50' 
                                }`}
                                onClick={() => setNewClientGender(genderOption)}
                              >
                                <IconComponent className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="text-xs text-center font-medium">{genderOption}</span>
                              </Card>
                            );
                          })}
                        </div>
                    </div>
                    {saveError && <p className="text-sm text-destructive text-center mt-2">{saveError}</p>} {/* Simplified error message positioning */} 
              </div>

                {/* Footer Content (Replicated from previous DialogFooter) */} 
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4"> 
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleDialogChange(false)} // Use handler to close and reset state
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  <Button 
                        type="button" 
                      onClick={handleSaveClient} 
                      disabled={isSaving || !newClientName.trim()}
                  >
                      {isSaving ? "Saving..." : "Save Client"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Removed old Dialog, DialogTrigger, DialogContent structure */}

    </div>
  );
}
