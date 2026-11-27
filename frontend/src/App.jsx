import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scanner from './pages/Scanner.jsx';
import FeaturePage from './pages/FeaturePage.jsx';
import ModulePlaceholder from './pages/ModulePlaceholder.jsx';
import { ALL_ITEMS } from './navigation.js';

// Only these routes have feature-discovery APIs in the current backend.
const FEATURE_PATHS = new Set(['/duplicates', '/large-files', '/downloads', '/similar', '/cleanup']);
const FEATURE_ITEMS = ALL_ITEMS.filter((item) => FEATURE_PATHS.has(item.path));
const OTHER_ITEMS = ALL_ITEMS.filter(
  (item) => item.path !== '/' && item.path !== '/scanner' && !FEATURE_PATHS.has(item.path)
);

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="scanner" element={<Scanner />} />
        {FEATURE_ITEMS.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={<FeaturePage featurePath={item.path} />}
          />
        ))}
        {OTHER_ITEMS.map((item) => (
          <Route key={item.path} path={item.path} element={<ModulePlaceholder />} />
        ))}
        <Route path="*" element={<ModulePlaceholder />} />
      </Route>
    </Routes>
  );
}
