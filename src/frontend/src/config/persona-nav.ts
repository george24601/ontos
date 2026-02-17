/**
 * Persona-based navigation config.
 * Each persona has a list of nav items (label, path, icon, optional featureId for permission checks).
 */

import type { PersonaId } from '@/types/settings';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  ShoppingCart,
  Package,
  BookOpen,
  MessageSquare,
  FileText,
  Table2,
  ClipboardCheck,
  CheckCircle,
  FolderKanban,
  BoxSelect,
  UserCheck,
  FolderOpen,
  Shield,
  GitBranch,
  Tag,
  Network,
  Layers,
  Shapes,
  Columns2,
  Globe2,
  Search,
  ScrollText,
  Cpu,
  Palette,
  Plug,
  Briefcase,
  Users,
  Users2,
  Lock,
  RefreshCw,
  Globe,
  Database,
  Box,
  Settings,
  Truck,
  Info,
  Factory,
  Crown,
  Scale,
  Landmark,
  ShieldCheck,
  Brain,
  BookMarked,
  Wrench,
} from 'lucide-react';

export interface PersonaNavItem {
  id: string;
  labelKey: string; // i18n key, e.g. 'personaNav.marketplace'
  path: string;
  icon: LucideIcon;
  featureId?: string; // If set, menu item is shown only when user has READ_ONLY+ on this feature
}

/** URL prefix per persona. */
export const PERSONA_BASE_PATHS: Record<PersonaId, string> = {
  data_consumer: '/consumer',
  data_producer: '/producer',
  data_product_owner: '/owner',
  data_steward: '/steward',
  data_governance_officer: '/governance',
  security_officer: '/security',
  ontology_engineer: '/ontology',
  business_term_owner: '/terms',
  administrator: '/admin',
};

