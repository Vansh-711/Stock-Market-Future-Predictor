import { Navigate } from 'react-router-dom';
import { AuthForm } from '@/features/auth/ui/AuthForm';
import { useAuth } from '@/features/auth/model/AuthContext';
import { CardSkeleton } from '@/shared/ui/Skeleton';
import { MacbookScroll } from '@/shared/ui/macbook-scroll';
import { TextHoverEffect } from '@/shared/ui/text-hover-effect';

export function SignupPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-auth">
          <CardSkeleton />
        </div>
      </main>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <main className="flex flex-col min-h-screen bg-canvas overflow-hidden">
      <MacbookScroll
        showGradient={false}
        title={
          <div className="flex flex-col items-center">
            <h2 className="text-h1 md:text-[56px] font-bold text-text-primary tracking-tight drop-shadow-lg transition-colors duration-300">Signal Chain</h2>
            <p className="mt-4 text-text-muted text-body-medium uppercase tracking-[0.2em] animate-pulse">Scroll to unlock</p>
          </div>
        }
      >
        <div className="w-full min-h-full pb-48 flex flex-col items-center justify-center px-4 bg-gradient-to-b from-canvas to-surface-raised transition-colors duration-300">
          <div className="w-full h-16 shrink-0 -mt-2">
            <TextHoverEffect text="SIGNUP" />
          </div>
          <div className="w-full max-w-sm mt-2">
            <AuthForm 
              mode="signup" 
              hideHeader 
              className="border-none bg-transparent shadow-none p-0 sm:p-0"
            />
          </div>
        </div>
      </MacbookScroll>
    </main>
  );
}
