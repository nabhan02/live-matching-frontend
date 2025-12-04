import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import ParticipantSelection from './pages/ParticipantSelection';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/participant/:token" element={<ParticipantSelection />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
