# Ontology-Driven Data Model Redesign

**Status:** Planning  
**Created:** 2026-02-18  
**Last Updated:** 2026-02-18  
**Branch:** `feat/ontology-driven-model` (to be created)  
**Related Issues:** Data model consolidation, Dataset business model  

---

## 1. Motivation

The current data model has grown organically and has several structural problems:

1. **38 DB model files with inconsistent patterns** -- mixed ID types (String UUIDs vs PG_UUID), polymorphic tables everywhere, no unified relationship system.
2. **Datasets are modeled technically** (physical table references, SDLC environments) rather than as a business concept in the Data Product hierarchy.
3. **The DP-to-DC link is weak** -- Output Port `contract_id` is a plain string, not a FK. Data Contract's `data_product` field is also a plain string. No referential integrity between the two most important entities.
4. **No extensible type system** -- adding a new kind of entity (e.g., a Notebook asset, an API endpoint) requires new DB tables, Pydantic models, routes, frontend types, and views.
5. **The ontology is decorative** -- `ontos-ontology.ttl` is loaded into the RDF store but doesn't drive the application model, UI, or validation.

## 2. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Model tier split | **Dedicated models** for core entities; **Asset system** for everything else | Core entities (DP, DC, Domain, Team, Project) have rich, standards-based schemas (ODPS, ODCS). Other entities can be generic. |
| Ontology role | **Fully prescriptive** -- drives asset types, relationships, field schemas, and UI rendering at runtime | Makes the model extensible without code changes. New entity types are added by editing the TTL file. |
| Data Contract placement | **Contract governs the Dataset** (`Dataset --governedBy--> DataContract`) | Clean business hierarchy: Product > Dataset > Table > Column, with contracts governing at the dataset level. |
| Composite Data Products | **Replaced** by the new asset-based model | The composite layer was a stepping stone that orchestrated existing tables. The new model makes it native. |

## 3. Target Architecture

### 3.1 Two-Tier Entity Model

```
Tier 1: Dedicated Models (own SQL tables, full FK relationships)
  Core business entities:
  - DataDomain          (data_domains)
  - DataProduct          (data_products + child tables per ODPS spec)
  - DataContract         (data_contracts + child tables per ODCS spec)
  - Team                 (teams + team_members)
  - Project              (projects + project_teams)

  Technical/system entities (dedicated due to complex relational structure):
  - CompliancePolicy     (compliance_policies + runs + results)
  - GenieSpace           (genie_spaces)
  - SemanticModel        (semantic_models)
  - BusinessRole         (business_roles -- FK target for business_owners)
  - ProcessWorkflow      (process_workflows + steps + executions)
  - MdmConfig            (mdm_configs + source_links + match_runs + candidates)

Tier 2: Asset-Backed Entities (AssetDb + AssetTypeDb, properties as JSON)
  - Dataset              (business grouping of tables)
  - PhysicalTable        (UC table, Snowflake table, etc.)
  - PhysicalView         (UC view, etc.)
  - PhysicalColumn       (column within a table or view)
  - Policy               (access, quality, retention, usage rules)
  - BusinessTerm         (glossary term promoted to a first-class asset)
  - Dashboard            (BI dashboard)
  - APIEndpoint          (data API)
  - Notebook             (analytics notebook)
  - MLModel              (machine learning model)
  - Stream               (streaming source/sink)
  - System               (external system / platform)

Infrastructure (cross-cutting, no tier classification):
  - Tags, BusinessOwners, Metadata, SemanticLinks, Comments, Costs
  - Notifications, AuditLog, ChangeLog, AccessGrants, DataAssetReviews
  - Agreements, AgreementWizardSessions, LLMSessions, MCPTokens
  - Settings, AppSettings, WorkflowConfigurations, WorkflowInstallations
  - WorkflowJobRuns, DataContractValidations, DataQualityChecks
```

### 3.2 Relationship Hierarchy

```
DataDomain
  └── DataProduct                    (belongsToDomain)
        ├── Dataset [Asset]          (hasDataset)
        │     ├── DataContract       (governedBy)
        │     ├── PhysicalTable      (hasTable)
        │     │     └── PhysicalColumn (hasColumn)
        │     └── PhysicalView       (hasView)
        │           └── PhysicalColumn (hasColumn)
        ├── Policy [Asset]           (attachedPolicy)
        └── BusinessTerm [Asset]     (hasTerm)
```

### 3.3 Ontology as Source of Truth

