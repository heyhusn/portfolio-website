import { useEffect, Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import { useStore } from "./store.js";

/* Route-level splitting for the public pages.
 *
 * Only Home stays in the entry chunk: it is the landing route for almost every
 * visitor, and making it async would add a round trip in front of the LCP for
 * no benefit. Everything else was being downloaded by every visitor to `/`
 * before they had clicked anything — About, both Projects views, both Blogs
 * views, the Resume page and its PDF viewer, and NotFound, plus the data
 * modules only those pages read.
 *
 * The router preloads nothing on hover deliberately: these are small chunks on
 * a fast host, and a hover preload spends bandwidth on a link that is mostly
 * not clicked. */
const About = lazy(() => import("./pages/About.jsx"));
const Projects = lazy(() => import("./pages/Projects.jsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.jsx"));
const Blogs = lazy(() => import("./pages/Blogs.jsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.jsx"));
const Resume = lazy(() => import("./pages/Resume.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// The admin dashboard pulls in framer-motion and @hello-pangea/dnd, neither
// of which a public visitor ever needs. Loaded eagerly they landed in the
// same entry chunk as Home/About/Projects, so every visitor paid for the
// whole admin panel's JS. lazy() + Suspense keeps it out of the public
// bundle entirely, mirroring how the WebGL avatar chunk is already split.
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));

function AdminFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Loading admin…
    </div>
  );
}



export default function App() {
  const fetchData = useStore((s) => s.fetchData);

  useEffect(() => {
    // Non-blocking: the store already renders bundled content (see
    // data/fallback.js), this just refines it with live admin-edited
    // content once/if the admin API responds.
    fetchData();
  }, [fetchData]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminDashboard />
          </Suspense>
        }
      />
      {/* The Suspense boundary for these lives inside Layout, wrapped around
          the Outlet — a boundary out here would take the nav, footer and
          background down with the page while a route chunk loads. */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:slug" element={<ProjectDetail />} />
        <Route path="blogs" element={<Blogs />} />
        <Route path="resume" element={<Resume />} />
        <Route path="blogs/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
