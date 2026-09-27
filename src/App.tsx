import { useEffect, type ComponentType } from "react";
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
import { ArrivalNotice } from "./components/ArrivalNotice";
import { BottomNav } from "./components/BottomNav";
import { detectMode } from "./lib/distill/client";
import { StoreProvider } from "./lib/store";
import { HomeScreen } from "./screens/HomeScreen";

/**
 * Each screen arrives when it's first needed, so a first visit (and someone
 * opening a question's link) loads only what it shows.
 */
const screen =
  <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K): RouteObject["lazy"] =>
  async () => ({ Component: (await load())[name] });

function Root() {
  useEffect(() => {
    void detectMode();
  }, []);
  return (
    <>
      {/* Pages opened fresh all share the "default" key; tell them apart by address. */}
      <ScrollRestoration getKey={(location) => (location.key === "default" ? location.pathname + location.search : location.key)} />
      <Outlet />
      <ArrivalNotice />
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
          { path: "library", lazy: screen(() => import("./screens/LibraryScreen"), "LibraryScreen") },
          { path: "library/people/:key", lazy: screen(() => import("./screens/PersonScreen"), "PersonScreen") },
          { path: "library/topics/:key", lazy: screen(() => import("./screens/TopicScreen"), "TopicScreen") },
          // One question asked of several people, and their perspectives side by side.
          { path: "library/questions/:group", lazy: screen(() => import("./screens/QuestionHubScreen"), "QuestionHubScreen") },
          {
            path: "library/questions/:group/perspectives",
            lazy: screen(() => import("./screens/PerspectivesScreen"), "PerspectivesScreen"),
          },
          { path: "library/:id", lazy: screen(() => import("./screens/DetailScreen"), "DetailScreen") },
          { path: "you", lazy: screen(() => import("./screens/YouScreen"), "YouScreen") },
          { path: "you/profile", lazy: screen(() => import("./screens/ProfileScreen"), "ProfileScreen") },
          { path: "sent", lazy: screen(() => import("./screens/SentScreen"), "SentScreen") },
          { path: "sent/:id", lazy: screen(() => import("./screens/QuestionScreen"), "QuestionScreen") },
        ],
      },
      { path: "ask", lazy: screen(() => import("./screens/capture/CaptureFlow"), "CaptureFlow") },
      // Someone asked you for 3: a link opened in any browser, app or not.
      { path: "a/:id", lazy: screen(() => import("./screens/answer/AnswerFlow"), "AnswerFlow") },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

// VITE_ROUTER=hash for static hosts that can't rewrite deep links to index.html;
// VITE_ROUTER=memory for embedded previews that can't touch the URL at all.
const routerMode = import.meta.env.VITE_ROUTER;
const router =
  routerMode === "memory"
    ? // Embedded previews can't use the address, but a link's #/a/… still opens its question.
      createMemoryRouter(routes, { initialEntries: [window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : "/"] })
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
