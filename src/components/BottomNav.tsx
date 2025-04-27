import { Link, useLocation } from 'react-router-dom';
import { Home, Settings } from 'lucide-react';
import { cn } from "@/lib/utils"; // For conditional classes

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    { path: '/', label: 'Clients', icon: Home },
    { path: '/settings', label: 'Settings', icon: Settings },
    // Add more primary destinations here if needed
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 h-16 border-t bg-background shadow-t-md md:hidden">
      <div className="grid h-full grid-cols-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 font-medium group",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mb-1",
                // isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="text-xs">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav; 