```
ontos-ontology.ttl
       │
       ▼
  RDF Triple Store (rdf_triples table)
       │
       ▼
  OntologySchemaService
       │
       ├──► AssetTypeDb          (seeded on startup)
       ├──► JSON Schema          (for form rendering)
       ├──► Relationship rules   (valid source/target/type combos)
       └──► UI metadata          (icons, categories, persona visibility)
       │
       ▼
  Frontend (dynamic forms, relationship editors, hierarchy navigation)
```

### 3.4 Cross-Tier Relationship Table

Replaces the current `AssetRelationshipDb` (which only links assets to assets via UUID FKs) with a universal, polymorphic relationship table:

```
entity_relationships
  ├── id                 (UUID PK)
  ├── source_type        (string: "data_product", "dataset", etc.)
  ├── source_id          (string: entity UUID)
  ├── target_type        (string)
  ├── target_id          (string)
  ├── relationship_type  (string: ontology IRI or short name)
  ├── properties         (JSON: optional metadata)
  ├── created_by         (string)
  └── created_at         (timestamp)
```

Validated at write time against the ontology: only (source_type, relationship_type, target_type) combinations that exist in the ontology are allowed.

---

## 4. Current State (What Exists Today)

### 4.1 Ontology Files

| File | Contents |
|---|---|
| `src/backend/src/data/taxonomies/ontos-ontology.ttl` | App entity classes (DataDomain, DataProduct, Team, Project, etc.), governance artifacts, semantic linking, knowledge collections, ownership model. **No Dataset, Table, Column, Policy classes.** DataProduct is incorrectly `rdfs:subClassOf DataDomain`. |
| `src/backend/src/data/taxonomies/odcs-ontology.ttl` | ODCS v3.0.2 Data Contract model (DataContract, SchemaObject, SchemaProperty, Server, QualityRule, etc.). **No cross-references to ontos ontology.** |
| `src/backend/src/data/taxonomies/databricks_ontology.ttl` | Databricks platform model (Catalog, Schema, Table, View, Column, etc.). Platform-specific, not business-oriented. |

### 4.2 Asset System

| Component | File | Status |
|---|---|---|
| DB Models | `src/backend/src/db_models/assets.py` | AssetTypeDb, AssetDb, AssetRelationshipDb |
| API Models | `src/backend/src/models/assets.py` | Pydantic CRUD models + UnifiedAssetType enum |
| Routes | `src/backend/src/routes/assets_routes.py` | `/api/asset-types`, `/api/assets`, `/api/assets/relationships` |
| Controller | `src/backend/src/controller/assets_manager.py` | AssetsManager singleton |
| Repository | `src/backend/src/repositories/assets_repository.py` | Three repositories |
| Demo Data | `src/backend/src/data/demo_data.sql` | 9 hardcoded asset types (Table, View, Column, Dashboard, etc.) |
| Frontend | `src/frontend/src/views/asset-types.tsx`, `assets.tsx` | List + delete only; Add/Edit not implemented |

### 4.3 Dataset System (To Be Replaced)

| Component | File | Status |
|---|---|---|
| DB Models | `src/backend/src/db_models/datasets.py` | DatasetDb, DatasetInstanceDb, DatasetSubscriptionDb, DatasetCustomPropertyDb |
| API Models | `src/backend/src/models/datasets.py` | Full CRUD + subscription models |
| Routes | `src/backend/src/routes/datasets_routes.py` | Full CRUD, publish, status, contract, subscriptions, instances |
| Controller | `src/backend/src/controller/datasets_manager.py` | DatasetsManager (SearchableAsset, DeliveryMixin) |
| Repository | `src/backend/src/repositories/datasets_repository.py` | Four repositories |
| Frontend Views | `src/frontend/src/views/datasets.tsx`, `dataset-details.tsx` | List + detail views |
| Frontend Types | `src/frontend/src/types/dataset.ts` | Full type definitions |

### 4.4 Composite Data Products (To Be Replaced)

| Component | File | Status |
|---|---|---|
| API Models | `src/backend/src/models/composite_data_products.py` | CompositeDataProduct, CompositeDataset, CompositeTable + create/update models |
| Routes | `src/backend/src/routes/composite_data_product_routes.py` | Orchestration API for DP > Dataset > Table creation |
| Frontend Views | `src/frontend/src/views/producer-data-product-new.tsx`, `producer-data-product-details.tsx` | Wizard + detail views |
| Frontend Types | `src/frontend/src/types/composite-data-product.ts` | Composite type definitions |

### 4.5 Existing Polymorphic Systems (Already Cross-Tier Compatible)

These systems already use `entity_type` + `entity_id` strings and will work with the new asset-backed entities without changes:

