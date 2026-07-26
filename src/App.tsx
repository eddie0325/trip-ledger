import { Route, Routes } from "react-router-dom";
import CreateTripPage from "./pages/CreateTripPage";
import TripPage from "./pages/TripPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateTripPage />} />
      <Route path="/trip/:code" element={<TripPage />} />
    </Routes>
  );
}

export default App;
