import { FeatureAccessLevel } from '@/types/settings';

export interface CopilotQuestionDef {
  key: string;
  category: string;
  contexts: string[];
  featureId: string;
  minAccess: FeatureAccessLevel;
}

export const COPILOT_CATEGORIES = [
  'explore',
  'build',
  'govern',
  'operate',
] as const;

export type CopilotCategory = (typeof COPILOT_CATEGORIES)[number];

export const COPILOT_QUESTIONS: CopilotQuestionDef[] = [
  // ── Explore & Discover ────────────────────────────────────────────

  // Global / Home – any authenticated user
  { key: 'global_find_customer_data',      category: 'explore', contexts: [],                featureId: 'search',          minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'global_business_terms_sales',    category: 'explore', contexts: [],                featureId: 'search',          minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'global_what_domains_exist',      category: 'explore', contexts: [],                featureId: 'data-domains',    minAccess: FeatureAccessLevel.READ_ONLY },

  // Marketplace
  { key: 'mp_browse_products',             category: 'explore', contexts: ['marketplace'],   featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'mp_product_cost',               category: 'explore', contexts: ['marketplace'],   featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'mp_subscribe_product',          category: 'explore', contexts: ['marketplace'],   featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_ONLY },

  // Data Catalog
  { key: 'dc_search_tables',              category: 'explore', contexts: ['data-catalog'],  featureId: 'data-catalog',    minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'dc_find_columns',               category: 'explore', contexts: ['data-catalog'],  featureId: 'data-catalog',    minAccess: FeatureAccessLevel.READ_ONLY },

  // Search
  { key: 'search_across_all',             category: 'explore', contexts: ['search'],        featureId: 'search',          minAccess: FeatureAccessLevel.READ_ONLY },

  // ── Build & Create ───────────────────────────────────────────────

  // Data Products – read-only
  { key: 'dp_list_domain',                category: 'build',   contexts: ['data-products'], featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'dp_show_contracts',             category: 'build',   contexts: ['data-products'], featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_ONLY },
  // Data Products – contributor
  { key: 'dp_draft_product',              category: 'build',   contexts: ['data-products'], featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_WRITE },
  { key: 'dp_package_tables',             category: 'build',   contexts: ['data-products'], featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_WRITE },
  { key: 'dp_add_output_port',            category: 'build',   contexts: ['data-products'], featureId: 'data-products',   minAccess: FeatureAccessLevel.READ_WRITE },

  // Data Contracts – read-only
  { key: 'ct_show_failing',               category: 'build',   contexts: ['data-contracts'], featureId: 'data-contracts', minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'ct_explain_quality',            category: 'build',   contexts: ['data-contracts'], featureId: 'data-contracts', minAccess: FeatureAccessLevel.READ_ONLY },
  // Data Contracts – contributor
  { key: 'ct_create_contract',            category: 'build',   contexts: ['data-contracts'], featureId: 'data-contracts', minAccess: FeatureAccessLevel.READ_WRITE },
  { key: 'ct_add_quality_check',          category: 'build',   contexts: ['data-contracts'], featureId: 'data-contracts', minAccess: FeatureAccessLevel.READ_WRITE },

  // Concepts / Semantic Models – read-only
  { key: 'sm_explain_concept_property',   category: 'build',   contexts: ['concepts'],      featureId: 'semantic-models', minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'sm_browse_collections',         category: 'build',   contexts: ['concepts'],      featureId: 'semantic-models', minAccess: FeatureAccessLevel.READ_ONLY },
  // Concepts – contributor
  { key: 'sm_define_vocabulary',          category: 'build',   contexts: ['concepts'],      featureId: 'semantic-models', minAccess: FeatureAccessLevel.READ_WRITE },
  { key: 'sm_suggest_concepts',           category: 'build',   contexts: ['concepts'],      featureId: 'semantic-models', minAccess: FeatureAccessLevel.READ_WRITE },

  // Assets
  { key: 'asset_find_unmapped',           category: 'build',   contexts: ['assets'],        featureId: 'assets',          minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'asset_map_columns',             category: 'build',   contexts: ['assets'],        featureId: 'assets',          minAccess: FeatureAccessLevel.READ_WRITE },
  { key: 'asset_show_lineage',            category: 'build',   contexts: ['assets'],        featureId: 'assets',          minAccess: FeatureAccessLevel.READ_ONLY },

  // ── Govern & Comply ──────────────────────────────────────────────

  // Compliance – read-only
  { key: 'comp_low_scores',               category: 'govern',  contexts: ['compliance'],    featureId: 'compliance',      minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'comp_failing_checks',           category: 'govern',  contexts: ['compliance'],    featureId: 'compliance',      minAccess: FeatureAccessLevel.READ_ONLY },
  // Compliance – contributor
  { key: 'comp_create_policy',            category: 'govern',  contexts: ['compliance'],    featureId: 'compliance',      minAccess: FeatureAccessLevel.READ_WRITE },

  // Data Domains
  { key: 'dom_list_domains',              category: 'govern',  contexts: ['data-domains'],  featureId: 'data-domains',    minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'dom_domain_health',             category: 'govern',  contexts: ['data-domains'],  featureId: 'data-domains',    minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'dom_create_domain',             category: 'govern',  contexts: ['data-domains'],  featureId: 'data-domains',    minAccess: FeatureAccessLevel.READ_WRITE },

  // Asset Reviews
  { key: 'rev_pending_reviews',           category: 'govern',  contexts: ['data-asset-reviews'], featureId: 'data-asset-reviews', minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'rev_start_review',             category: 'govern',  contexts: ['data-asset-reviews'], featureId: 'data-asset-reviews', minAccess: FeatureAccessLevel.READ_WRITE },

  // Global governance questions
  { key: 'gov_semantic_coverage',         category: 'govern',  contexts: [],                featureId: 'compliance',      minAccess: FeatureAccessLevel.READ_ONLY },
  { key: 'gov_domains_ready',             category: 'govern',  contexts: [],                featureId: 'data-domains',    minAccess: FeatureAccessLevel.READ_ONLY },

  // ── Operate & Deploy ─────────────────────────────────────────────

  // Catalog Commander
  { key: 'cc_table_columns',              category: 'operate', contexts: ['catalog-commander'], featureId: 'catalog-commander', minAccess: FeatureAccessLevel.FULL },
  { key: 'cc_table_owner',                category: 'operate', contexts: ['catalog-commander'], featureId: 'catalog-commander', minAccess: FeatureAccessLevel.FULL },
  { key: 'cc_table_usage',                category: 'operate', contexts: ['catalog-commander'], featureId: 'catalog-commander', minAccess: FeatureAccessLevel.FULL },

  // Settings – admin only
  { key: 'settings_manage_roles',         category: 'operate', contexts: ['settings'],      featureId: 'settings',        minAccess: FeatureAccessLevel.ADMIN },
  { key: 'settings_configure_jobs',       category: 'operate', contexts: ['settings'],      featureId: 'settings',        minAccess: FeatureAccessLevel.ADMIN },
];
