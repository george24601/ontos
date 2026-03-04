import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores/layout-store';
import { useCopilotStore } from '@/stores/copilot-store';
import CopilotPanel from '@/components/copilot/copilot-panel';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation(['search']);
  const isSidebarCollapsed = useLayoutStore((state) => state.isSidebarCollapsed);
  const { toggleSidebar } = useLayoutStore((state) => state.actions);
  const isCopilotOpen = useCopilotStore((s) => s.isOpen);
  const { togglePanel } = useCopilotStore((s) => s.actions);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "ml-[56px]" : "ml-[240px]",
        isCopilotOpen && "mr-[400px]"
      )}>
        <Header onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumbs className="mb-6" />
          {children}
        </main>
      </div>

      {/* Floating Ask Ontos button */}
      {!isCopilotOpen && (
        <Button
          onClick={togglePanel}
          className="fixed bottom-6 right-6 z-40 gap-2 shadow-lg"
          size="sm"
        >
          <MessageSquareText className="h-4 w-4" />
          {t('search:copilot.button')}
        </Button>
      )}

      <CopilotPanel />
    </div>
  );
} 