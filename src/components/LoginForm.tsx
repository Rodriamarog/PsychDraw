"use client"

import type React from "react"

import { useState } from "react"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from '@/lib/supabaseClient'; // Import supabase

// Renamed component to LoginForm
export function LoginForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [email, setEmail] = useState<string>("") // Keep state for email form
  const [password, setPassword] = useState<string>("") // Keep state for email form
  const [confirmPassword, setConfirmPassword] = useState<string>(""); // State for confirm password
  const [isSignUp, setIsSignUp] = useState<boolean>(false); // State to track sign-up mode
  const [error, setError] = useState<string | null>(null); // Add error state

  const handleGoogleSignIn = async () => { // Make async
    setIsLoading(true)
    setError(null); // Clear previous errors
    try {
      // Use Supabase OAuth logic
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: 'google' }); 
      if (signInError) throw signInError;
      // Supabase handles redirection, no need to setIsLoading(false) here on success
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false); // Set loading false only on error
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => { // Make async
    e.preventDefault();
    setIsLoading(true); // Set loading true
    setError(null); // Clear previous errors

    try {
      // Use Supabase email/password sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (signInError) throw signInError;
      // On success, Supabase handles session, AuthProvider updates context, App re-renders
      // No need to explicitly navigate or setIsLoading(false) here on success
    } catch (err) {
      console.error('Error signing in with email/password:', err);
      setError(err instanceof Error ? err.message : 'Invalid login credentials'); // Provide a user-friendly error
      setIsLoading(false); // Set loading false only on error
    }
    // Do not set isLoading to false in a finally block here, because successful login means the component might unmount before finally runs.
  }

  // --- Handle Email Sign Up --- 
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) { // Example: Basic password length check
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      // Use Supabase sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        // options: { data: { name: 'Default Name' } } // Optionally pass metadata for the trigger
      });

      if (signUpError) throw signUpError;

      // Handle success (Supabase might auto-login or require confirmation)
      // For now, let's assume success means they might need to confirm email or are logged in.
      // We can clear the form or show a success message.
      console.log("Sign up successful:", data);
      setError("Sign up successful! Please check your email for confirmation if required."); // Or handle auto-login
      setIsLoading(false);
      // Reset form or navigate if needed

    } catch (err) {
      console.error('Error signing up with email/password:', err);
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setIsLoading(false); 
    }
  }

  // --- Handle Password Reset --- 
  const handlePasswordReset = async () => {
    setError(null);
    // Basic email validation
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setIsLoading(true);
    try {
      // Use Supabase password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // Optional: Specify the URL to redirect the user to after they click the link
        // redirectTo: 'http://localhost:5173/update-password', // Example redirect
      });

      if (resetError) throw resetError;

      // Show success message using the error state (or add a dedicated success state)
      setError("Password reset email sent! Check your inbox.");

    } catch (err) {
      console.error('Error sending password reset email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false); // Always stop loading after attempt
    }
  };

  return (
    // Use background from example
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"> 
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        // Use card structure from example
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl" 
      >
        {/* Use padding and layout from example */}
        <div className="p-8"> 
          {/* Header from example */}
          <div className="mb-6 flex flex-col items-center"> 
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Sparkles className="h-8 w-8 text-slate-800" />
            </div>
            <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-slate-900">Welcome to PsychDraw</h1>
            <p className="text-center text-sm text-slate-500">Choose your preferred login method</p>
        </div>

          {/* Tabs structure from example */}
          <Tabs defaultValue="google" className="w-full"> 
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="google" className="data-[state=active]:font-semibold">Google</TabsTrigger>
              <TabsTrigger value="email" className="data-[state=active]:font-semibold">Email</TabsTrigger>
            </TabsList>

            {/* Google Tab Content */}
            <TabsContent value="google"> 
              {/* Wrap content for animation */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4" // Move space-y here
              >
        <Button
          onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  // Use styling from example for Google button
                  className="relative flex w-full items-center justify-center gap-2 bg-amber-50 text-slate-800 hover:bg-amber-100 disabled:opacity-70" 
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {/* Google SVG from example */}
                      <svg className="h-4 w-4" viewBox="0 0 24 24"> 
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      {/* Wrap text in span and add font-semibold */}
                      <span className="font-semibold">Sign in with Google</span>
                    </>
                  )}
                </Button>
                {/* Terms text from example */}
                <p className="text-center text-xs text-slate-500"> 
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            </TabsContent>

            {/* Email Tab Content */}
            <TabsContent value="email"> 
              {/* Wrap content for animation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading} // Disable form fields when loading
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {/* Change link to button and add onClick */}
                      {!isSignUp && (
                        <button 
                          type="button" // Important to prevent form submission
                          onClick={handlePasswordReset}
                          className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
                          disabled={isLoading}
                        > 
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading} // Disable form fields when loading
                    />
                  </div>

                  {/* Animate the appearance/disappearance of Confirm Password */}
                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div 
                        key="confirm-password-field" // Key for AnimatePresence
                        className="space-y-2"
                        initial={{ opacity: 0, height: 0, y: -10 }} // Start hidden and slightly above
                        animate={{ opacity: 1, height: 'auto', y: 0 }} // Animate to visible and original position
                        exit={{ opacity: 0, height: 0, y: -10 }} // Animate out
                        transition={{ duration: 0.2 }} // Adjust duration
                      >
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Switch button text and action based on mode */}
                  <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSignUp ? (
                      'Sign up'
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
        </Button>
                </form>
                {/* Switch link text and action based on mode */}
                <div className="mt-4 text-center"> 
                  <p className="text-sm text-slate-500">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null); // Clear errors when switching mode
                        // Optionally clear form fields too
                        setEmail("");
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="font-medium text-slate-900 hover:underline disabled:opacity-70"
                      disabled={isLoading}
                    >
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </p>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Display overall errors */}
        {error && (
          <p className="mt-4 text-xs text-red-500 text-center">
            Login failed: {error}
          </p>
        )}
        </div>
      </motion.div>
    </div>
  )
} 