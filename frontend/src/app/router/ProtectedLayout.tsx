import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '@/widgets/navbar/ui/Navbar';
import { useAuth } from '@/features/auth/model/AuthContext';
import { CardSkeleton } from '@/shared/ui/Skeleton';

export function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas p-6">
        <div className="mx-auto max-w-screen-2xl space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