| System | Table | entity_type Examples |
|---|---|---|
| Business Owners | `business_owners` | data_product, data_contract, dataset, data_domain, policy, asset, tag |
| Tags | `entity_tag_associations` | data_product, data_contract, dataset, data_domain |
| Semantic Links | `entity_semantic_links` | data_domain, data_product, data_contract |
| Rich Text Metadata | `rich_text_metadata` | data_domain, data_product, data_contract, dataset |
| Link Metadata | `link_metadata` | (same) |
| Document Metadata | `document_metadata` | (same) |
| Metadata Attachments | `metadata_attachments` | (same) |
| Comments | `comments` | data_contract (extensible) |
| Compliance Results | `compliance_results` | any object_type |
| Policy Attachments | `policy_attachments` | domain, data_product, data_contract, asset, attribute |

---

## 5. Implementation Phases

### Phase 1: Ontology Model Update

**Goal:** Make `ontos-ontology.ttl` the authoritative, fully prescriptive model for the entire application.

**File:** `src/backend/src/data/taxonomies/ontos-ontology.ttl`

#### 1.1 Fix Existing Class Hierarchy
- [ ] Change `DataProduct` from `rdfs:subClassOf ontos:DataDomain` to `rdfs:subClassOf ontos:Entity`
- [ ] Add `ontos:modelTier` annotation to DataDomain, DataProduct, Team, Project with value `"dedicated"`

#### 1.2 Add Asset Base Class and Asset-Backed Types
- [ ] Add `ontos:Asset rdfs:subClassOf ontos:Entity` with `ontos:modelTier "asset"`
- [ ] Add `ontos:Dataset rdfs:subClassOf ontos:Asset` with UI annotations (icon: "Database", category: "data")
- [ ] Add `ontos:PhysicalTable rdfs:subClassOf ontos:Asset` (icon: "Table2", category: "data")
- [ ] Add `ontos:PhysicalView rdfs:subClassOf ontos:Asset` (icon: "Eye", category: "data")
- [ ] Add `ontos:PhysicalColumn rdfs:subClassOf ontos:Asset` (icon: "Columns2", category: "data")
- [ ] Add `ontos:Policy rdfs:subClassOf ontos:Asset` (icon: "Shield", category: "governance")
- [ ] Add `ontos:BusinessTerm rdfs:subClassOf ontos:Asset` (icon: "BookOpen", category: "governance")
- [ ] Add `ontos:Dashboard rdfs:subClassOf ontos:Asset` (icon: "LayoutDashboard", category: "analytics")
- [ ] Add `ontos:APIEndpoint rdfs:subClassOf ontos:Asset` (icon: "Globe", category: "integration")
- [ ] Add `ontos:Notebook rdfs:subClassOf ontos:Asset` (icon: "FileCode", category: "analytics")
- [ ] Add `ontos:MLModel rdfs:subClassOf ontos:Asset` (icon: "Brain", category: "analytics")
- [ ] Add `ontos:Stream rdfs:subClassOf ontos:Asset` (icon: "Activity", category: "integration")
- [ ] Add `ontos:System rdfs:subClassOf ontos:Asset` (icon: "Server", category: "system")

#### 1.3 Cross-Reference ODCS Data Contract
- [ ] Add `owl:imports` or cross-ontology reference to `odcs:DataContract`
- [ ] Add `ontos:modelTier "dedicated"` annotation on `odcs:DataContract` (or a mapping triple)

#### 1.4 Define Relationship Properties
- [ ] `ontos:hasDataset` (domain: DataProduct, range: Dataset, cardinality: 0..*)
- [ ] `ontos:governedBy` (domain: Dataset, range: odcs:DataContract, cardinality: 0..1)
- [ ] `ontos:hasTable` (domain: Dataset, range: PhysicalTable, cardinality: 0..*)
- [ ] `ontos:hasView` (domain: Dataset, range: PhysicalView, cardinality: 0..*)
- [ ] `ontos:hasColumn` (domain: PhysicalTable/PhysicalView, range: PhysicalColumn, cardinality: 0..*)
- [ ] `ontos:implementsContract` (domain: PhysicalTable, range: odcs:DataContract, cardinality: 0..1)
- [ ] `ontos:attachedPolicy` (domain: Entity, range: Policy, cardinality: 0..*)
- [ ] `ontos:hasTerm` (domain: Entity, range: BusinessTerm, cardinality: 0..*)
- [ ] `ontos:consumesFrom` (domain: Dashboard/MLModel/Notebook, range: Dataset/PhysicalTable, cardinality: 0..*)
- [ ] `ontos:producesTo` (domain: Stream/Notebook, range: PhysicalTable, cardinality: 0..*)
- [ ] `ontos:belongsToSystem` (domain: Asset, range: System, cardinality: 0..1)
- [ ] Retain and annotate existing: `belongsToDomain`, `assignedToTeam`, `hasOwner`, `containsProduct`

