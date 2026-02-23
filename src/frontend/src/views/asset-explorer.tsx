import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, ChevronDown, MoreHorizontal, PlusCircle, AlertCircle, Loader2, Search,
  Table2, Eye, Columns2, LayoutDashboard, Globe, FileCode, Brain, Activity,
  Server, Shield, BookOpen, Database, FolderOpen, Shapes,
} from 'lucide-react';
import { ListViewSkeleton } from '@/components/common/list-view-skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AssetRead, AssetTypeRead } from '@/types/asset';
import { EntityTypeDefinition } from '@/types/ontology-schema';
import { AssetFormDialog } from '@/components/common/asset-form-dialog';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { RelativeDate } from '@/components/common/relative-date';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePermissions } from '@/stores/permissions-store';
import { usePersonaStore } from '@/stores/persona-store';
import { FeatureAccessLevel } from '@/types/settings';
import useBreadcrumbStore from '@/stores/breadcrumb-store';
import { cn } from '@/lib/utils';

const PERSONA_TO_ONTOLOGY_TAG: Record<string, string[]> = {
  data_consumer: ['consumer'],
  data_producer: ['producer', 'steward'],
  data_steward: ['steward'],
  data_governance_officer: ['steward', 'admin'],
  security_officer: ['admin'],
  administrator: ['admin'],
};

const ICON_MAP: Record<string, React.ElementType> = {
  Table2, Eye, Columns2, LayoutDashboard, Globe, FileCode, Brain, Activity,
  Server, Shield, BookOpen, Database, FolderOpen, Shapes, Box,
};

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; order: number }> = {
  data: { label: 'Data Assets', icon: Database, order: 1 },
  analytics: { label: 'Analytics', icon: LayoutDashboard, order: 2 },
  integration: { label: 'Integration', icon: Globe, order: 3 },
  system: { label: 'Systems', icon: Server, order: 4 },
  custom: { label: 'Custom', icon: Shapes, order: 5 },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  deprecated: 'secondary',
  archived: 'destructive',
};

function getIconComponent(iconName?: string | null): React.ElementType {
  if (!iconName) return Box;
  return ICON_MAP[iconName] || Box;
}

