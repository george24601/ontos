import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, ChevronRight, ChevronDown, Loader2, AlertCircle, ExternalLink,
  PlusCircle, Trash2, Search, Box, Table2, Eye, Columns2, LayoutDashboard,
  Globe, FileCode, Brain, Activity, Server, Shield, BookOpen, Database,
  FolderOpen, Shapes, Network, ArrowLeft,
} from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { RelationshipDefinition, InstanceHierarchyNode } from '@/types/ontology-schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SearchResult {
  id: string;
  name: string;
  type: string;
}

interface EntityTreePanelProps {
  entityType: string;
  entityId: string;
  title?: string;
  className?: string;
  canEdit?: boolean;
}

/** Normalized node used at the root level (from flat relationship data). */
interface RootNode {
  relationshipId: string;
  entityType: string;
  entityId: string;
  name: string;
  relationshipType: string;
  relationshipLabel: string;
  direction: 'outgoing' | 'incoming';
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  Table2, Eye, Columns2, LayoutDashboard, Globe, FileCode, Brain, Activity,
  Server, Shield, BookOpen, Database, FolderOpen, Shapes, Box, Network,
};

const TYPE_ICON_FALLBACK: Record<string, React.ElementType> = {
  Table: Table2,
  View: Eye,
  Column: Columns2,
  Dataset: Database,
  Dashboard: LayoutDashboard,
  Notebook: FileCode,
  'ML Model': Brain,
  'API Endpoint': Globe,
  Stream: Activity,
  System: Server,
  Policy: Shield,
  'Business Term': BookOpen,
  Catalog: FolderOpen,
  Schema: Shapes,
  DataProduct: Box,
  DataContract: FileCode,
  DataDomain: Network,
  'Logical Entity': Shapes,
  'Logical Attribute': Columns2,
  'Delivery Channel': Activity,
};

const TYPE_ROUTE_MAP: Record<string, string> = {
  DataProduct: '/data-products',
  DataContract: '/data-contracts',
  DataDomain: '/data-domains',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  deprecated: 'secondary',
  archived: 'destructive',
};

function getEntityRoute(entityType: string, entityId: string): string {
  const base = TYPE_ROUTE_MAP[entityType];
  if (base) return `${base}/${entityId}`;
  return `/assets/${entityId}`;
}

function getIconForType(entityType: string, iconHint?: string | null): React.ElementType {
  if (iconHint && ICON_MAP[iconHint]) return ICON_MAP[iconHint];
  return TYPE_ICON_FALLBACK[entityType] || Box;
}

function formatTypeName(raw: string): string {
  return raw.replace(/([A-Z])/g, ' $1').trim();
}

// ---------------------------------------------------------------------------
// Child tree node (recursive, lazy-loaded via hierarchy API)
// ---------------------------------------------------------------------------