#### 1.5 Add UI Annotation Properties (Meta-Properties)
- [ ] Define `ontos:uiIcon` (range: xsd:string) -- Lucide icon name
- [ ] Define `ontos:uiCategory` (range: xsd:string) -- data, governance, analytics, integration, system
- [ ] Define `ontos:uiDisplayOrder` (range: xsd:integer) -- sort order within category
- [ ] Define `ontos:uiPersonaVisibility` (range: xsd:string) -- comma-separated persona IDs
- [ ] Define `ontos:uiDetailSections` (range: xsd:string) -- JSON list of section configs
- [ ] Define `ontos:modelTier` (range: xsd:string) -- "dedicated" or "asset"

#### 1.6 Add Field Schema Annotations
- [ ] Define `ontos:uiFieldType` -- text, textarea, select, multiselect, date, boolean, json
- [ ] Define `ontos:uiFieldOrder` -- integer display order
- [ ] Define `ontos:isRequired` -- boolean
- [ ] Define `ontos:uiFieldGroup` -- basic, governance, technical, etc.
- [ ] Annotate data properties on each asset class with these hints
- [ ] Example: `ontos:datasetDescription` with domain Dataset, range xsd:string, uiFieldType "textarea", uiFieldGroup "basic", isRequired false

#### 1.7 Add Relationship UI Annotations
- [ ] Define `ontos:uiLabel` on each object property (display name)
- [ ] Define `ontos:cardinality` on each object property ("0..1", "1..1", "0..*", "1..*")
- [ ] Define `ontos:uiDisplayContext` on each object property (detail-page, sidebar, tab)

**Acceptance Criteria:**
- The ontology loads without errors via rdflib
- All entity types have `modelTier`, `uiIcon`, `uiCategory` annotations
- All relationship properties have domain, range, cardinality, uiLabel
- Field-level data properties have uiFieldType, uiFieldOrder, isRequired, uiFieldGroup
- Existing ontology functionality (concept search, semantic linking) is unaffected

---

### Phase 2: OntologySchemaService (Backend)

**Goal:** Build a service that reads the ontology from the RDF store and provides entity type definitions, JSON schemas, and relationship rules to the rest of the application.

#### 2.1 OntologySchemaService
- [ ] Create `src/backend/src/controller/ontology_schema_service.py`
- [ ] `get_entity_types()` -- SPARQL query for all classes with `ontos:modelTier`, returns list of `EntityTypeDefinition` (iri, label, tier, icon, category, display_order, persona_visibility)
- [ ] `get_entity_type_schema(type_iri)` -- SPARQL query for data properties where `rdfs:domain` includes the type, extracts field name, type, required, group, order; returns JSON Schema object
- [ ] `get_valid_relationships(type_iri)` -- SPARQL query for object properties where `rdfs:domain` includes the type; returns list of `RelationshipDefinition` (property_iri, label, target_type, cardinality, display_context)
- [ ] `get_incoming_relationships(type_iri)` -- same but where type is in `rdfs:range`
- [ ] `get_hierarchy(type_iri)` -- parent/child class tree
- [ ] `sync_asset_types()` -- for each class with `modelTier == "asset"`, create or update `AssetTypeDb` entry with `required_fields`/`optional_fields` derived from the schema

#### 2.2 Pydantic Models
- [ ] Create models in `src/backend/src/models/ontology_schema.py` (or extend existing `ontology.py`):
  - `EntityTypeDefinition` (iri, label, comment, model_tier, ui_icon, ui_category, ui_display_order, persona_visibility)
  - `EntityFieldDefinition` (name, label, field_type, required, group, order, range_type)
  - `EntityTypeSchema` (type_iri, fields: list[EntityFieldDefinition])
  - `RelationshipDefinition` (property_iri, label, source_type, target_type, cardinality, display_context)

#### 2.3 API Routes
- [ ] Create `src/backend/src/routes/ontology_schema_routes.py`
- [ ] `GET /api/ontology/entity-types` -- list all entity types (filterable by tier, category, persona)
- [ ] `GET /api/ontology/entity-types/{type_iri}/schema` -- JSON Schema for the type
- [ ] `GET /api/ontology/entity-types/{type_iri}/relationships` -- outgoing + incoming relationships
- [ ] `GET /api/ontology/entity-types/{type_iri}/hierarchy` -- class hierarchy

