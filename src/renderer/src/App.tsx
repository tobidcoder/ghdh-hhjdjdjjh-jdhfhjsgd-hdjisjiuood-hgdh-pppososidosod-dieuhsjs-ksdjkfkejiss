import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Button } from './components/ui/button'

function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<div className="text-white text-2xl">Dashboard (placeholder)</div>} />
    </Routes>
  );
}

export default App
