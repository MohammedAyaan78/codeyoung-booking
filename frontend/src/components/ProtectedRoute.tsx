import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@codeyoung/shared';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: UserRole;
  redirectTo?: string;
}

export function ProtectedRoute({ children, role, redirectTo }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    const loginPath = role === 'MENTOR' ? '/mentor/login' : '/login';
    return <Navigate to={redirectTo ?? loginPath} replace />;
  }

  if (user.role !== role) {
    const dashPath = user.role === 'MENTOR' ? '/mentor' : '/parent';
    return <Navigate to={dashPath} replace />;
  }

  return <>{children}</>;
}