#### 2.4 Startup Integration
- [ ] In `src/backend/src/utils/startup_tasks.py`, call `ontology_schema_service.sync_asset_types()` after `_sync_bundled_taxonomies` completes
- [ ] Remove hardcoded asset type INSERT statements from `src/backend/src/data/demo_data.sql` (or guard them behind a flag)
- [ ] Register the new routes in `src/backend/src/app.py`

**Acceptance Criteria:**
- `GET /api/ontology/entity-types` returns all types defined in the ontology with correct tier/icon/category
- `GET /api/ontology/entity-types/{iri}/schema` returns a valid JSON Schema that could drive a form
- `AssetTypeDb` entries are created/updated from the ontology on startup
- Existing semantic model/concept APIs are unaffected

---

### Phase 3: Unified Entity Relationship System

**Goal:** Replace the asset-only `AssetRelationshipDb` with a cross-tier `EntityRelationshipDb` that links any entity to any other entity, validated by the ontology.

#### 3.1 Database Model
- [ ] Create `src/backend/src/db_models/entity_relationships.py` with `EntityRelationshipDb`
  - Columns: id (PG_UUID), source_type, source_id, target_type, target_id, relationship_type, properties (JSON), created_by, created_at
  - Unique constraint on (source_type, source_id, target_type, target_id, relationship_type)
  - Indexes on (source_type, source_id), (target_type, target_id), (relationship_type)
- [ ] Register in `src/backend/src/db_models/__init__.py`

#### 3.2 Repository
- [ ] Create `src/backend/src/repositories/entity_relationships_repository.py`
  - `create(rel)`, `delete(id)`, `get(id)`
  - `get_by_source(source_type, source_id)` -- all outgoing relationships
  - `get_by_target(target_type, target_id)` -- all incoming relationships
  - `get_by_source_and_type(source_type, source_id, relationship_type)` -- filtered outgoing
  - `get_by_target_and_type(target_type, target_id, relationship_type)` -- filtered incoming
  - `find_existing(source_type, source_id, target_type, target_id, relationship_type)` -- for uniqueness check

#### 3.3 Manager
- [ ] Create `src/backend/src/controller/entity_relationships_manager.py`
  - `create_relationship(source_type, source_id, target_type, target_id, relationship_type, properties, user)` -- validates against ontology via OntologySchemaService, checks source/target exist
  - `delete_relationship(id, user)`
  - `get_relationships(source_type, source_id, relationship_type?)` -- returns with resolved target names
  - `get_incoming_relationships(target_type, target_id, relationship_type?)`
  - `get_related_entities(entity_type, entity_id)` -- all relationships (both directions)

#### 3.4 Routes
- [ ] Create `src/backend/src/routes/entity_relationship_routes.py`
  - `POST /api/entity-relationships` -- create
  - `DELETE /api/entity-relationships/{id}` -- delete
  - `GET /api/entity-relationships` -- query (source_type, source_id, target_type, target_id, relationship_type as query params)
  - `GET /api/entities/{entity_type}/{entity_id}/relationships` -- all relationships for an entity

#### 3.5 Migration
- [ ] Alembic migration to create `entity_relationships` table
- [ ] Data migration: copy rows from `asset_relationships` into `entity_relationships` (source_type="asset", target_type="asset", mapping UUIDs)
- [ ] Register routes in `src/backend/src/app.py`

**Acceptance Criteria:**
- Can create a relationship between a DataProduct (dedicated) and a Dataset (asset)
- Ontology validation rejects invalid relationship types (e.g., Column -> DataProduct with "hasDataset")
- All existing asset relationships are migrated
- API returns relationships with both directions queryable

---

### Phase 4: Dataset-to-Asset Migration

**Goal:** Migrate existing Dataset/DatasetInstance data into the Asset system and establish the business hierarchy.

#### 4.1 Verify Asset Types Exist
- [ ] Confirm Phase 2 has seeded: Dataset, PhysicalTable, PhysicalView, PhysicalColumn asset types

#### 4.2 Data Migration Script
- [ ] Create Alembic migration that:
  - For each `DatasetDb` row: create an `AssetDb` row with asset_type = "Dataset", properties JSON from relevant fields
  - For each `DatasetInstanceDb` row: create an `AssetDb` row with asset_type = "PhysicalTable" or "PhysicalView" (based on `asset_type` field), location = `physical_path`, properties from environment/role/status/notes
  - Create `EntityRelationshipDb` rows:
    - Dataset asset -> PhysicalTable/View asset (`hasTable`/`hasView`)
    - Dataset asset -> DataContract (`governedBy`) where `DatasetDb.contract_id` was set
  - Migrate `DatasetSubscriptionDb` rows (see 4.3)
  - Migrate `DatasetCustomPropertyDb` into `AssetDb.properties` JSON

