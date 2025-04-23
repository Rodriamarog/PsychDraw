import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight, User, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Search } from 'lucide-react';
import { Card } from "@/components/ui/card";

// Define a type for the client data we expect
type Client = {
  id: string;
  name: string;
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
  
  // State for the Add Client Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
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
        .select('id, name')
        .eq('psychologist_id', user.id)
        .order('name');

      if (dbError) throw dbError;
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

    setIsSaving(true);
    setSaveError(null);

    try {
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          name: newClientName.trim(),
          psychologist_id: user.id
        });

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
        setSaveError(null);
    }
  }

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
  
  // Render Search Input (Functionality not implemented yet)
  const renderSearchBar = () => (
    <div className="relative w-full mb-4"> {/* Add margin-bottom */}
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search" // Use type search for potential browser features
        placeholder="Search clients..." 
        className="pl-8 w-full" // Add padding for the icon
        // Add onChange handler later for functionality
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
      <div className="flex-grow space-y-3 overflow-y-auto"> {/* Added overflow-y-auto if needed */} 
        {clients.length === 0 ? (
          <div className="text-center p-4 border border-dashed rounded-md mt-4"> {/* Added mt-4 */} 
            You haven't added any clients yet.
          </div>
        ) : (
          <div className="space-y-3"> {/* Use a div with space-y */} 
            {clients.map((client) => (
              // Use Card for each item
              <Card key={client.id} className="overflow-hidden"> {/* Added overflow-hidden for potential rounded corners on link */} 
                <Link 
                  to={`/client/${client.id}`} 
                  // Use flex, padding, alignment, hover state on the link itself
                  className="flex items-center p-3 gap-3 transition-colors hover:bg-muted/50" 
                >
                  {/* Left Icon */}
                  <div className="p-2 bg-muted rounded-full flex-shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" /> 
                  </div>
                  
                  {/* Center Content (Name) - Grow to take space */}
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{client.name}</p>
                    {/* Placeholder for future secondary details */}
                    {/* <p className="text-xs text-muted-foreground">34 years old</p> */}
                  </div>

                  {/* Right Action Icons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Delete Button (Non-functional for now) */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                      onClick={(e) => { 
                        e.preventDefault(); // Prevent link navigation
                        console.log("Delete client clicked:", client.id); 
                        // Add actual delete confirmation/logic later
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete Client</span>
                    </Button>
                    {/* Navigate Icon */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" /> 
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Dialog and Trigger Button - Moved outside the scrollable area */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}> 
          <DialogTrigger asChild>
              {/* Changed variant to default (filled), added icon gap */}
              <Button className="w-full mt-6 gap-2"> 
                  <Plus className="h-4 w-4" /> Add New Client
              </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                      Enter the name for your new client.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                          Name
                      </Label>
                      <Input 
                          id="name" 
                          value={newClientName} 
                          onChange={(e) => setNewClientName(e.target.value)}
                          className="col-span-3" 
                          placeholder="Client's full name"
                          disabled={isSaving}
                      />
                  </div>
                  {saveError && <p className="col-span-4 text-sm text-red-600 text-center">{saveError}</p>} 
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                  </DialogClose>
                  <Button 
                      type="button" // Use type=button to prevent form submission if wrapped in <form> later
                      onClick={handleSaveClient} 
                      disabled={isSaving || !newClientName.trim()}
                  >
                      {isSaving ? "Saving..." : "Save Client"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}
