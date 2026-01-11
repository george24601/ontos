import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileText, Database, Book, Shield, Loader2 } from 'lucide-react';
import { features } from '@/config/features';

type AppSearchResult = {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string;
  feature_id?: string;
  tags?: string[];
};

interface AppSearchProps {
  initialQuery?: string;
}

export default function AppSearch({ initialQuery = '' }: AppSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [appQuery, setAppQuery] = useState(initialQuery);
  const [appResults, setAppResults] = useState<AppSearchResult[]>([]);
  const [appLoading, setAppLoading] = useState(false);

  // Update URL when state changes
  const updateUrl = (query: string) => {
    const params = new URLSearchParams(location.search);
    if (query) {
      params.set('app_query', query);
    } else {
      params.delete('app_query');
    }
    const newUrl = `${location.pathname}?${params.toString()}`;
    navigate(newUrl, { replace: true });
  };

  // Load initial state from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get('app_query');
    if (urlQuery && urlQuery !== initialQuery) {
      setAppQuery(urlQuery);
    }
  }, [location.search]);

  // Perform search
  useEffect(() => {
    const run = async () => {
      const q = appQuery.trim();
      if (!q) {
        setAppResults([]);
        updateUrl('');
        return;
      }
      setAppLoading(true);
      try {
        const resp = await fetch(`/api/search?search_term=${encodeURIComponent(q)}`);
        const data = resp.ok ? await resp.json() : [];
        setAppResults(Array.isArray(data) ? data : []);
        updateUrl(q);
      } catch {
        setAppResults([]);
      } finally {
        setAppLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [appQuery]);

  // Get icon for result based on feature_id or type fallback
  const getIcon = (result: AppSearchResult) => {
    // Prefer explicit feature-based icon mapping to keep UI consistent with navigation
    if (result.feature_id) {
      const feature = features.find((f) => f.id === result.feature_id);
      if (feature) {
        const Icon = feature.icon;
        return <Icon className="h-4 w-4 flex-shrink-0" />;
      }
    }

    // Fallbacks based on type
    switch (result.type) {
      case 'data-product':
        return <Database className="h-4 w-4 flex-shrink-0" />;
      case 'data-contract':
        return <FileText className="h-4 w-4 flex-shrink-0" />;
      case 'glossary-term':
        return <Book className="h-4 w-4 flex-shrink-0" />;
      case 'persona':
        return <Shield className="h-4 w-4 flex-shrink-0" />;
      default:
        return <Search className="h-4 w-4 flex-shrink-0" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Application Search</CardTitle>
        <CardDescription className="text-xs">Type to search. Results appear below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Input
            value={appQuery}
            onChange={(e) => setAppQuery(e.target.value)}
            placeholder="Search for data products, terms, contracts..."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2 text-sm">
          {appLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : appResults.length === 0 ? (
            <div className="text-xs text-muted-foreground">No results</div>
          ) : (
            appResults.map(r => (
              <a 
                key={r.id} 
                href={r.link} 
                className="flex items-center gap-3 p-2 rounded hover:bg-accent"
              >
                {getIcon(r)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                </div>
              </a>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