#### 4.3 Generic Subscription System
- [ ] **Decision:** Either add an `EntitySubscriptionDb` table (polymorphic: entity_type, entity_id, subscriber_email) or add subscription support directly to AssetDb
- [ ] Migrate `DatasetSubscriptionDb` and `DataProductSubscriptionDb` into the new system
- [ ] Update subscription APIs to work with the unified system

#### 4.4 Update Assets Manager
- [ ] Update `src/backend/src/controller/assets_manager.py` to handle Dataset-specific business logic if needed (or keep generic and let the ontology schema drive it)
- [ ] Ensure Asset CRUD properly validates properties against ontology-derived JSON Schema

#### 4.5 Update Frontend Asset Views
- [ ] `src/frontend/src/views/assets.tsx` -- support filtering by asset type, render forms dynamically
- [ ] Build or update asset detail view with relationship panel and child hierarchy

**Acceptance Criteria:**
- All existing Dataset and DatasetInstance records are represented as Assets
- Relationships (Dataset->Tables, Dataset->Contract) exist in `entity_relationships`
- Subscriptions are preserved and functional
- Old dataset API can still return data (read-only, deprecated) during transition

---

### Phase 5: Data Product Linkage Update

**Goal:** Connect Data Products to the new Dataset assets via `EntityRelationshipDb`, establishing the DP > Dataset > Table > Column hierarchy.

#### 5.1 Create DP-to-Dataset Relationships
- [ ] For existing Data Products with Output Ports that have `contract_id`:
  - Find Dataset assets that have `governedBy` relationship to that contract
  - Create `EntityRelationshipDb` rows: DataProduct -> Dataset (`hasDataset`)
- [ ] Update Data Product creation flow to create `hasDataset` relationships instead of (or in addition to) Output Ports

#### 5.2 Update DataProductsManager
- [ ] Add method `get_product_datasets(product_id)` that queries `EntityRelationshipDb` for `hasDataset` relationships
- [ ] Add method `get_product_hierarchy(product_id)` that resolves full DP > Dataset > Table > Column tree
- [ ] Update `get_data_product(id)` to include dataset count and summary

#### 5.3 Resolve Output Port Future
- [ ] **Keep OutputPort** as ODPS metadata but de-emphasize in UI
- [ ] OutputPort's `contract_id` becomes secondary to the direct DP -> Dataset -> Contract path
- [ ] Document the mapping: OutputPort is the ODPS-spec representation; EntityRelationship is the business representation

#### 5.4 API Updates
- [ ] `GET /api/data-products/{id}/datasets` -- returns Dataset assets linked via `hasDataset`
- [ ] `GET /api/data-products/{id}/hierarchy` -- returns full DP > Dataset > Table > Column tree
- [ ] `POST /api/data-products/{id}/datasets` -- creates a Dataset asset and `hasDataset` relationship

**Acceptance Criteria:**
- Data Product detail API returns linked Datasets
- Full hierarchy traversal works: DP -> Datasets -> Tables -> Columns
- Existing ODPS port model is preserved for spec compliance

---

### Phase 6: Frontend -- Ontology-Driven UI

**Goal:** Build frontend components that render forms, relationships, and hierarchies dynamically from the ontology schema API.

#### 6.1 New Types
- [ ] Create `src/frontend/src/types/ontology-schema.ts`:
  - `EntityTypeDefinition` (iri, label, comment, modelTier, uiIcon, uiCategory, uiDisplayOrder, personaVisibility)
  - `EntityFieldDefinition` (name, label, fieldType, required, group, order)
  - `EntityTypeSchema` (typeIri, fields)
  - `RelationshipDefinition` (propertyIri, label, sourceType, targetType, cardinality, displayContext)

#### 6.2 Entity Type Form Renderer
- [ ] Create `src/frontend/src/components/common/entity-type-form-renderer.tsx`
  - Props: `typeIri`, `initialValues?`, `onSubmit`, `mode: "create" | "edit"`
  - Fetches schema from `/api/ontology/entity-types/{typeIri}/schema`
  - Dynamically generates react-hook-form fields grouped by `uiFieldGroup`
  - Uses appropriate Shadcn components based on `uiFieldType`
  - Validates with Zod schema generated from the field definitions

#### 6.3 Entity Relationship Panel
- [ ] Create `src/frontend/src/components/common/entity-relationship-panel.tsx`
  - Props: `entityType`, `entityId`
  - Fetches valid relationships from `/api/ontology/entity-types/{type}/relationships`
  - Fetches existing relationships from `/api/entities/{type}/{id}/relationships`
  - Shows grouped by relationship type with add/remove controls
  - Search/select dialog for choosing related entities