export default function AssetExplorerView() {
  const [assetTypes, setAssetTypes] = useState<AssetTypeRead[]>([]);
  const [assets, setAssets] = useState<AssetRead[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRead | null>(null);
  const [ontologyTypes, setOntologyTypes] = useState<EntityTypeDefinition[]>([]);
  const didInitialSelect = useRef(false);

  const navigate = useNavigate();
  const { get: apiGet, delete: apiDelete, loading: apiIsLoading } = useApi();
  const { toast } = useToast();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const currentPersona = usePersonaStore((s) => s.currentPersona);
  const setStaticSegments = useBreadcrumbStore((state) => state.setStaticSegments);
  const setDynamicTitle = useBreadcrumbStore((state) => state.setDynamicTitle);

  const featureId = 'assets';
  const canRead = !permissionsLoading && hasPermission(featureId, FeatureAccessLevel.READ_ONLY);
  const canWrite = !permissionsLoading && hasPermission(featureId, FeatureAccessLevel.READ_WRITE);
  const canAdmin = !permissionsLoading && hasPermission(featureId, FeatureAccessLevel.ADMIN);

  const fetchAssetTypes = useCallback(async () => {
    if (!canRead && !permissionsLoading) return;
    try {
      const response = await apiGet<AssetTypeRead[]>('/api/asset-types');
      if (response.error) throw new Error(response.error);
      const types = Array.isArray(response.data) ? response.data : [];
      setAssetTypes(types);
      if (!didInitialSelect.current && types.length > 0) {
        didInitialSelect.current = true;
        const firstWithAssets = types.find(t => t.asset_count > 0) || types[0];
        setSelectedTypeId(firstWithAssets.id);
      }
    } catch (err: any) {
      setComponentError(err.message || 'Failed to load asset types');
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  }, [canRead, permissionsLoading, apiGet, toast]);

  const fetchAssets = useCallback(async (typeId: string | null) => {
    setAssetsLoading(true);
    try {
      const url = typeId ? `/api/assets?asset_type_id=${typeId}` : '/api/assets';
      const response = await apiGet<AssetRead[]>(url);
      if (response.error) throw new Error(response.error);
      setAssets(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setAssets([]);
      toast({ variant: 'destructive', title: 'Error loading assets', description: err.message });
    } finally {
      setAssetsLoading(false);
    }
  }, [apiGet, toast]);

  const fetchOntologyTypes = useCallback(async () => {
    try {
      const response = await apiGet<EntityTypeDefinition[]>('/api/ontology/entity-types?tier=asset');
      if (!response.error && Array.isArray(response.data)) {
        setOntologyTypes(response.data);
      }
    } catch { /* non-critical */ }
  }, [apiGet]);

  const getOntologyIri = useCallback((typeName: string): string | null => {
    const match = ontologyTypes.find(
      (t) => t.label === typeName || t.local_name === typeName
    );
    return match?.iri ?? null;
  }, [ontologyTypes]);

  useEffect(() => {
    fetchAssetTypes();
    fetchOntologyTypes();
    setStaticSegments([]);
    setDynamicTitle('Asset Explorer');
    return () => { setStaticSegments([]); setDynamicTitle(null); };
  }, [fetchAssetTypes, fetchOntologyTypes, setStaticSegments, setDynamicTitle]);

  useEffect(() => {
    if (didInitialSelect.current) {
      fetchAssets(selectedTypeId);
    }
  }, [selectedTypeId, fetchAssets]);

  const selectedType = useMemo(
    () => assetTypes.find(t => t.id === selectedTypeId),
    [assetTypes, selectedTypeId]
  );

  const visibleAssetTypes = useMemo(() => {
    if (!currentPersona || ontologyTypes.length === 0) return assetTypes;
    const personaTags = PERSONA_TO_ONTOLOGY_TAG[currentPersona] || [];
    if (personaTags.length === 0) return assetTypes;

    const visibleNames = new Set<string>();
    for (const ot of ontologyTypes) {
      const vis = ot.persona_visibility;
      if (!vis || vis.length === 0) {
        visibleNames.add(ot.label);
        continue;
      }
      if (personaTags.some(tag => vis.includes(tag))) {
        visibleNames.add(ot.label);
      }
    }
    return assetTypes.filter(t => visibleNames.has(t.name));
  }, [assetTypes, ontologyTypes, currentPersona]);

  const groupedTypes = useMemo(() => {
    const groups: Record<string, AssetTypeRead[]> = {};
    for (const t of visibleAssetTypes) {
      const cat = t.category || 'custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99));
  }, [visibleAssetTypes]);

  const totalAssetCount = useMemo(
    () => visibleAssetTypes.reduce((sum, t) => sum + (t.asset_count || 0), 0),
    [visibleAssetTypes]
  );

  const openDeleteDialog = (id: string) => {
    if (!canAdmin) {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'Admin access required to delete assets' });
      return;
    }
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId || !canAdmin) return;
    try {
      const response = await apiDelete(`/api/assets/${deletingId}`);
      if (response.error) throw new Error(response.error);
      toast({ title: 'Asset deleted' });
      fetchAssets(selectedTypeId);
      fetchAssetTypes();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const columns = useMemo<ColumnDef<AssetRead>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <div className="text-xs text-muted-foreground truncate max-w-sm">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => row.original.platform
        ? <Badge variant="outline">{row.original.platform}</Badge>
        : <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="truncate max-w-xs text-sm text-muted-foreground font-mono">
          {row.original.location || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'outline'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (!tags || tags.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {tags.length > 3 && <Badge variant="outline" className="text-xs">+{tags.length - 3}</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Updated <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.updated_at
        ? <RelativeDate date={row.original.updated_at} />
        : '-',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigate(`/governance/assets/${row.original.id}`)}
            >
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canWrite}
              onClick={() => { setEditingAsset(row.original); setIsFormOpen(true); }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDeleteDialog(row.original.id)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950"
              disabled={!canAdmin}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [canWrite, canAdmin, navigate]);

  if (apiIsLoading && assetTypes.length === 0) {
    return (
      <div className="py-6">
        <ListViewSkeleton columns={5} rows={5} toolbarButtons={1} />
      </div>
    );
  }

  if (!canRead && !permissionsLoading) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>You don't have access to view assets.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="w-8 h-8" />
          Asset Explorer
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and manage all governed assets across {visibleAssetTypes.length} types ({totalAssetCount} total assets)
        </p>
      </div>

      {componentError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{componentError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6">
        {/* Sidebar: Asset Types grouped by category */}
        <div className="w-72 flex-shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Asset Types</CardTitle>
              <CardDescription className="text-xs">
                {assetTypes.length} types across {groupedTypes.length} categories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="px-2 pb-2">
                  {/* "All" option */}
                  <button
                    onClick={() => setSelectedTypeId(null)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors mb-1',
                      !selectedTypeId
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <Shapes className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">All Assets</span>
                    <Badge variant={!selectedTypeId ? 'secondary' : 'outline'} className="text-xs ml-auto">
                      {totalAssetCount}
                    </Badge>
                  </button>

                  <Separator className="my-2" />

                  {groupedTypes.map(([category, types]) => {
                    const meta = CATEGORY_META[category] || CATEGORY_META.custom;
                    const CategoryIcon = meta.icon;
                    const categoryCount = types.reduce((s, t) => s + (t.asset_count || 0), 0);

                    return (
                      <div key={category} className="mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <CategoryIcon className="h-3.5 w-3.5" />
                          {meta.label}
                          <span className="ml-auto text-xs font-normal">{categoryCount}</span>
                        </div>
                        {types
                          .sort((a, b) => (b.asset_count || 0) - (a.asset_count || 0))
                          .map((assetType) => {
                            const TypeIcon = getIconComponent(assetType.icon);
                            const isSelected = selectedTypeId === assetType.id;
                            return (
                              <button
                                key={assetType.id}
                                onClick={() => setSelectedTypeId(assetType.id)}
                                className={cn(
                                  'w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                                  isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted text-foreground'
                                )}
                              >
                                <TypeIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">{assetType.name}</span>
                                <Badge
                                  variant={isSelected ? 'secondary' : 'outline'}
                                  className="text-xs ml-auto"
                                >
                                  {assetType.asset_count || 0}
                                </Badge>
                              </button>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main content: Asset table */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedType && (() => {
                    const Icon = getIconComponent(selectedType.icon);
                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                  <div>
                    <CardTitle className="text-lg">
                      {selectedType ? selectedType.name : 'All Assets'}
                    </CardTitle>
                    {selectedType?.description && (
                      <CardDescription className="text-xs mt-0.5">
                        {selectedType.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedType?.category && (
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_META[selectedType.category]?.label || selectedType.category}
                    </Badge>
                  )}
                  <Badge variant="secondary">{assets.length} assets</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {assetsLoading ? (
                <ListViewSkeleton columns={5} rows={5} toolbarButtons={1} />
              ) : assets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {selectedType
                      ? `No ${selectedType.name} assets yet`
                      : 'Select an asset type to view assets'}
                  </p>
                  {canWrite && selectedType && (
                    <Button
                      variant="outline"
                      className="mt-3"
                      size="sm"
                      onClick={() => { setEditingAsset(null); setIsFormOpen(true); }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Create {selectedType.name}
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={assets}
                  searchColumn="name"
                  storageKey={`asset-explorer-${selectedTypeId || 'all'}`}
                  onRowClick={(row) => navigate(`/governance/assets/${row.id}`)}
                  toolbarActions={
                    canWrite && selectedType ? (
                      <Button
                        size="sm"
                        className="h-9"
                        onClick={() => { setEditingAsset(null); setIsFormOpen(true); }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add {selectedType.name}
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedType && (
        <AssetFormDialog
          isOpen={isFormOpen}
          onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingAsset(null); }}
          onSuccess={() => {
            fetchAssets(selectedTypeId);
            fetchAssetTypes();
          }}
          assetTypeId={selectedType.id}
          assetTypeName={selectedType.name}
          assetTypeIri={getOntologyIri(selectedType.name)}
          asset={editingAsset}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The asset and its relationships will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700" disabled={apiIsLoading}>
              {apiIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