/** Nav items per persona (persona ID -> list of nav items). */
export const PERSONA_NAV: Record<PersonaId, PersonaNavItem[]> = {
  data_consumer: [
    { id: 'marketplace', labelKey: 'personaNav.marketplace', path: '/consumer', icon: ShoppingCart, featureId: 'data-products' },
    { id: 'my-products', labelKey: 'personaNav.myProducts', path: '/consumer/my-products', icon: Package, featureId: 'data-products' },
    { id: 'business-lineage', labelKey: 'personaNav.businessLineage', path: '/consumer/lineage', icon: BookOpen, featureId: 'data-catalog' },
    { id: 'requests', labelKey: 'personaNav.requests', path: '/consumer/requests', icon: MessageSquare, featureId: 'access-grants' },
  ],
  data_producer: [
    { id: 'home', labelKey: 'personaNav.home', path: '/producer', icon: Home },
    { id: 'data-products', labelKey: 'personaNav.dataProducts', path: '/producer/products', icon: Package, featureId: 'data-products' },
    { id: 'datasets', labelKey: 'personaNav.datasets', path: '/producer/datasets', icon: Table2, featureId: 'datasets' },
    { id: 'contracts', labelKey: 'personaNav.contracts', path: '/producer/contracts', icon: FileText, featureId: 'data-contracts' },
    { id: 'requests', labelKey: 'personaNav.requests', path: '/producer/requests', icon: ClipboardCheck, featureId: 'data-asset-reviews' },
  ],
  data_product_owner: [
    { id: 'home', labelKey: 'personaNav.home', path: '/owner', icon: Home },
    { id: 'my-products', labelKey: 'personaNav.myProducts', path: '/owner/products', icon: Package, featureId: 'data-products' },
    { id: 'contracts', labelKey: 'personaNav.contracts', path: '/owner/contracts', icon: FileText, featureId: 'data-contracts' },
    { id: 'consumers', labelKey: 'personaNav.consumers', path: '/owner/consumers', icon: Users, featureId: 'data-products' },
    { id: 'product-health', labelKey: 'personaNav.productHealth', path: '/owner/health', icon: CheckCircle, featureId: 'compliance' },
  ],
  data_steward: [
    { id: 'home', labelKey: 'personaNav.home', path: '/steward', icon: Home },
    { id: 'catalog-commander', labelKey: 'personaNav.catalogCommander', path: '/steward/commander', icon: FolderKanban, featureId: 'catalog-commander' },
    { id: 'assets', labelKey: 'personaNav.assets', path: '/steward/assets', icon: Box, featureId: 'assets' },
    { id: 'compliance-checks', labelKey: 'personaNav.complianceChecks', path: '/steward/compliance', icon: CheckCircle, featureId: 'compliance' },
    { id: 'asset-review', labelKey: 'personaNav.assetReview', path: '/steward/reviews', icon: ClipboardCheck, featureId: 'data-asset-reviews' },
    { id: 'master-data', labelKey: 'personaNav.masterData', path: '/steward/master-data', icon: Database, featureId: 'master-data' },
  ],
  data_governance_officer: [
    { id: 'home', labelKey: 'personaNav.home', path: '/governance', icon: Home },
    { id: 'domains', labelKey: 'personaNav.domains', path: '/governance/domains', icon: BoxSelect, featureId: 'data-domains' },
    { id: 'teams', labelKey: 'personaNav.teams', path: '/governance/teams', icon: UserCheck, featureId: 'teams' },
    { id: 'projects', labelKey: 'personaNav.projects', path: '/governance/projects', icon: FolderOpen, featureId: 'projects' },
    { id: 'policies', labelKey: 'personaNav.policies', path: '/governance/policies', icon: Shield, featureId: 'policies' },
    { id: 'asset-types', labelKey: 'personaNav.assetTypes', path: '/governance/asset-types', icon: Shapes, featureId: 'assets' },
    { id: 'assets', labelKey: 'personaNav.assets', path: '/governance/assets', icon: Box, featureId: 'assets' },
    { id: 'tags', labelKey: 'personaNav.tags', path: '/governance/tags', icon: Tag, featureId: 'settings' },
    { id: 'workflows', labelKey: 'personaNav.workflows', path: '/governance/workflows', icon: GitBranch, featureId: 'process-workflows' },
    { id: 'master-data', labelKey: 'personaNav.masterData', path: '/governance/master-data', icon: Database, featureId: 'master-data' },
    { id: 'estate-manager', labelKey: 'personaNav.estateManager', path: '/governance/estates', icon: Globe, featureId: 'estate-manager' },
  ],
  security_officer: [
    { id: 'home', labelKey: 'personaNav.home', path: '/security', icon: Home },
    { id: 'security-features', labelKey: 'personaNav.securityFeatures', path: '/security/features', icon: Lock, featureId: 'security-features' },
    { id: 'entitlements', labelKey: 'personaNav.entitlements', path: '/security/entitlements', icon: Shield, featureId: 'entitlements' },
    { id: 'entitlements-sync', labelKey: 'personaNav.entitlementsSync', path: '/security/sync', icon: RefreshCw, featureId: 'entitlements-sync' },
  ],
  ontology_engineer: [
    { id: 'home', labelKey: 'personaNav.home', path: '/ontology', icon: Home },
    { id: 'domains', labelKey: 'personaNav.domains', path: '/ontology/domains', icon: BoxSelect, featureId: 'data-domains' },
    { id: 'collections', labelKey: 'personaNav.collections', path: '/ontology/collections', icon: Layers, featureId: 'semantic-models' },
    { id: 'glossaries', labelKey: 'personaNav.glossaries', path: '/ontology/glossaries', icon: BookOpen, featureId: 'semantic-models' },
    { id: 'concepts', labelKey: 'personaNav.concepts', path: '/ontology/concepts', icon: Shapes, featureId: 'semantic-models' },
    { id: 'properties', labelKey: 'personaNav.properties', path: '/ontology/properties', icon: Columns2, featureId: 'semantic-models' },
    { id: 'ontologies', labelKey: 'personaNav.ontologies', path: '/ontology/ontologies', icon: Network, featureId: 'semantic-models' },
    { id: 'knowledge-graph', labelKey: 'personaNav.knowledgeGraph', path: '/ontology/kg', icon: Globe2, featureId: 'semantic-models' },
    { id: 'semantic-models-settings', labelKey: 'personaNav.semanticModelsSettings', path: '/ontology/semantic-models-settings', icon: Settings, featureId: 'settings' },
  ],
  business_term_owner: [
    { id: 'home', labelKey: 'personaNav.home', path: '/terms', icon: Home },
    { id: 'terms', labelKey: 'personaNav.terms', path: '/terms/glossary', icon: BookOpen, featureId: 'semantic-models' },
    { id: 'requests', labelKey: 'personaNav.requests', path: '/terms/requests', icon: ClipboardCheck, featureId: 'data-asset-reviews' },
  ],
  administrator: [
    { id: 'home', labelKey: 'personaNav.home', path: '/admin', icon: Home },
    { id: 'general', labelKey: 'personaNav.general', path: '/admin/general', icon: Settings, featureId: 'settings' },
    { id: 'git', labelKey: 'personaNav.git', path: '/admin/git', icon: GitBranch, featureId: 'settings' },
    { id: 'delivery-modes', labelKey: 'personaNav.deliveryModes', path: '/admin/delivery', icon: Truck, featureId: 'settings' },
    { id: 'jobs', labelKey: 'personaNav.jobs', path: '/admin/jobs', icon: Briefcase, featureId: 'settings' },
    { id: 'app-roles', labelKey: 'personaNav.appRoles', path: '/admin/roles', icon: Shield, featureId: 'settings' },
    { id: 'tags', labelKey: 'personaNav.tags', path: '/admin/tags', icon: Tag, featureId: 'settings' },
    { id: 'business-roles', labelKey: 'personaNav.businessRoles', path: '/admin/business-roles', icon: Briefcase, featureId: 'business-roles' },
    { id: 'business-owners', labelKey: 'personaNav.businessOwners', path: '/admin/business-owners', icon: Users2, featureId: 'business-owners' },
    { id: 'search-settings', labelKey: 'personaNav.searchSettings', path: '/admin/search', icon: Search, featureId: 'settings' },
    { id: 'mcp-settings', labelKey: 'personaNav.mcpSettings', path: '/admin/mcp', icon: Cpu, featureId: 'settings' },
    { id: 'ui-customization', labelKey: 'personaNav.uiCustomization', path: '/admin/ui', icon: Palette, featureId: 'settings' },
    { id: 'connectors', labelKey: 'personaNav.connectors', path: '/admin/connectors', icon: Plug, featureId: 'settings' },
    { id: 'audit', labelKey: 'personaNav.audit', path: '/admin/audit', icon: ScrollText, featureId: 'audit' },
    { id: 'about', labelKey: 'personaNav.about', path: '/admin/about', icon: Info },
  ],
};

