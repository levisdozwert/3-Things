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
import { YouScreen } from "./screens/YouScreen";

function Root() {
  useEffect(() => {
    void detectMode();
  }, []);
  return (
    <>
      <ScrollRestoration />
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
          { path: "library/:id", element: <DetailScreen /> },
          { path: "you", element: <YouScreen /> },
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
