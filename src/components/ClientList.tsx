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
  
  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Clients</h2>
          
          {/* Add Client Dialog Trigger Button */}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                  <Button>Add New Client</Button>
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

      {/* Client List Display */}
      {clients.length === 0 ? (
        <div className="text-center p-4 border border-dashed rounded-md">
          You haven't added any clients yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
            <li key={client.id}>
              <Link 
                to={`/client/${client.id}`} 
                className="block p-4 bg-card text-card-foreground border rounded-lg shadow-sm cursor-pointer transition-colors hover:bg-muted/50"
              >
                {client.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