function ChildTreeNode({
  node,
  depth,
}: {
  node: InstanceHierarchyNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<InstanceHierarchyNode[]>(node.children || []);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState((node.children && node.children.length > 0) || node.child_count === 0);

  const navigate = useNavigate();
  const { get: apiGet } = useApi();

  const Icon = getIconForType(node.entity_type, node.icon);
  const hasChildren = node.child_count > 0 || children.length > 0;
  const paddingLeft = depth * 20 + 8;

  const loadChildren = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const response = await apiGet<InstanceHierarchyNode>(
        `/api/entity-hierarchy/${node.entity_type}/${node.entity_id}?max_depth=2`
      );
      if (!response.error && response.data) {
        setChildren(response.data.children || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [apiGet, node.entity_type, node.entity_id, loaded, loading]);

  const handleToggle = useCallback(() => {
    if (!expanded && !loaded) loadChildren();
    setExpanded((v) => !v);
  }, [expanded, loaded, loadChildren]);

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <div
        className={cn(
          'group flex items-center gap-1.5 py-1 pr-2 rounded-md transition-colors',
          hasChildren ? 'cursor-pointer hover:bg-muted' : 'cursor-default',
        )}
        style={{ paddingLeft }}
      >
        <button
          onClick={handleToggle}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted-foreground/10"
          tabIndex={0}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

        <span className="flex-1 text-sm truncate min-w-0">{node.name}</span>

        {node.status && (
          <Badge variant={STATUS_VARIANT[node.status] ?? 'outline'} className="text-[10px] flex-shrink-0 h-4 px-1">
            {node.status}
          </Badge>
        )}

        {node.child_count > 0 && !expanded && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{node.child_count}</span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); navigate(getEntityRoute(node.entity_type, node.entity_id)); }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">View details</TooltipContent>
        </Tooltip>
      </div>

      {expanded && (
        <div role="group">
          {children.map((child) => (
            <ChildTreeNode
              key={`${child.entity_type}-${child.entity_id}`}
              node={child}
              depth={depth + 1}
            />
          ))}
          {!loading && loaded && children.length === 0 && hasChildren && (
            <div className="py-1 text-xs text-muted-foreground italic" style={{ paddingLeft: paddingLeft + 24 }}>
              No children found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root tree node (from flat relationship data, expandable into hierarchy)
// ---------------------------------------------------------------------------

function RootTreeNode({
  rootNode,
  canEdit,
  onDelete,
}: {
  rootNode: RootNode;
  canEdit: boolean;
  onDelete: (relId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<InstanceHierarchyNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [childCount, setChildCount] = useState<number | null>(null);

  const navigate = useNavigate();
  const { get: apiGet } = useApi();
  const Icon = getIconForType(rootNode.entityType);
  const isIncoming = rootNode.direction === 'incoming';

  const loadChildren = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const response = await apiGet<InstanceHierarchyNode>(
        `/api/entity-hierarchy/${rootNode.entityType}/${rootNode.entityId}?max_depth=2`
      );
      if (!response.error && response.data) {
        setChildren(response.data.children || []);
        setChildCount(response.data.child_count ?? 0);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [apiGet, rootNode.entityType, rootNode.entityId, loaded, loading]);

  const handleToggle = useCallback(() => {
    if (!expanded && !loaded) loadChildren();
    setExpanded((v) => !v);
  }, [expanded, loaded, loadChildren]);

  const hasChildren = childCount === null ? true : childCount > 0 || children.length > 0;

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <div className="group flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-muted transition-colors">
        {/* Expand toggle */}
        <button
          onClick={handleToggle}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted-foreground/10"
          tabIndex={0}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : !loaded || hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {isIncoming && <ArrowLeft className="h-3 w-3 text-green-500 flex-shrink-0" />}
        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

        {/* Name */}
        <button
          onClick={() => navigate(getEntityRoute(rootNode.entityType, rootNode.entityId))}
          className="flex-1 text-left text-sm truncate min-w-0 hover:underline"
        >
          {rootNode.name}
        </button>

        {/* Type badge */}
        <Badge variant="secondary" className="text-[10px] flex-shrink-0 h-4 px-1.5">
          {formatTypeName(rootNode.entityType)}
        </Badge>

        {/* Relationship label */}
        <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:inline max-w-40 truncate">
          {rootNode.relationshipLabel || rootNode.relationshipType}
        </span>

        {/* Child count (before expansion) */}
        {loaded && childCount !== null && childCount > 0 && !expanded && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{childCount}</span>
        )}

        {/* Navigate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); navigate(getEntityRoute(rootNode.entityType, rootNode.entityId)); }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">View details</TooltipContent>
        </Tooltip>

        {/* Delete */}
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-opacity"
                onClick={(e) => { e.stopPropagation(); onDelete(rootNode.relationshipId); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Remove relationship</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Lazy-loaded children */}
      {expanded && (
        <div role="group" className="border-l border-border ml-4">
          {children.map((child) => (
            <ChildTreeNode
              key={`${child.entity_type}-${child.entity_id}`}
              node={child}
              depth={1}
            />
          ))}
          {!loading && loaded && children.length === 0 && (
            <div className="py-1 pl-8 text-xs text-muted-foreground italic">
              No children
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function EntityTreePanel({
  entityType,
  entityId,
  title = 'Related Entities',
  className,
  canEdit = false,
}: EntityTreePanelProps) {
  const [data, setData] = useState<RelationshipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add relationship state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [validRelationships, setValidRelationships] = useState<RelationshipDefinition[]>([]);
  const [selectedRelType, setSelectedRelType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Type filter
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { get: apiGet, post: apiPost, delete: apiDelete } = useApi();
  const { toast } = useToast();

  // ------ data fetching ------

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
      const encodedIri = encodeURIComponent(iri);
      const response = await apiGet<{ type_iri: string; outgoing: RelationshipDefinition[]; incoming: RelationshipDefinition[] }>(
        `/api/ontology/entity-types/${encodedIri}/relationships`
      );
      if (!response.error && response.data) {
        setValidRelationships(response.data.outgoing);
      }
    } catch { /* non-critical */ }
  }, [apiGet, entityType]);

  useEffect(() => { fetchRelationships(); }, [fetchRelationships]);

  // ------ CRUD handlers ------

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
          ? response.data.filter((a: any) => a.asset_type_name === targetType || !targetType)
          : response.data;
        setSearchResults(filtered.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.asset_type_name || 'Asset',
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

  // ------ derived data ------

  const outgoing = data?.outgoing || [];
  const incoming = data?.incoming || [];
  const total = outgoing.length + incoming.length;

  const rootNodes: RootNode[] = useMemo(() => {
    const out: RootNode[] = outgoing.map((rel) => ({
      relationshipId: rel.id,
      entityType: rel.target_type,
      entityId: rel.target_id,
      name: rel.target_name || rel.target_id,
      relationshipType: rel.relationship_type,
      relationshipLabel: rel.relationship_label || rel.relationship_type,
      direction: 'outgoing' as const,
    }));
    const inc: RootNode[] = incoming.map((rel) => ({
      relationshipId: rel.id,
      entityType: rel.source_type,
      entityId: rel.source_id,
      name: rel.source_name || rel.source_id,
      relationshipType: rel.relationship_type,
      relationshipLabel: rel.relationship_label || rel.relationship_type,
      direction: 'incoming' as const,
    }));
    return [...out, ...inc];
  }, [outgoing, incoming]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of rootNodes) {
      counts[n.entityType] = (counts[n.entityType] || 0) + 1;
    }
    return counts;
  }, [rootNodes]);

  const filteredNodes = typeFilter
    ? rootNodes.filter(n => n.entityType === typeFilter)
    : rootNodes;

  // ------ render ------

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
                    {count} {formatTypeName(type)}
                  </button>
                ))}
              </div>

              <Separator />

              {filteredNodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No relationships match this filter
                </p>
              ) : (
                <div role="tree" className="space-y-0">
                  {filteredNodes.map((n) => (
                    <RootTreeNode
                      key={n.relationshipId}
                      rootNode={n}
                      canEdit={canEdit}
                      onDelete={setDeleteId}
                    />
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
              Create a new relationship from this {formatTypeName(entityType)} to another entity.
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
