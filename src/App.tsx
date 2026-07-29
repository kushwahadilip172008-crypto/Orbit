import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/Toaster";
import { Spinner } from "./components/ui/Spinner";
import { AppLayout } from "./layouts/AppLayout";
import { AuthPage } from "./pages/AuthPage";

const FeedPage = lazy(() => import("./pages/FeedPage").then((m) => ({ default: m.FeedPage })));
const ExplorePage = lazy(() => import("./pages/ExplorePage").then((m) => ({ default: m.ExplorePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then((m) => ({ default: m.MessagesPage })));
const ConversationPage = lazy(() =>
  import("./pages/ConversationPage").then((m) => ({ default: m.ConversationPage })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })),
);
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const PostDetailPage = lazy(() =>
  import("./pages/PostDetailPage").then((m) => ({ default: m.PostDetailPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <Spinner size={32} />
    </div>
  );
}

function ProtectedRoute() {
  const { session, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!session) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function PublicOnlyRoute() {
  const { session, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Suspense fallback={<PageFallback />}><FeedPage /></Suspense> },
          { path: "/explore", element: <Suspense fallback={<PageFallback />}><ExplorePage /></Suspense> },
          { path: "/u/:username", element: <Suspense fallback={<PageFallback />}><ProfilePage /></Suspense> },
          { path: "/messages", element: <Suspense fallback={<PageFallback />}><MessagesPage /></Suspense> },
          { path: "/messages/:id", element: <Suspense fallback={<PageFallback />}><ConversationPage /></Suspense> },
          { path: "/notifications", element: <Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense> },
          { path: "/settings", element: <Suspense fallback={<PageFallback />}><SettingsPage /></Suspense> },
          { path: "/p/:id", element: <Suspense fallback={<PageFallback />}><PostDetailPage /></Suspense> },
          { path: "/create", element: null },
        ],
      },
    ],
  },
  { path: "/auth", element: <PublicOnlyRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
