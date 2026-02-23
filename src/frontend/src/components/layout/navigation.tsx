import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { features } from '@/config/features';
import { PERSONA_NAV, type PersonaNavItem } from '@/config/persona-nav';
import { useTranslation } from 'react-i18next';
import { useFeatureVisibilityStore } from '@/stores/feature-visibility-store';
import { usePersonaStore } from '@/stores/persona-store';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/stores/permissions-store';
import { FeatureAccessLevel } from '@/types/settings';
import { Loader2, AlertCircle } from 'lucide-react';
import type { PersonaId } from '@/types/settings';

interface NavigationProps {
  isCollapsed: boolean;
}

interface NavGroup {
  label: string | null; // null = ungrouped (no header)
  items: PersonaNavItem[];
}

export function Navigation({ isCollapsed }: NavigationProps) {
  const { t } = useTranslation(['navigation', 'features', 'settings']);
  const location = useLocation();
  const allowedMaturities = useFeatureVisibilityStore((state) => state.allowedMaturities);
  const { isLoading: permissionsLoading, hasPermission, _initAttempted, permissions } = usePermissions();
  const currentPersona = usePersonaStore((state) => state.currentPersona);
  const personasLoading = usePersonaStore((state) => state.isLoading);

  const permissionsReady = _initAttempted && !permissionsLoading && Object.keys(permissions).length > 0;

  const navGroups = useMemo((): NavGroup[] => {
    if (!currentPersona) return [];
    const all = (PERSONA_NAV[currentPersona as PersonaId] || []).filter((item) => {
      if (!item.featureId) return true;
      if (!permissionsReady) return true;
      const feature = features.find(f => f.id === item.featureId);
      if (feature && !allowedMaturities.includes(feature.maturity)) return false;
      return hasPermission(item.featureId, FeatureAccessLevel.READ_ONLY);
    });
    const groups: NavGroup[] = [];
    let currentGroup: NavGroup | null = null;
    for (const item of all) {
      const groupLabel = item.group ?? null;
      if (groupLabel !== currentGroup?.label) {
        currentGroup = { label: groupLabel, items: [] };
        groups.push(currentGroup);
      }
      currentGroup!.items.push(item);
    }
    return groups;
  }, [currentPersona, allowedMaturities, hasPermission, permissionsReady]);

  if (permissionsLoading || personasLoading || !_initAttempted) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentPersona) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        {!isCollapsed && (
          <p className="text-xs text-muted-foreground">
            {t('navigation:noPersona', { defaultValue: 'No persona assigned' })}
          </p>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full py-2">
      <TooltipProvider delayDuration={0}>
        <nav className={cn("flex flex-col px-1 gap-0.5")}>
          {navGroups.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {gi > 0 && <Separator className="my-2" />}
              {group.label && !isCollapsed && (
                <div className="px-2 pt-1 pb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t(`settings:navGroups.${group.label}`, { defaultValue: group.label })}
                  </span>
                </div>
              )}
              {group.label && isCollapsed && gi > 0 && null}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                const label = t(`settings:${item.labelKey}`, { defaultValue: item.id });
                const Icon = item.icon;
                const feature = item.featureId ? features.find(f => f.id === item.featureId) : undefined;
                const maturity = feature?.maturity;

                return isCollapsed ? (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn('flex items-center justify-center rounded-lg p-2 transition-colors', isActive ? 'bg-muted text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} aria-label={label} asChild>
                        <NavLink to={item.path}><Icon className="h-5 w-5" /><span className="sr-only">{label}</span></NavLink>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {label}
                      {maturity && maturity !== 'ga' && (
                        <sup className={cn(
                          "ml-1 text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap",
                          maturity === 'beta' ? "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-400" : "",
                          maturity === 'alpha' ? "bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400" : ""
                        )}>
                          {maturity === 'beta' ? 'β' : 'α'}
                        </sup>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink key={item.id} to={item.path} className={({ isActive: navIsActive }) => cn('flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors', navIsActive ? 'bg-muted text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 min-w-0 truncate">
                      {label}
                      {maturity && maturity !== 'ga' && (
                        <sup className={cn(
                          "ml-1 text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap",
                          maturity === 'beta' ? "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-400" : "",
                          maturity === 'alpha' ? "bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400" : ""
                        )}>
                          {maturity === 'beta' ? 'β' : 'α'}
                        </sup>
                      )}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </TooltipProvider>
    </ScrollArea>
  );
}
