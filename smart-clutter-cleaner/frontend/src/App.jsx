import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ModulePlaceholder from './pages/ModulePlaceholder.jsx';
import { ALL_ITEMS } from './navigation.js';

// Modules from later phases render the placeholder until their real page replaces it.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        {ALL_ITEMS.filter((i) => i.path !== '/').map((i) => (
          <Route key={i.path} path={i.path} element={<ModulePlaceholder />} />
        ))}
        <Route path="*" element={<ModulePlaceholder />} />
      </Route>
    </Routes>
  );
}
