import {
    FileTextIcon,
    Network,
    Users, // Using Users icon from About for MDM for now
    Users2, // Icon for Business Owners
    CheckCircle, // Using CheckCircle icon from About for Compliance for now
    Globe,
    Lock, // Using Lock icon from About for Security for now
    Shield, // Icon for Policies
    RefreshCw, // Using RefreshCw icon from About for Entitlements Sync for now
    FolderKanban, // Icon for Catalog Commander
    Settings,
    Info,
    ClipboardCheck, // Added icon for Data Asset Review
    BoxSelect, // Added icon for Data Domain
    Search, // Added icon for Search
    UserCheck, // Added icon for Teams
    FolderOpen, // Added icon for Projects
    ScrollText, // Added icon for Audit Trail
    Table2, // Icon for Datasets (matching marketplace)
    Package, // Icon for Data Products (matching marketplace)
    GitBranch, // Icon for Process Workflows
    BookOpen, // Icon for Data Catalog
    Box, // Icon for Assets
    Shapes, // Icon for Asset Types
    Briefcase, // Icon for Business Roles
    type LucideIcon, // Import LucideIcon type
  } from 'lucide-react';
  
  export type FeatureMaturity = 'ga' | 'beta' | 'alpha';
  
  export interface FeatureConfig {
    id: string;
    name: string;
    path: string;
    description: string;
    icon: LucideIcon;
    maturity: FeatureMaturity;
    showInLanding?: boolean;
  }
  
  export const features: FeatureConfig[] = [
    // Data Products - Core product development lifecycle
    {
      id: 'data-domains',
      name: 'Domains',
      path: '/data-domains',
      description: 'Organize data products and assets into logical domains.',
      icon: BoxSelect,
      maturity: 'ga',
      showInLanding: true,
    },
    {
      id: 'teams',
      name: 'Teams',
      path: '/teams',
      description: 'Manage teams and team members with role overrides.',
      icon: UserCheck,
      maturity: 'ga',
      showInLanding: false,
    },
    {
      id: 'projects',
      name: 'Projects',
      path: '/projects',
      description: 'Manage projects and assign teams for workspace isolation.',
      icon: FolderOpen,
      maturity: 'ga',
      showInLanding: false,
    },
    {
      id: 'datasets',
      name: 'Datasets',
      path: '/datasets',
      description: 'Physical implementations of data contracts (tables, views).',
      icon: Table2,
      maturity: 'ga',
      showInLanding: true,
    },
    {
      id: 'data-contracts',
      name: 'Contracts',
      path: '/data-contracts',
      description: 'Define and enforce technical metadata standards.',
      icon: FileTextIcon,
      maturity: 'ga',
      showInLanding: true,
    },
    {
      id: 'data-products',
      name: 'Products',
      path: '/data-products',
      description: 'Group and manage related Databricks assets with tags.',
      icon: Package,
      maturity: 'ga',
      showInLanding: true,
    },
    // Governance - Standards definition and approval workflows
  {
    id: 'semantic-models',
    name: 'Business Glossary',
    path: '/semantic-models',
    description: 'Explore business glossary terms, concepts, and their relationships.',
    icon: Network,
    maturity: 'ga',
    showInLanding: true,
  },
    {
      id: 'data-asset-reviews',
      name: 'Asset Review',
      path: '/data-asset-reviews',
      description: 'Review and approve Databricks assets like tables, views, and functions.',
      icon: ClipboardCheck,
      maturity: 'beta',
      showInLanding: true,
    },
    {
      id: 'data-catalog',
      name: 'Data Catalog',
      path: '/data-catalog',
      description: 'Browse Unity Catalog assets, search columns, and analyze lineage.',
      icon: BookOpen,
      maturity: 'beta',
      showInLanding: true,
    },
    {
      id: 'assets',
      name: 'Assets',
      path: '/assets',
      description: 'Catalog and manage data and analytics assets with identity, metadata, and relationships.',
      icon: Box,
      maturity: 'beta',
      showInLanding: true,
    },
    {
      id: 'asset-types',
      name: 'Asset Types',
      path: '/asset-types',
      description: 'Define reusable templates for structuring different kinds of assets.',
      icon: Shapes,
      maturity: 'beta',
      showInLanding: false,
    },
    {
      id: 'business-roles',
      name: 'Business Roles',
      path: '/business-roles',
      description: 'Manage named roles (e.g., Data Owner) for ownership assignments.',
      icon: Briefcase,
      maturity: 'beta',
      showInLanding: false,
    },
    {
      id: 'business-owners',
      name: 'Business Owners',
      path: '/business-owners',
      description: 'Track ownership assignments and history across all objects.',
      icon: Users2,
      maturity: 'beta',
      showInLanding: false,
    },
    // Operations - Ongoing monitoring and technical management
    {
      id: 'compliance',
      name: 'Compliance',
      path: '/compliance',
      description: 'Create, verify compliance rules, and calculate scores.',
      icon: CheckCircle,
      maturity: 'beta',
      showInLanding: true,
    },
    {
      id: 'process-workflows',
      name: 'Workflows',
      path: '/workflows',
      description: 'Configure automated workflows for validation, approval, and notifications.',
      icon: GitBranch,
      maturity: 'ga',
      showInLanding: true,
    },
    {
      id: 'estate-manager',
      name: 'Estate Manager',
      path: '/estate-manager',
      description: 'Manage multiple Databricks instances across regions and clouds.',
      icon: Globe,
      maturity: 'alpha',
      showInLanding: true,
    },
    {
      id: 'master-data',
      name: 'Master Data Management',
      path: '/master-data',
      description: 'Build a golden record of your data.',
      icon: Users,
      maturity: 'beta',
      showInLanding: true,
    },
    {
      id: 'catalog-commander',
      name: 'Catalog Commander',
      path: '/catalog-commander',
      description: 'Side-by-side catalog explorer for asset management.',
      icon: FolderKanban,
      maturity: 'ga',
      showInLanding: true,
    },
    // Security
    {
      id: 'security-features',
      name: 'Security Features',
      path: '/security',
      description: 'Enable advanced security like differential privacy.',
      icon: Lock,
      maturity: 'alpha',
      showInLanding: true,
    },
    {
      id: 'entitlements',
      name: 'Entitlements',
      path: '/entitlements',
      description: 'Manage access privileges through personas and groups.',
      icon: Shield,
      maturity: 'alpha',
      showInLanding: true,
    },
    {
      id: 'entitlements-sync',
      name: 'Entitlements Sync',
      path: '/entitlements-sync',
      description: 'Synchronize entitlements with external systems.',
      icon: RefreshCw,
      maturity: 'alpha',
      showInLanding: true,
    },
    {
      id: 'access-grants',
      name: 'Access Grants',
      path: '/access-grants',
      description: 'Request and manage time-limited access to data assets.',
      icon: Lock,
      maturity: 'ga',
      showInLanding: false,
    },
    // System - Application utilities and configuration
    {
      id: 'search',
      name: 'Search',
      path: '/search',
      description: 'Search across data products, contracts, and knowledge graph.',
      icon: Search,
      maturity: 'ga',
      showInLanding: false,
    },
    {
      id: 'audit',
      name: 'Audit Trail',
      path: '/audit',
      description: 'View and filter application audit logs.',
      icon: ScrollText,
      maturity: 'ga',
      showInLanding: false,
    },
    {
      id: 'settings',
      name: 'Settings',
      path: '/settings',
      description: 'Configure application settings, jobs, and integrations.',
      icon: Settings,
      maturity: 'ga',
      showInLanding: false,
    },
    {
      id: 'about',
      name: 'About',
      path: '/about',
      description: 'Information about the application and its features.',
      icon: Info,
      maturity: 'ga',
      showInLanding: false,
    },
  ];
  
  // Helper function to get feature by path (supports persona-prefixed paths)
  export const getFeatureByPath = (path: string): FeatureConfig | undefined => {
    // Direct match first
    const direct = features.find((f) => f.path === path);
    if (direct) return direct;
    // Strip persona prefix and try again
    const personaPrefixes = ['/consumer', '/producer', '/steward', '/governance', '/security', '/admin'];
    for (const prefix of personaPrefixes) {
      if (path.startsWith(prefix + '/') || path === prefix) {
        const stripped = path.slice(prefix.length) || '/';
        const match = features.find((f) => f.path === stripped);
        if (match) return match;
      }
    }
    return undefined;
  };
  
  // Helper function to get feature name by path (for breadcrumbs)
  export const getFeatureNameByPath = (pathSegment: string): string => {
      // Find feature where the path ends with the segment (handling potential leading '/')
      const feature = features.find(f => f.path === `/${pathSegment}` || f.path === pathSegment);
      return feature?.name || pathSegment; // Return name or segment itself if not found
  };
  
  
  // Helper function to get features for landing pages (Home, About)
  export const getLandingPageFeatures = (
      allowedMaturities: FeatureMaturity[] = ['ga'] // Default to GA only
  ): FeatureConfig[] => {
      return features.filter(
          (feature) =>
          feature.showInLanding && allowedMaturities.includes(feature.maturity)
      );
  };
  