#### 6.4 Entity Hierarchy Browser
- [ ] Create `src/frontend/src/components/common/entity-hierarchy-browser.tsx`
  - Props: `rootEntityType`, `rootEntityId`
  - Renders a tree view: DP > Dataset > Table > Column
  - Expand/collapse, click to navigate to detail
  - Shows summary info (status, owner) at each level

#### 6.5 Update Data Product Detail View
- [ ] `src/frontend/src/views/data-product-details.tsx`:
  - Replace "Output Ports" section with "Datasets" tab showing asset-based Datasets
  - Add hierarchy browser component
  - Each Dataset row links to the asset detail view

#### 6.6 Asset Detail View Enhancement
- [ ] `src/frontend/src/views/assets.tsx` or new `asset-detail.tsx`:
  - Dynamic form based on asset type schema
  - Relationship panel showing related entities
  - For Datasets: show child Tables, governing Contract
  - For Tables: show child Columns, parent Dataset

#### 6.7 Persona Navigation Updates
- [ ] `src/frontend/src/config/persona-nav.ts`:
  - Ontology `uiPersonaVisibility` drives which asset types appear in each persona's nav
  - Technical assets (Table, Column, View) visible to Producer, Steward
  - Business assets (Dataset, Policy, BusinessTerm) visible to all

#### 6.8 Deprecate Old Views
- [ ] Remove or redirect `src/frontend/src/views/datasets.tsx`
- [ ] Remove or redirect `src/frontend/src/views/dataset-details.tsx`
- [ ] Remove `src/frontend/src/views/producer-data-product-new.tsx`
- [ ] Remove `src/frontend/src/views/producer-data-product-details.tsx`
- [ ] Update `src/frontend/src/app.tsx` routes

**Acceptance Criteria:**
- Creating a new Dataset renders a dynamic form based on ontology schema
- Relationship panel shows valid relationships and allows adding/removing
- DP detail page shows linked Datasets with hierarchy navigation
- Persona visibility works correctly per ontology annotations
- Old Dataset/Composite views are removed or redirected

---

### Phase 7: Deprecation and Cleanup

**Goal:** Remove superseded code and data structures.

#### 7.1 Backend Cleanup
- [ ] Mark `DatasetDb`, `DatasetInstanceDb`, `DatasetSubscriptionDb`, `DatasetCustomPropertyDb` tables as deprecated (drop in a future migration after verification)
- [ ] Mark `AssetRelationshipDb` as deprecated (replaced by `EntityRelationshipDb`)
- [ ] Remove or archive `src/backend/src/routes/composite_data_product_routes.py`
- [ ] Remove or archive `src/backend/src/models/composite_data_products.py`
- [ ] Remove hardcoded asset type INSERTs from `src/backend/src/data/demo_data.sql`
- [ ] Update `src/backend/src/routes/datasets_routes.py` to return 301 redirects to asset equivalents (or remove entirely)

#### 7.2 Frontend Cleanup
- [ ] Remove `src/frontend/src/types/dataset.ts`
- [ ] Remove `src/frontend/src/types/composite-data-product.ts`
- [ ] Remove `src/frontend/src/components/data-products/composite-dataset-card.tsx`
- [ ] Remove `src/frontend/src/components/data-products/data-product-wizard.tsx`
- [ ] Remove `src/frontend/src/components/data-products/uc-table-browser.tsx`
- [ ] Clean up unused imports and dead code

#### 7.3 Documentation Updates
- [ ] Update `CLAUDE.md` with the new architecture
- [ ] Update `src/docs/USER-GUIDE.md` with new entity model description
- [ ] Update `.cursor/rules/` files to reflect the new patterns

**Acceptance Criteria:**
- No references to deprecated Dataset tables in active code paths
- No references to composite data product code in active code paths
- Application starts cleanly, all tests pass
- Documentation reflects the new architecture

---

## 6. Files Inventory

### New Files

| File | Phase | Purpose |
|---|---|---|
| `src/backend/src/controller/ontology_schema_service.py` | 2 | Reads ontology, provides schemas and relationship rules |
| `src/backend/src/routes/ontology_schema_routes.py` | 2 | API endpoints for entity types, schemas, relationships |
| `src/backend/src/models/ontology_schema.py` | 2 | Pydantic models for schema API responses |
| `src/backend/src/db_models/entity_relationships.py` | 3 | EntityRelationshipDb table |
| `src/backend/src/repositories/entity_relationships_repository.py` | 3 | Repository for entity relationships |
| `src/backend/src/controller/entity_relationships_manager.py` | 3 | Manager with ontology validation |
| `src/backend/src/routes/entity_relationship_routes.py` | 3 | CRUD API for entity relationships |
| `src/frontend/src/types/ontology-schema.ts` | 6 | TypeScript types for ontology schema API |
| `src/frontend/src/components/common/entity-type-form-renderer.tsx` | 6 | Dynamic form from ontology schema |
| `src/frontend/src/components/common/entity-relationship-panel.tsx` | 6 | Relationship display and editing |
| `src/frontend/src/components/common/entity-hierarchy-browser.tsx` | 6 | Tree view for entity hierarchies |

