import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PlayPage from "./pages/PlayPage";
import RomsPage from "./pages/RomsPage";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";

function App() {
  return (
    <NuqsAdapter>
      <BrowserRouter>
        <main className="">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/roms" element={<RomsPage />} />
            <Route path="/play/:id" element={<PlayPage />} />
            <Route path="*" element={<RomsPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </NuqsAdapter>
  );
}

export default App;
