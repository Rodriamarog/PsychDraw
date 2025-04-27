import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, LogOut, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils"; // For conditional classes
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user } = useAuth(); // Get user info if needed later

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      // Optionally show an error message to the user
    }
    // AuthProvider listener handles redirect/state change
    // No explicit navigation needed here typically
  };

  const navItems = [
    { path: '/', label: 'Clients', icon: Home },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    // Sidebar container: fixed width, full height, border, bg, hidden on mobile, flex on desktop
    <aside className="hidden md:flex md:flex-col w-60 border-r bg-background h-screen fixed left-0 top-0 z-30">
      {/* Logo/Brand Area */}
      <div className="p-4 border-b flex items-center gap-2">
         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
             <Sparkles className="h-5 w-5 text-foreground" />
         </div>
        <span className="font-semibold text-lg">PsychDraw</span>
      </div>

      {/* Navigation Links Area */}
      <nav className="flex-grow p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)); // Handle sub-routes for highlighting
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button Area */}
      <div className="p-4 border-t mt-auto">
        <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" 
            onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}

export default SidebarNav; 