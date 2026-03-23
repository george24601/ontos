import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link2, ArrowRight, ArrowLeft, Loader2, AlertCircle, ExternalLink,
  PlusCircle, Trash2, Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { RelationshipDefinition } from '@/types/ontology-schema';

interface RelationshipRecord {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship_type: string;
  relationship_label?: string | null;
  source_name?: string | null;
  target_name?: string | null;
  properties?: Record<string, any> | null;
  created_by?: string | null;
  created_at: string;
}

interface RelationshipSummary {
  entity_type: string;
  entity_id: string;
  outgoing: RelationshipRecord[];
  incoming: RelationshipRecord[];
  total: number;
}

interface EntityRelationshipPanelProps {
  entityType: string;
  entityId: string;
  title?: string;
  className?: string;
  canEdit?: boolean;
}

const TYPE_ROUTE_MAP: Record<string, string> = {
  DataProduct: '/data-products',
  DataContract: '/data-contracts',
  DataDomain: '/data-domains',
};

function getEntityRoute(entityType: string, entityId: string): string {
  const base = TYPE_ROUTE_MAP[entityType];
  if (base) return `${base}/${entityId}`;
  return `/assets/${entityId}`;
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
}

export function EntityRelationshipPanel({
  entityType,
  entityId,
  title = 'Relationships',
  className,
  canEdit = false,
}: EntityRelationshipPanelProps) {
  const [data, setData] = useState<RelationshipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add relationship state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [validRelationships, setValidRelationships] = useState<RelationshipDefinition[]>([]);
  const [selectedRelType, setSelectedRelType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Type filter for relationship table
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { get: apiGet, post: apiPost, delete: apiDelete } = useApi();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<RelationshipSummary>(
        `/api/entities/${entityType}/${entityId}/relationships`
      );
      if (response.error) throw new Error(response.error);
      setData(response.data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  }, [apiGet, entityType, entityId]);

  const fetchValidRelationships = useCallback(async () => {
    try {
      const iri = `http://ontos.app/ontology#${entityType}`;
      const response = await apiGet<{ type_iri: string; outgoing: RelationshipDefinition[]; incoming: RelationshipDefinition[] }>(
        `/api/ontology/entity-types/relationships?type_iri=${encodeURIComponent(iri)}`
      );
      if (!response.error && response.data) {
        setValidRelationships(response.data.outgoing);
      }
    } catch { /* non-critical */ }
  }, [apiGet, entityType]);

  useEffect(() => { fetchRelationships(); }, [fetchRelationships]);

  const handleSearchTargets = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !selectedRelType) return;
    setSearchLoading(true);
    try {
      const relDef = validRelationships.find(r => r.property_name === selectedRelType);
      const targetType = relDef?.target_type_label || relDef?.target_type_iri?.split('#')[1] || '';

      const response = await apiGet<SearchResult[]>(
        `/api/assets?search=${encodeURIComponent(query)}&limit=10`
      );
      if (!response.error && Array.isArray(response.data)) {
        const filtered = targetType
          ? response.data.filter(a => (a as any).asset_type_name === targetType || !targetType)
          : response.data;
        setSearchResults(filtered.map(a => ({
          id: (a as any).id,
          name: (a as any).name,
          type: (a as any).asset_type_name || 'Asset',
        })));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiGet, selectedRelType, validRelationships]);

  const handleAddRelationship = async () => {
    if (!selectedTarget || !selectedRelType) return;
    setAddLoading(true);
    try {
      const relDef = validRelationships.find(r => r.property_name === selectedRelType);
      const targetType = relDef?.target_type_label || relDef?.target_type_iri?.split('#')[1] || selectedTarget.type;

      const payload = {
        source_type: entityType,
        source_id: entityId,
        target_type: targetType,
        target_id: selectedTarget.id,
        relationship_type: selectedRelType,
      };
      const response = await apiPost('/api/entity-relationships', payload);
      if (response.error) throw new Error(response.error);
      toast({ title: 'Relationship created' });
      setIsAddOpen(false);
      resetAddForm();
      fetchRelationships();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteRelationship = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const response = await apiDelete(`/api/entity-relationships/${deleteId}`);
      if (response.error) throw new Error(response.error);
      toast({ title: 'Relationship removed' });
      setDeleteId(null);
      fetchRelationships();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetAddForm = () => {
    setSelectedRelType('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTarget(null);
  };

  const openAddDialog = () => {
    resetAddForm();
    fetchValidRelationships();
    setIsAddOpen(true);
  };

  const outgoing = data?.outgoing || [];
  const incoming = data?.incoming || [];
  const total = outgoing.length + incoming.length;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rel of outgoing) {
      const t = rel.target_type;
      counts[t] = (counts[t] || 0) + 1;
    }
    for (const rel of incoming) {
      const t = rel.source_type;
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [outgoing, incoming]);

  const filteredOutgoing = typeFilter
    ? outgoing.filter(r => r.target_type === typeFilter)
    : outgoing;
  const filteredIncoming = typeFilter
    ? incoming.filter(r => r.source_type === typeFilter)
    : incoming;
  const filteredTotal = filteredOutgoing.length + filteredIncoming.length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {title}
              <Badge variant="secondary" className="ml-1 text-xs">{total}</Badge>
            </CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openAddDialog}>
                <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No relationships found
            </p>
          ) : (
            <div className="space-y-2">
              {/* Type filter bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    !typeFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {total} All
                </button>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      typeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {count} {type.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>

              <Separator />

              {filteredTotal === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No relationships match this filter
                </p>
              ) : (
                <div className="space-y-0">
                  {filteredOutgoing.map((rel) => (
                    <div key={rel.id} className="group flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted transition-colors">
                      <button
                        onClick={() => navigate(getEntityRoute(rel.target_type, rel.target_id))}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">
                          {rel.target_name || rel.target_id}
                        </span>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {rel.target_type.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                          this Asset <span className="font-medium text-foreground">{rel.relationship_label || rel.relationship_type}</span> {rel.target_name || rel.target_id}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                      {canEdit && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => setDeleteId(rel.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove relationship</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}
                  {filteredOutgoing.length > 0 && filteredIncoming.length > 0 && <Separator />}
                  {filteredIncoming.map((rel) => (
                    <div key={rel.id} className="group flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted transition-colors">
                      <button
                        onClick={() => navigate(getEntityRoute(rel.source_type, rel.source_id))}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">
                          {rel.source_name || rel.source_id}
                        </span>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {rel.source_type.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                          <span className="font-medium text-foreground">{rel.source_name || rel.source_id}</span> <span className="font-medium text-foreground">{rel.relationship_label || rel.relationship_type}</span> this Asset
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                      {canEdit && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => setDeleteId(rel.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove relationship</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Relationship Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Relationship</DialogTitle>
            <DialogDescription>
              Create a new relationship from this {entityType} to another entity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Relationship Type</Label>
              <Select
                value={selectedRelType}
                onValueChange={(val) => {
                  setSelectedRelType(val);
                  setSelectedTarget(null);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {validRelationships.map((r) => (
                    <SelectItem key={r.property_name} value={r.property_name}>
                      {r.label} → {r.target_type_label || r.target_type_iri?.split('#')[1] || '?'}
                    </SelectItem>
                  ))}
                  {validRelationships.length === 0 && (
                    <SelectItem value="_none" disabled>No valid relationships defined</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedRelType && (
              <div>
                <Label>Search Target Entity</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Search by name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchTargets(searchQuery); }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSearchTargets(searchQuery)}
                    disabled={searchLoading || searchQuery.length < 2}
                  >
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedTarget(r)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${
                          selectedTarget?.id === r.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <span className="truncate">{r.name}</span>
                        <Badge variant="outline" className="text-xs ml-2">{r.type}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {selectedTarget && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedTarget.name}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">{selectedTarget.type}</Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRelationship} disabled={!selectedTarget || !selectedRelType || addLoading}>
              {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this relationship? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRelationship}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
