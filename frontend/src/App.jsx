import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scanner from './pages/Scanner.jsx';
import FeaturePage from './pages/FeaturePage.jsx';
import ModulePlaceholder from './pages/ModulePlaceholder.jsx';
import { ALL_ITEMS } from './navigation.js';

// Dashboard and Scanner have their own pages; every other module is rendered by FeaturePage.
const FEATURE_ITEMS = ALL_ITEMS.filter((i) => i.path !== '/' && i.path !== '/scanner');

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="scanner" element={<Scanner />} />
        {FEATURE_ITEMS.map((i) => (
          <Route
            key={i.path}
            path={i.path}
            element={<FeaturePage featurePath={i.path} />}
          />
        ))}
        {/* Unknown URLs still fall back to the placeholder */}
        <Route path="*" element={<ModulePlaceholder />} />
      </Route>
    </Routes>
  );
}