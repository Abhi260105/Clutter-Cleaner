import { useLocation } from 'react-router-dom';
import ComingSoon from '../components/ComingSoon.jsx';
import { ALL_ITEMS } from '../navigation.js';

export default function ModulePlaceholder() {
  const { pathname } = useLocation();
  const item = ALL_ITEMS.find((i) => i.path === pathname);
  if (!item) return <ComingSoon title="Page not found" blurb="That page does not exist." phase="-" icon={ALL_ITEMS[0].icon} />;
  return <ComingSoon title={item.title} blurb={item.blurb} phase={item.phase} icon={item.icon} />;
}
