import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from '@/app/router/ProtectedLayout';
import { ChainDetailPage } from '@/pages/chain-detail/ui/ChainDetailPage';
import { ChainsListPage } from '@/pages/chains-list/ui/ChainsListPage';
import { CompanyDetailPage } from '@/pages/company-detail/ui/CompanyDetailPage';
import { DashboardPage } from '@/pages/dashboard/ui/DashboardPage';
import { ExplorerPage } from '@/pages/explorer/ui/ExplorerPage';
import { LoginPage } from '@/pages/login/ui/LoginPage';
import { NotFoundPage } from '@/pages/not-found/ui/NotFoundPage';
import { PatternsPage } from '@/pages/patterns/ui/PatternsPage';
import { SignupPage } from '@/pages/signup/ui/SignupPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="patterns" element={<PatternsPage />} />
        <Route path="explorer" element={<ExplorerPage />} />
        <Route path="chains" element={<ChainsListPage />} />
        <Route path="chains/:id" element={<ChainDetailPage />} />
        <Route path="companies/:symbol" element={<CompanyDetailPage />} />
        <Route path="404" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
