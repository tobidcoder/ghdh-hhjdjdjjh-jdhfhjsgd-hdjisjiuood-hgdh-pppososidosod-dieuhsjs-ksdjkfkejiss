import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// removed unused imports

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* <Route path="/dashboard" element={<h1>kjkj</h1>} /> */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App
