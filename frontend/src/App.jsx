import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import Layout from "./components/layout/Layout";
import { useAuth } from "./context/AuthContext";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const HostsPage = lazy(() => import("./pages/HostsPage"));
const HostDetailPage = lazy(() => import("./pages/HostDetailPage"));
const FindingsPage = lazy(() => import("./pages/FindingsPage"));
const ScanDetailPage = lazy(() => import("./pages/ScanDetailPage"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

const App = () => {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <Suspense fallback={<Loading />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Loading />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="hosts"
          element={
            <Suspense fallback={<Loading />}>
              <HostsPage />
            </Suspense>
          }
        />
        <Route
          path="hosts/:hostname"
          element={
            <Suspense fallback={<Loading />}>
              <HostDetailPage />
            </Suspense>
          }
        />
        <Route
          path="findings"
          element={
            <Suspense fallback={<Loading />}>
              <FindingsPage />
            </Suspense>
          }
        />
        <Route
          path="findings/:scanId"
          element={
            <Suspense fallback={<Loading />}>
              <ScanDetailPage />
            </Suspense>
          }
        />
        <Route
          path="trends"
          element={
            <Suspense fallback={<Loading />}>
              <TrendsPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<Loading />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
