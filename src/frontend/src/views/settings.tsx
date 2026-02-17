import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy Settings view - redirects to the appropriate standalone settings page.
 * The tabbed settings UI has been broken up into individual menu items under /admin/*.
 */

const TAB_REDIRECTS: Record<string, string> = {
  'general': '/admin/general',
  'git': '/admin/git',
  'delivery': '/admin/delivery',
  'jobs': '/admin/jobs',
  'roles': '/admin/roles',
  'tags': '/admin/tags',
  'semantic-models': '/ontology/semantic-models-settings',
  'search': '/admin/search',
  'mcp-tokens': '/admin/mcp',
  'ui-customization': '/admin/ui',
};

export default function Settings() {
  const { tab } = useParams<{ tab?: string }>();
  const redirectTo = (tab && TAB_REDIRECTS[tab]) || '/admin/general';
  return <Navigate to={redirectTo} replace />;
}
