import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, XIcon } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

export function SettingsPage() {
  const { user } = useAuth(); // Get user from AuthContext

  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State for password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // State for password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Effect to load initial data
  useEffect(() => {
    if (user) {
      const currentDisplayName = user.user_metadata?.display_name || '';
      setDisplayName(currentDisplayName);
      setInitialDisplayName(currentDisplayName);
    }
  }, [user]); // Rerun when user object changes

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (displayName === initialDisplayName) {
      setMessage({ type: 'error', text: 'No changes made.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { data: updatedUserData, error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() } // Update user_metadata
      });

      if (error) throw error;

      // Success
      const newName = updatedUserData.user?.user_metadata?.display_name || '';
      setInitialDisplayName(newName); // Update initial state to prevent re-saving same value
      setDisplayName(newName); // Ensure input reflects potentially trimmed value
      setMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Basic client-side validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) { // Example minimum length
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setIsPasswordLoading(true);
    setPasswordMessage(null);

    // --- Call the Edge Function --- 
    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        // `invoke` automatically includes the user's auth token
        body: { 
          currentPassword: currentPassword,
          newPassword: newPassword 
        },
      });

      if (error) throw error; // Throw network/function invocation errors

      // Check for errors returned explicitly in the function's response body
      if (data?.error) {
        throw new Error(data.error); // Throw application-level errors
      }

      // Success
      setPasswordMessage({ type: 'success', text: data?.message || 'Password changed successfully! Please log in again.' });
      // Clear fields on success
      setCurrentPassword(''); 
      setNewPassword(''); 
      setConfirmPassword(''); 

      // Force logout/redirect after a short delay to show message
      setTimeout(() => {
        // Force a hard navigation to clear state, triggering the App component's logic
        window.location.href = '/'; // Redirect to home, which will show login if session is invalid
      }, 2000); // 2 second delay

    } catch (err) {
        console.error("Error updating password:", err);
        // Display the error message returned from the function or a generic one
        setPasswordMessage({ 
            type: 'error', 
            text: err instanceof Error ? err.message : 'Failed to update password.' 
        });
    } finally {
      setIsPasswordLoading(false);
    }
    // --- End Edge Function Call --- 
  };

  // Determine if changes have been made for profile info
  const hasChanges = displayName !== initialDisplayName;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Manage your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Display */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {/* Display email - not editable */}
            <p id="email" className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
              {user?.email ?? 'Loading...'}
            </p>
          </div>

          {/* Display Name Input */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This name might be shown in reports or other parts of the application.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          {/* Message Area */}
          <div className="min-h-[20px]"> {/* Reserve space for message */}
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                {message.text}
              </p>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleUpdateProfile}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Button to Trigger Password Modal */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} disabled={isLoading || isPasswordLoading}>
          Change Password
        </Button>
      </div>

      {/* --- Password Change Modal --- */} 
      <AnimatePresence>
        {isPasswordModalOpen && (
          <>
            {/* Overlay */} 
            <motion.div
              key="password-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40" 
              onClick={() => setIsPasswordModalOpen(false)} // Close on overlay click
            />

            {/* Modal Content Wrapper */} 
            <motion.div
              key="password-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-[425px] -translate-x-1/2 -translate-y-1/2" 
            >
              {/* Card containing the actual content */}
              <Card className="relative p-6"> 
                {/* Close Button */}
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close dialog"
                >
                  <XIcon className="h-5 w-5" />
                </button>

                {/* Modal Header */} 
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Change Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your current and new password.
                  </p>
                </div>

                {/* Modal Form Content */} 
                <div className="space-y-4 py-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isPasswordLoading}
                      autoComplete="current-password"
                    />
                  </div>
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isPasswordLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isPasswordLoading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Modal Footer */} 
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between items-center mt-4">
                  {/* Password Message Area */}
                  <div className="min-h-[20px] flex-grow text-left">
                    {passwordMessage && (
                      <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                        {passwordMessage.text}
                      </p>
                    )}
                  </div>
                  {/* Action Buttons */} 
                  <div className="flex gap-2 justify-end w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)} disabled={isPasswordLoading}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={isPasswordLoading || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {isPasswordLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export as default
export default SettingsPage; 