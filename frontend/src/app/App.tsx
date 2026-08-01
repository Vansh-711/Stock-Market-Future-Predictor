import { AppRouter } from '@/app/router/AppRouter';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

export function App() {
  return (
    <>
      <ThemeToggle />
      <AppRouter />
    </>
  );
}
