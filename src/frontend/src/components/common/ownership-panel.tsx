/**
 * Reusable ownership panel for embedding in detail pages.
 * Shows current and (optionally) previous owners for any object type.
 * Self-contained: manages assign and remove dialogs internally.
 *
 * Usage:
 *   <OwnershipPanel objectType="data_product" objectId={product.id} canAssign />
 */
import { useState, useEffect, useCallback } from 'react';
import { Users2, History, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RelativeDate } from '@/components/common/relative-date';
import { AssignOwnerDialog } from '@/components/common/assign-owner-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { BusinessOwnerRead, OwnerObjectType } from '@/types/business-owner';

interface OwnershipPanelProps {
  objectType: OwnerObjectType;
  objectId: string;
  /** If true the "Assign Owner" button and per-row remove buttons are shown. */
  canAssign?: boolean;
  /** Optional CSS class name */
  className?: string;
}

export function OwnershipPanel({ objectType, objectId, canAssign = false, className }: OwnershipPanelProps) {
  const [currentOwners, setCurrentOwners] = useState<BusinessOwnerRead[]>([]);
  const [previousOwners, setPreviousOwners] = useState<BusinessOwnerRead[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Remove dialog state
  const [removeTarget, setRemoveTarget] = useState<BusinessOwnerRead | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const { t } = useTranslation(['business-owners', 'common']);
  const { get: apiGet, post: apiPost } = useApi();
  const { toast } = useToast();

  const fetchOwners = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiGet<BusinessOwnerRead[]>(
        `/api/business-owners/by-object/${objectType}/${objectId}?active_only=false`
      );
      if (response.error) throw new Error(response.error);
      const all = Array.isArray(response.data) ? response.data : [];
      setCurrentOwners(all.filter((o) => o.is_active));
      setPreviousOwners(all.filter((o) => !o.is_active));
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('messages.errorFetching'), description: err.message });
      setCurrentOwners([]);
      setPreviousOwners([]);
    } finally {
      setIsLoading(false);
    }
  }, [objectType, objectId, apiGet, toast, t]);

  useEffect(() => {
    if (objectId) fetchOwners();
  }, [objectId, fetchOwners]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const res = await apiPost(`/api/business-owners/${removeTarget.id}/remove`, {
        removal_reason: removeReason.trim() || null,
      });
      if (res.error) throw new Error(res.error);
      toast({ title: t('messages.removed'), description: t('messages.removedSuccess') });
      setRemoveTarget(null);
      setRemoveReason('');
      fetchOwners();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('messages.errorRemoving'), description: err.message });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              {t('panel.title')}
            </CardTitle>
            <div className="flex items-center gap-1">
              {previousOwners.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  <History className="h-4 w-4 mr-1" />
                  {t('panel.history')}
                </Button>
              )}
              {canAssign && (
                <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('panel.assignOwner')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : currentOwners.length === 0 && previousOwners.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('panel.noOwners')}</p>
          ) : (
            <div className="space-y-3">
              {/* Current owners */}
              {currentOwners.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('panel.currentOwners')}
                  </p>
                  {currentOwners.map((owner) => (
                    <div key={owner.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{owner.user_name || owner.user_email}</span>
                        {owner.role_name && (
                          <Badge variant="outline" className="text-xs">{owner.role_name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <RelativeDate date={owner.assigned_at} className="text-xs text-muted-foreground" />
                        {canAssign && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget(owner)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previous owners (collapsible) */}
              {showHistory && previousOwners.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('panel.previousOwners')}
                    </p>
                    {previousOwners.map((owner) => (
                      <div key={owner.id} className="flex items-center justify-between text-sm opacity-60">
                        <div className="flex items-center gap-2">
                          <span>{owner.user_name || owner.user_email}</span>
                          {owner.role_name && (
                            <Badge variant="outline" className="text-xs">{owner.role_name}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {owner.removal_reason && (
                            <span className="text-xs italic text-muted-foreground">{owner.removal_reason}</span>
                          )}
                          {owner.removed_at && (
                            <RelativeDate date={owner.removed_at} className="text-xs text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Owner Dialog */}
      <AssignOwnerDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        objectType={objectType}
        objectId={objectId}
        onSuccess={fetchOwners}
      />

      {/* Remove Owner Confirmation Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setRemoveReason(''); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('removeDialog.title')}</DialogTitle>
            <DialogDescription>{t('removeDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="remove-reason">{t('removeDialog.reasonLabel')}</Label>
            <Input
              id="remove-reason"
              className="mt-2"
              placeholder={t('removeDialog.reasonPlaceholder')}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveTarget(null); setRemoveReason(''); }} disabled={isRemoving}>
              {t('removeDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('removeDialog.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
