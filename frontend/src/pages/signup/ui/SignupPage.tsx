import { Navigate } from 'react-router-dom';
import { AuthForm } from '@/features/auth/ui/AuthForm';
import { useAuth } from '@/features/auth/model/AuthContext';
import { CardSkeleton } from '@/shared/ui/Skeleton';

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
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <AuthForm mode="signup" />
    </main>
  );
}
