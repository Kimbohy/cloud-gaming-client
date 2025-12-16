import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PlayPage from "./pages/PlayPage";
import RomsPage from "./pages/RomsPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";

function App() {
  return (
    <NuqsAdapter>
      <BrowserRouter>
        <main className="">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/roms"
              element={
                <ProtectedRoute>
                  <RomsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/:id"
              element={
                <ProtectedRoute>
                  <PlayPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <RomsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </NuqsAdapter>
  );
}

export default App;
