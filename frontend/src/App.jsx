import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AboutPage from "./pages/AboutPage";

// Lazy-loaded: pulls in d3-geo + topojson-client, which most visitors
// (landing on the dashboard) never need to download.
const MapPage = lazy(() => import("./pages/MapPage"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<AboutPage />} />
      <Route
        path="/map"
        element={
          <Suspense fallback={<div className="loading">Loading map…</div>}>
            <MapPage />
          </Suspense>
        }
      />
    </Routes>
  );
}