/** Persona display names for switcher and role edit (i18n keys). */
export const PERSONA_LABEL_KEYS: Record<PersonaId, string> = {
  data_consumer: 'personas.data_consumer',
  data_producer: 'personas.data_producer',
  data_product_owner: 'personas.data_product_owner',
  data_steward: 'personas.data_steward',
  data_governance_officer: 'personas.data_governance_officer',
  security_officer: 'personas.security_officer',
  ontology_engineer: 'personas.ontology_engineer',
  business_term_owner: 'personas.business_term_owner',
  administrator: 'personas.administrator',
};

/** Visual identity per persona: icon, Tailwind color classes, and description i18n key. */
export interface PersonaMeta {
  icon: LucideIcon;
  /** Subtle background for the icon circle */
  bgClass: string;
  /** Icon/text color */
  textClass: string;
  /** i18n key for a short description shown in the switcher popover */
  descriptionKey: string;
}

export const PERSONA_META: Record<PersonaId, PersonaMeta> = {
  data_consumer: {
    icon: ShoppingCart,
    bgClass: 'bg-blue-500/15 dark:bg-blue-500/20',
    textClass: 'text-blue-600 dark:text-blue-400',
    descriptionKey: 'personaDescriptions.data_consumer',
  },
  data_producer: {
    icon: Factory,
    bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    descriptionKey: 'personaDescriptions.data_producer',
  },
  data_product_owner: {
    icon: Crown,
    bgClass: 'bg-orange-500/15 dark:bg-orange-500/20',
    textClass: 'text-orange-600 dark:text-orange-400',
    descriptionKey: 'personaDescriptions.data_product_owner',
  },
  data_steward: {
    icon: Scale,
    bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
    textClass: 'text-amber-600 dark:text-amber-400',
    descriptionKey: 'personaDescriptions.data_steward',
  },
  data_governance_officer: {
    icon: Landmark,
    bgClass: 'bg-purple-500/15 dark:bg-purple-500/20',
    textClass: 'text-purple-600 dark:text-purple-400',
    descriptionKey: 'personaDescriptions.data_governance_officer',
  },
  security_officer: {
    icon: ShieldCheck,
    bgClass: 'bg-red-500/15 dark:bg-red-500/20',
    textClass: 'text-red-600 dark:text-red-400',
    descriptionKey: 'personaDescriptions.security_officer',
  },
  ontology_engineer: {
    icon: Brain,
    bgClass: 'bg-teal-500/15 dark:bg-teal-500/20',
    textClass: 'text-teal-600 dark:text-teal-400',
    descriptionKey: 'personaDescriptions.ontology_engineer',
  },
  business_term_owner: {
    icon: BookMarked,
    bgClass: 'bg-pink-500/15 dark:bg-pink-500/20',
    textClass: 'text-pink-600 dark:text-pink-400',
    descriptionKey: 'personaDescriptions.business_term_owner',
  },
  administrator: {
    icon: Wrench,
    bgClass: 'bg-slate-500/15 dark:bg-slate-500/20',
    textClass: 'text-slate-600 dark:text-slate-400',
    descriptionKey: 'personaDescriptions.administrator',
  },
};
