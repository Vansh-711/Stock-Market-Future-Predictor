import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Layers,
  Compass,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/model/AuthContext";
import { useToast } from "@/shared/ui/Toast";

const navItems = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "Patterns", to: "/patterns", icon: Layers },
  { label: "Explorer", to: "/explorer", icon: Compass },
  { label: "Pipeline", to: "/pipeline", icon: Activity },
  { label: "Settings", to: "/settings", icon: Settings },
];

const MOBILE_LABEL_WIDTH = 72;

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();
  
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = navItems.findIndex(item => {
      if (item.to === "/") return location.pathname === "/";
      return location.pathname.startsWith(item.to);
    });
    return index >= 0 ? index : 0;
  });

  useEffect(() => {
    const index = navItems.findIndex(item => {
      if (item.to === "/") return location.pathname === "/";
      return location.pathname.startsWith(item.to);
    });
    if (index >= 0) setActiveIndex(index);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    showToast('success', 'Logged out.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-x-0 top-6 mx-auto z-50 w-fit pointer-events-auto">
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        role="navigation"
        aria-label="Top Navigation"
        className={cn(
          "bg-canvas/80 backdrop-blur-md border border-border rounded-full flex items-center p-2 shadow-xl space-x-1 min-w-[320px] max-w-[95vw] h-[52px]",
        )}
      >
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeIndex === idx;

          return (
            <Link key={item.label} to={item.to} tabIndex={-1}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center gap-0 px-3 py-2 rounded-full transition-colors duration-200 relative h-10 min-w-[44px] min-h-[40px] max-h-[44px]",
                  isActive
                    ? "bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary gap-2"
                    : "bg-transparent text-text-secondary hover:bg-surface-hover",
                  "focus:outline-none focus-visible:ring-0",
                )}
                aria-label={item.label}
                type="button"
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                  aria-hidden
                  className="transition-colors duration-200"
                />

                <motion.div
                  initial={false}
                  animate={{
                    width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                    opacity: isActive ? 1 : 0,
                    marginLeft: isActive ? "8px" : "0px",
                  }}
                  transition={{
                    width: { type: "spring", stiffness: 350, damping: 32 },
                    opacity: { duration: 0.19 },
                    marginLeft: { duration: 0.19 },
                  }}
                  className={cn("overflow-hidden flex items-center max-w-[72px]")}
                >
                  <span
                    className={cn(
                      "font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis text-[clamp(0.625rem,0.5263rem+0.5263vw,1rem)] leading-[1.9]",
                      isActive ? "text-primary dark:text-primary" : "opacity-0",
                    )}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </motion.button>
            </Link>
          );
        })}

        <div className="w-[1px] h-6 bg-border mx-2" />

        <motion.button
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-transparent text-text-secondary hover:bg-surface-hover hover:text-red-500 transition-colors duration-200 focus:outline-none"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut size={20} strokeWidth={2} />
        </motion.button>
      </motion.nav>
    </div>
  );
}
