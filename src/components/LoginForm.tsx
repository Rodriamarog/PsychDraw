import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabaseClient';

// SVG for Google G Logo
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px" className="mr-2">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.983,36.208,44,30.668,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-0 mx-auto shadow-lg rounded-xl border border-border/50 overflow-hidden">
      <CardHeader className="space-y-2 text-center p-6 bg-card">
        <div className="mx-auto h-10 w-10 text-primary mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 18.75l.813-2.846a4.5 4.5 0 0 0-3.09-3.09L13.106 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L21 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L27.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09L21 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L14.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L21 5.25Z" />
            </svg>
        </div>
        <CardTitle className="text-2xl font-semibold">Welcome to PsychDraw</CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in with Google to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-4 bg-card">
        <Button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 disabled:opacity-60 dark:bg-background dark:text-foreground dark:border-border dark:hover:bg-muted/20"
          variant="outline"
        >
          <GoogleIcon />
          {loading ? 'Redirecting...' : 'Sign in with Google'}
        </Button>

        {error && (
          <p className="mt-4 text-xs text-red-500 text-center">
            Login failed: {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
} 