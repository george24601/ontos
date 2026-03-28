import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Globe, Lock, Eye, Building2 } from 'lucide-react';
import CertificationBadge from '@/components/common/certification-badge';
import {
  ENTITY_STATUS_LABELS,
  ENTITY_STATUS_COLORS,
  PUBLICATION_SCOPE_LABELS,
  type EntityStatus,
  type PublicationScope,
  type CertificationLevel,
} from '@/types/lifecycle';

interface LifecycleSummaryPanelProps {
  status: string;
  certificationLevel?: number | null;
  inheritedCertificationLevel?: number | null;
  certifiedAt?: string | null;
  certifiedBy?: string | null;
  certificationExpiresAt?: string | null;
  publicationScope?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  certificationLevels: CertificationLevel[];
  showPublication?: boolean;
}

const SCOPE_ICONS: Record<string, typeof Globe> = {
  none: Lock,
  domain: Building2,
  organization: Eye,
  external: Globe,
};

export default function LifecycleSummaryPanel({
  status,
  certificationLevel,
  inheritedCertificationLevel,
  certifiedAt,
  certifiedBy,
  certificationExpiresAt,
  publicationScope,
  publishedAt,
  publishedBy,
  certificationLevels,
  showPublication = true,
}: LifecycleSummaryPanelProps) {
  const statusLabel = ENTITY_STATUS_LABELS[status as EntityStatus] || status;
  const statusColor = ENTITY_STATUS_COLORS[status as EntityStatus] || '';
  const scope = (publicationScope || 'none') as PublicationScope;
  const scopeLabel = PUBLICATION_SCOPE_LABELS[scope] || scope;
  const ScopeIcon = SCOPE_ICONS[scope] || Lock;

  const isExpired = certificationExpiresAt
    ? new Date(certificationExpiresAt) < new Date()
    : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="outline" className={statusColor}>
            {statusLabel}
          </Badge>
        </div>

        {/* Certification */}
        <Separator />
        <div className="space-y-2">
          <span className="text-sm font-medium">Certification</span>
          {certificationLevel || inheritedCertificationLevel ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Level</span>
                <CertificationBadge
                  certificationLevel={certificationLevel}
                  inheritedCertificationLevel={inheritedCertificationLevel}
                  certifiedAt={certifiedAt}
                  certifiedBy={certifiedBy}
                  levels={certificationLevels}
                  size="sm"
                />
              </div>
              {certifiedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Certified by</span>
                  <span className="text-xs">{certifiedBy}</span>
                </div>
              )}
              {certifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Certified on</span>
                  <span className="text-xs">{new Date(certifiedAt).toLocaleDateString()}</span>
                </div>
              )}
              {certificationExpiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expires</span>
                  <span className={`text-xs ${isExpired ? 'text-destructive font-medium' : ''}`}>
                    {new Date(certificationExpiresAt).toLocaleDateString()}
                    {isExpired && ' (expired)'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not certified</p>
          )}
        </div>

        {/* Publication */}
        {showPublication && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium">Publication</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Scope</span>
                <Badge variant={scope === 'none' ? 'secondary' : 'outline'} className="text-xs">
                  <ScopeIcon className="h-3 w-3 mr-1" />
                  {scopeLabel}
                </Badge>
              </div>
              {publishedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Published by</span>
                  <span className="text-xs">{publishedBy}</span>
                </div>
              )}
              {publishedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Published on</span>
                  <span className="text-xs">{new Date(publishedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
