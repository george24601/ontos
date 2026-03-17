import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, Loader2, Check, X, Database, Table2, Eye, Radio,
  LayoutDashboard, BookOpen, BrainCircuit, Globe, Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

export interface AssetSearchResult {
  id: string;
  name: string;
  description?: string;
  asset_type_name?: string;
  platform?: string;
  location?: string;
  status?: string;
}

export interface SelectedAsset extends AssetSearchResult {
  relationshipType: string;
}

interface AssetSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (assets: SelectedAsset[]) => void;
  relationshipType: string;
  relationshipLabel?: string;
  targetAssetTypes?: string[];
  excludeAssetIds?: string[];
  title?: string;
  description?: string;
}

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  Dataset: Database,
  Table: Table2,
  View: Eye,
  'Delivery Channel': Radio,
  Dashboard: LayoutDashboard,
  Notebook: BookOpen,
  'ML Model': BrainCircuit,
  'API Endpoint': Globe,
  Stream: Zap,
};

function getAssetIcon(typeName?: string) {
  if (!typeName) return Database;
  return ASSET_TYPE_ICONS[typeName] || Database;
}

export function AssetSelector({
  isOpen,
  onOpenChange,
  onConfirm,
  relationshipType,
  relationshipLabel,
  targetAssetTypes,
  excludeAssetIds = [],
  title = 'Link Assets',
  description,
}: AssetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, AssetSearchResult>>(new Map());
  const { get: apiGet } = useApi();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      let url = `/api/assets?name=${encodeURIComponent(query)}&limit=20`;
      if (targetAssetTypes && targetAssetTypes.length > 0) {
        url += `&asset_type_names=${encodeURIComponent(targetAssetTypes.join(','))}`;
      }
      const response = await apiGet<{ items: AssetSearchResult[]; total: number }>(url);
      const items = response.data?.items;
      if (!response.error && Array.isArray(items)) {
        const filtered = items.filter(a => !excludeAssetIds.includes(a.id));
        setResults(filtered);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [apiGet, targetAssetTypes, excludeAssetIds]);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const toggleSelect = (asset: AssetSearchResult) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.set(asset.id, asset);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const assets: SelectedAsset[] = Array.from(selected.values()).map(a => ({
      ...a,
      relationshipType,
    }));
    onConfirm(assets);
    onOpenChange(false);
  };

  const resetState = () => {
    setSearchQuery('');
    setResults([]);
    setSelected(new Map());
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const descText = description || `Search and select assets to link via "${relationshipLabel || relationshipType}"`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search assets by name..."
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selected.values()).map(a => {
                const Icon = getAssetIcon(a.asset_type_name);
                return (
                  <Badge key={a.id} variant="secondary" className="gap-1 pr-1">
                    <Icon className="h-3 w-3" />
                    <span className="text-xs max-w-32 truncate">{a.name}</span>
                    <button
                      onClick={() => toggleSelect(a)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <ScrollArea className="max-h-64">
            {results.length === 0 && searchQuery.length >= 2 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">No assets found</p>
            )}
            {results.length === 0 && searchQuery.length < 2 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Type at least 2 characters to search
              </p>
            )}
            {results.length > 0 && (
              <div className="space-y-0.5">
                {results.map(asset => {
                  const isSelected = selected.has(asset.id);
                  const Icon = getAssetIcon(asset.asset_type_name);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => toggleSelect(asset)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                        isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{asset.name}</div>
                        {asset.location && (
                          <div className="text-xs text-muted-foreground truncate">{asset.location}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {asset.asset_type_name || 'Asset'}
                      </Badge>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Link {selected.size > 0 ? `${selected.size} Asset${selected.size > 1 ? 's' : ''}` : 'Assets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
