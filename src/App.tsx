import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PlayPage from "./pages/PlayPage";
import RomsPage from "./pages/RomsPage";
import EmulatorDemo from "./pages/EmulatorDemo";

function App() {
  return (
    <BrowserRouter>
      <main className="p-4">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/roms" element={<RomsPage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/demo" element={<EmulatorDemo />} />
          <Route path="*" element={<EmulatorDemo />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
