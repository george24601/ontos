// Single source of truth for settings types

import type { DeploymentPolicy } from './deployment-policy';

export enum FeatureAccessLevel {
    NONE = "None",
    READ_ONLY = "Read-only",
    READ_WRITE = "Read/Write",
    FILTERED = "Filtered",
    FULL = "Full",
    ADMIN = "Admin",
}

export interface FeatureConfig {
    name: string;
    allowed_levels: FeatureAccessLevel[];
}

export enum HomeSection {
    REQUIRED_ACTIONS = 'REQUIRED_ACTIONS',
    DATA_CURATION = 'DATA_CURATION',
    DISCOVERY = 'DISCOVERY',
}

// --- Approval Privileges ---
export enum ApprovalEntity {
    DOMAINS = 'DOMAINS',
    CONTRACTS = 'CONTRACTS',
    PRODUCTS = 'PRODUCTS',
    BUSINESS_TERMS = 'BUSINESS_TERMS',
    ASSET_REVIEWS = 'ASSET_REVIEWS',
}

export type ApprovalPrivileges = Partial<Record<ApprovalEntity, boolean>>;

// Sentinel value for "no role required" in role request permissions
export const NO_ROLE_SENTINEL = '__NO_ROLE__';

/** Persona IDs for UI view selection (roles grant access to personas). */
export const ALL_PERSONA_IDS = [
    'data_consumer',
    'data_producer',
    'data_steward',
    'data_governance_officer',
    'security_officer',
    'administrator',
] as const;

/** Legacy persona IDs that are mapped to surviving personas. */
export const PERSONA_MIGRATION_MAP: Record<string, PersonaId> = {
    data_product_owner: 'data_producer',
    ontology_engineer: 'data_governance_officer',
    business_term_owner: 'data_steward',
};

export type PersonaId = typeof ALL_PERSONA_IDS[number];

export interface AppRole {
    id: string;
    name: string;
    description?: string | null;
    assigned_groups: string[];
    feature_permissions: Record<string, FeatureAccessLevel>;
    home_sections?: HomeSection[];
    approval_privileges?: ApprovalPrivileges;
    deployment_policy?: DeploymentPolicy | null;
    // Role hierarchy fields
    requestable_by_roles?: string[];  // Role IDs that can request this role (use '__NO_ROLE__' for users without any role)
    approver_roles?: string[];  // Role IDs that can approve access requests for this role
    /** Persona IDs that users with this role can select in the UI. */
    allowed_personas?: string[];
}

export type UserPermissions = Record<string, FeatureAccessLevel>;


// --- Search Configuration Types ---

export enum MatchType {
    PREFIX = "prefix",
    SUBSTRING = "substring",
    EXACT = "exact",
    FUZZY = "fuzzy",
}

export enum SortField {
    MATCH_PRIORITY = "match_priority",
    BOOST_SCORE = "boost_score",
    TITLE_ASC = "title_asc",
    TITLE_DESC = "title_desc",
}

export interface FieldConfig {
    indexed: boolean;
    match_type: MatchType;
    priority: number;
    boost: number;
    source?: string | null;
}

export interface DefaultFieldsConfig {
    title: FieldConfig;
    description: FieldConfig;
    tags: FieldConfig;
}

export interface DefaultsConfig {
    fields: DefaultFieldsConfig;
}

export interface AssetTypeConfig {
    enabled: boolean;
    inherit_defaults: boolean;
    fields: Record<string, FieldConfig>;
    extra_fields: Record<string, FieldConfig>;
}

export interface RankingConfig {
    primary_sort: SortField;
    secondary_sort: SortField;
    tertiary_sort: SortField;
}

export interface SearchConfig {
    version: string;
    defaults: DefaultsConfig;
    asset_types: Record<string, AssetTypeConfig>;
    ranking: RankingConfig;
}

export interface SearchConfigUpdate {
    defaults?: DefaultsConfig;
    asset_types?: Record<string, AssetTypeConfig>;
    ranking?: RankingConfig;
}