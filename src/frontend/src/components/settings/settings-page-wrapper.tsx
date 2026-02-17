import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ShieldX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePermissions } from '@/stores/permissions-store';
import { FeatureAccessLevel } from '@/types/settings';
import useBreadcrumbStore from '@/stores/breadcrumb-store';

interface SettingsPageWrapperProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Shared wrapper for standalone settings pages.
 * Handles permission check, loading state, and breadcrumb setup.
 */
export default function SettingsPageWrapper({ title, children }: SettingsPageWrapperProps) {
  const { t } = useTranslation(['settings', 'common']);
  const { isLoading: permissionsLoading, hasPermission } = usePermissions();
  const setStaticSegments = useBreadcrumbStore((state) => state.setStaticSegments);
  const setDynamicTitle = useBreadcrumbStore((state) => state.setDynamicTitle);

  const hasSettingsAccess = hasPermission('settings', FeatureAccessLevel.READ_ONLY);

  useEffect(() => {
    setStaticSegments([]);
    setDynamicTitle(title);
    return () => {
      setStaticSegments([]);
      setDynamicTitle(null);
    };
  }, [title, setStaticSegments, setDynamicTitle]);

  if (permissionsLoading) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="py-6">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive" className="border-2">
            <ShieldX className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              {t('settings:accessDenied.title', 'Access Denied')}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                {t('settings:accessDenied.message', 'You do not have permission to access this page. This page is restricted to users with administrative privileges.')}
              </p>
              <p className="text-sm">
                {t('settings:accessDenied.action', 'If you believe you should have access, please contact your administrator or ')}
                <Link to="/" className="font-semibold underline hover:text-destructive-foreground">
                  {t('settings:accessDenied.returnHome', 'return to the home page')}
                </Link>
                {t('settings:accessDenied.requestRole', ' to request an appropriate role.')}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {children}
    </div>
  );
}
