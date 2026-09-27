import { useEffect } from "react";
import {
  createBrowserRouter,
  createHashRouter,
  createMemoryRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  type RouteObject,
} from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { detectMode } from "./lib/distill/client";
import { StoreProvider } from "./lib/store";
import { CaptureFlow } from "./screens/capture/CaptureFlow";
import { DetailScreen } from "./screens/DetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { PersonScreen } from "./screens/PersonScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { TopicScreen } from "./screens/TopicScreen";
import { YouScreen } from "./screens/YouScreen";

function Root() {
  useEffect(() => {
    void detectMode();
  }, []);
  return (
    <>
      {/* Pages opened fresh all share the "default" key; tell them apart by address. */}
      <ScrollRestoration getKey={(location) => (location.key === "default" ? location.pathname + location.search : location.key)} />
      <Outlet />
    </>
  );
}

function TabsLayout() {
  return (
    <div className="tabs-layout">
      <Outlet />
      <BottomNav />
    </div>
  );
}

const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { index: true, element: <HomeScreen /> },
          { path: "library", element: <LibraryScreen /> },
          { path: "library/people/:key", element: <PersonScreen /> },
          { path: "library/topics/:key", element: <TopicScreen /> },
          { path: "library/:id", element: <DetailScreen /> },
          { path: "you", element: <YouScreen /> },
          { path: "you/profile", element: <ProfileScreen /> },
        ],
      },
      { path: "ask", element: <CaptureFlow /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

// VITE_ROUTER=hash for static hosts that can't rewrite deep links to index.html;
// VITE_ROUTER=memory for embedded previews that can't touch the URL at all.
const routerMode = import.meta.env.VITE_ROUTER;
const router =
  routerMode === "memory"
    ? createMemoryRouter(routes)
    : routerMode === "hash"
      ? createHashRouter(routes)
      : createBrowserRouter(routes);

export function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
