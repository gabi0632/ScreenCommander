import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './layouts/AppShell';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'));
const DetectPage = lazy(() => import('./pages/DetectPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const RunningMessagesPage = lazy(() => import('./pages/RunningMessagesPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ChannelsPage = lazy(() => import('./pages/ChannelsPage'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      color: 'var(--text-muted)',
      fontSize: '0.875rem',
    }}>
      טוען...
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="messages"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <MessagesPage />
              </Suspense>
            }
          />
          <Route
            path="scheduler"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <SchedulerPage />
              </Suspense>
            }
          />
          <Route
            path="running-messages"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <RunningMessagesPage />
              </Suspense>
            }
          />
          <Route
            path="channels"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ChannelsPage />
              </Suspense>
            }
          />
          <Route
            path="detect"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <DetectPage />
              </Suspense>
            }
          />
          <Route
            path="alerts"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <AlertsPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </ToastProvider>
  );
}
