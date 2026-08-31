import { useEffect, Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import Blogs from "./pages/Blogs.jsx";
import Resume from "./pages/Resume.jsx";
import BlogPost from "./pages/BlogPost.jsx";
import NotFound from "./pages/NotFound.jsx";
import { useStore } from "./store.js";

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