### Modified Files

| File | Phase | Change |
|---|---|---|
| `src/backend/src/data/taxonomies/ontos-ontology.ttl` | 1 | Major update with asset classes, relationships, annotations |
| `src/backend/src/utils/startup_tasks.py` | 2 | Add ontology sync on startup |
| `src/backend/src/app.py` | 2, 3 | Register new routes |
| `src/backend/src/db_models/__init__.py` | 3 | Register entity_relationships |
| `src/backend/src/controller/assets_manager.py` | 4 | Schema validation from ontology |
| `src/backend/src/controller/data_products_manager.py` | 5 | Dataset relationship resolution |
| `src/frontend/src/views/data-product-details.tsx` | 6 | Replace ports with datasets |
| `src/frontend/src/views/assets.tsx` | 6 | Dynamic forms, relationship panel |
| `src/frontend/src/config/persona-nav.ts` | 6 | Ontology-driven persona visibility |
| `src/frontend/src/app.tsx` | 6 | Route updates |

### Deprecated/Removed Files

| File | Phase | Action |
|---|---|---|
| `src/backend/src/routes/composite_data_product_routes.py` | 7 | Remove |
| `src/backend/src/models/composite_data_products.py` | 7 | Remove |
| `src/frontend/src/views/datasets.tsx` | 7 | Remove |
| `src/frontend/src/views/dataset-details.tsx` | 7 | Remove |
| `src/frontend/src/views/producer-data-product-new.tsx` | 7 | Remove |
| `src/frontend/src/views/producer-data-product-details.tsx` | 7 | Remove |
| `src/frontend/src/types/dataset.ts` | 7 | Remove |
| `src/frontend/src/types/composite-data-product.ts` | 7 | Remove |
| `src/frontend/src/components/data-products/composite-dataset-card.tsx` | 7 | Remove |
| `src/frontend/src/components/data-products/data-product-wizard.tsx` | 7 | Remove |
| `src/frontend/src/components/data-products/uc-table-browser.tsx` | 7 | Remove |

---

## 7. Risks and Open Questions

### Risks

| Risk | Mitigation |
|---|---|
| SPARQL query performance for schema extraction on every API call | Cache entity type definitions in memory; invalidate on ontology reload |
| JSON Schema from ontology may be less expressive than hand-coded Pydantic models | Allow type-specific schema overrides via `ontos:customSchemaOverride` annotation |
| Data migration may lose Dataset-specific metadata | Thorough mapping of all DatasetDb fields to Asset properties; reversible migration |
| Frontend dynamic form rendering may be less polished than hand-coded forms | Allow per-type component overrides for dedicated models; generic forms for assets |
| Existing integrations (search, compliance, notifications) reference "dataset" entity_type | Ensure entity_type strings are consistent; map old values to new during transition |

### Open Questions

1. **Policy migration depth:** Current `PolicyDb` has rich fields (policy_type, enforcement_level, content, version, metadata JSON). Do we move all of this into Asset properties JSON, or keep Policy as a dedicated model?
2. **Subscription system:** Generic `EntitySubscriptionDb` vs per-type subscription tables? The generic approach is cleaner but may need type-specific notification templates.
3. **ODPS port model retention:** How much of the Input/Output Port model do we keep? Just the DB tables for spec export, or actively maintained?
4. **Column discovery:** Should PhysicalColumn assets be auto-discovered from Unity Catalog metadata, or manually created?
5. **Backward-compatible API:** How long do we maintain the old `/api/datasets` endpoints?

---

## 8. Progress Tracking

### Phase Status

| Phase | Status | Started | Completed | Notes |
|---|---|---|---|---|
| 1. Ontology Model Update | Not Started | | | |
| 2. OntologySchemaService | Not Started | | | |
| 3. Entity Relationship System | Not Started | | | |
| 4. Dataset-to-Asset Migration | Not Started | | | |
| 5. Data Product Linkage | Not Started | | | |
| 6. Frontend UI | Not Started | | | |
| 7. Deprecation & Cleanup | Not Started | | | |
