import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-blue-400 mb-2">OpsTrack</h1>
                <p className="text-gray-400">Defect & Operations Analytics Dashboard</p>
                <p className="mt-4 text-sm text-gray-500">Phase 1 scaffold running ✓</p>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
