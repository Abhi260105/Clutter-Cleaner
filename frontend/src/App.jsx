import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scanner from './pages/Scanner.jsx';
import ModulePlaceholder from './pages/ModulePlaceholder.jsx';
import { ALL_ITEMS } from './navigation.js';

// Modules from later phases render the placeholder until their real page replaces it.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="scanner" element={<Scanner />} />
        {ALL_ITEMS.filter((i) => i.path !== '/' && i.path !== '/scanner').map((i) => (
          <Route key={i.path} path={i.path} element={<ModulePlaceholder />} />
        ))}
        <Route path="*" element={<ModulePlaceholder />} />
      </Route>
    </Routes>
  );
}
