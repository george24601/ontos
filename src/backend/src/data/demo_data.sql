-- ============================================================================
-- Demo Data SQL Script
-- ============================================================================
-- This file contains all demo/example data for the application.
-- Load via the /api/settings/demo-data/load endpoint (Admin only).
--
-- Data is inserted in FK-safe order:
-- 1. Data Domains (hierarchical, parents first)
-- 2. Teams and Team Members
-- 3. Projects and Project-Team associations
-- 4. Data Contracts and child tables
-- 5. Data Products and child tables
-- 6. Data Asset Reviews
-- 7. Notifications
-- 8. Compliance Policies and Runs
-- 9. Cost Items
-- 10. Semantic Links
-- 11. Metadata (notes, links, documents)
--
-- UUID Format: {type:3}{seq:5}-0000-4000-8000-000000000001
-- All type codes are valid hex (0-9, a-f).
--
-- Type Codes:
--   000 = data_domains
--   001 = teams
--   002 = team_members
--   003 = projects
--   004 = data_contracts
--   005 = schema_objects
--   006 = schema_properties
--   007 = data_products
--   008 = data_product_descriptions
--   009 = output_ports
--   00a = input_ports
--   00b = support_channels
--   00c = data_product_teams
--   00d = data_product_team_members
--   00e = reviews (data_asset_review_requests)
--   00f = reviewed_assets
--   010 = notifications
--   011 = compliance_policies
--   012 = compliance_runs
--   013 = compliance_results
--   014 = cost_items
--   015 = semantic_links
--   016 = rich_text_metadata
--   017 = link_metadata
--   018 = document_metadata
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DATA DOMAINS (type=000)
-- ============================================================================
-- Hierarchical: Core first, then children

INSERT INTO data_domains (id, name, description, parent_id, created_by, created_at, updated_at) VALUES
-- Root domain
('00000001-0000-4000-8000-000000000001', 'Core', 'General, cross-company business concepts.', NULL, 'system@demo', NOW(), NOW()),

-- Level 1 children of Core
('00000002-0000-4000-8000-000000000002', 'Finance', 'Financial accounting, reporting, and metrics.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000003-0000-4000-8000-000000000003', 'Sales', 'Sales processes, opportunities, leads, and performance.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000004-0000-4000-8000-000000000004', 'Marketing', 'Customer acquisition, campaigns, engagement, and branding.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000005-0000-4000-8000-000000000005', 'Retail', 'All data related to retail business line, including operations and analytics.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000006-0000-4000-8000-000000000006', 'Supply Chain', 'Logistics, inventory management, reordering, and supplier relations.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000007-0000-4000-8000-000000000007', 'Customer', 'Direct customer information, profiles, segmentation, and interactions.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000008-0000-4000-8000-000000000008', 'Product', 'Product catalog, features, lifecycle, and development.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('00000009-0000-4000-8000-000000000009', 'Human Resources', 'Human resources, employee data, payroll, and recruitment.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('0000000a-0000-4000-8000-000000000010', 'IoT', 'Data from Internet of Things devices, sensors, and telemetry.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),
('0000000b-0000-4000-8000-000000000011', 'Compliance', 'Data related to legal, regulatory, and internal compliance requirements.', '00000001-0000-4000-8000-000000000001', 'system@demo', NOW(), NOW()),

-- Level 2 children of Retail
('0000000c-0000-4000-8000-000000000012', 'Retail Operations', 'Store operations, point-of-sale (POS), inventory, and logistics.', '00000005-0000-4000-8000-000000000005', 'system@demo', NOW(), NOW()),
('0000000d-0000-4000-8000-000000000013', 'Retail Analytics', 'Analytics derived from retail operations data, including sales, demand, pricing.', '00000005-0000-4000-8000-000000000005', 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. TEAMS (type=001)
-- ============================================================================

INSERT INTO teams (id, name, title, description, domain_id, extra_metadata, created_by, updated_by, created_at, updated_at) VALUES
('00100001-0000-4000-8000-000000000001', 'data-engineering', 'Data Engineering Team', 'Responsible for data pipeline development and infrastructure', '00000001-0000-4000-8000-000000000001', '{"slack_channel": "https://company.slack.com/channels/data-eng", "lead": "john.doe@company.com"}', 'system@demo', 'system@demo', NOW(), NOW()),
('00100002-0000-4000-8000-000000000002', 'analytics-team', 'Analytics Team', 'Business analytics and reporting team', '0000000d-0000-4000-8000-000000000013', '{"slack_channel": "https://company.slack.com/channels/analytics", "tools": ["Tableau", "Power BI", "SQL"]}', 'system@demo', 'system@demo', NOW(), NOW()),
('00100003-0000-4000-8000-000000000003', 'data-science', 'Data Science Team', 'Machine learning and advanced analytics', '00000008-0000-4000-8000-000000000008', '{"slack_channel": "https://company.slack.com/channels/data-science", "research_areas": ["NLP", "Computer Vision", "Recommendation Systems"]}', 'system@demo', 'system@demo', NOW(), NOW()),
('00100004-0000-4000-8000-000000000004', 'governance-team', 'Data Governance Team', 'Data quality, compliance, and governance oversight', '0000000b-0000-4000-8000-000000000011', '{"slack_channel": "https://company.slack.com/channels/data-governance", "responsibilities": ["Data Quality", "Privacy Compliance", "Access Control"]}', 'system@demo', 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2b. TEAM MEMBERS (type=002)
-- ============================================================================

INSERT INTO team_members (id, team_id, member_type, member_identifier, app_role_override, added_by, created_at, updated_at) VALUES
-- Data Engineering Team
('00200001-0000-4000-8000-000000000001', '00100001-0000-4000-8000-000000000001', 'user', 'john.doe@company.com', 'Data Producer', 'system@demo', NOW(), NOW()),
('00200002-0000-4000-8000-000000000002', '00100001-0000-4000-8000-000000000001', 'group', 'data-engineers', NULL, 'system@demo', NOW(), NOW()),
('00200003-0000-4000-8000-000000000003', '00100001-0000-4000-8000-000000000001', 'user', 'jane.smith@company.com', 'Data Producer', 'system@demo', NOW(), NOW()),

-- Analytics Team
('00200004-0000-4000-8000-000000000004', '00100002-0000-4000-8000-000000000002', 'user', 'alice.johnson@company.com', 'Data Consumer', 'system@demo', NOW(), NOW()),
('00200005-0000-4000-8000-000000000005', '00100002-0000-4000-8000-000000000002', 'group', 'analysts', NULL, 'system@demo', NOW(), NOW()),

-- Data Science Team
('00200006-0000-4000-8000-000000000006', '00100003-0000-4000-8000-000000000003', 'user', 'bob.wilson@company.com', 'Data Producer', 'system@demo', NOW(), NOW()),
('00200007-0000-4000-8000-000000000007', '00100003-0000-4000-8000-000000000003', 'group', 'data-scientists', NULL, 'system@demo', NOW(), NOW()),
('00200008-0000-4000-8000-000000000008', '00100003-0000-4000-8000-000000000003', 'user', 'carol.brown@company.com', 'Data Producer', 'system@demo', NOW(), NOW()),

-- Governance Team
('00200009-0000-4000-8000-000000000009', '00100004-0000-4000-8000-000000000004', 'user', 'david.garcia@company.com', 'Data Steward', 'system@demo', NOW(), NOW()),
('0020000a-0000-4000-8000-000000000010', '00100004-0000-4000-8000-000000000004', 'group', 'data-stewards', NULL, 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 3. PROJECTS (type=003)
-- ============================================================================

INSERT INTO projects (id, name, title, description, project_type, owner_team_id, extra_metadata, created_by, updated_by, created_at, updated_at) VALUES
('00300001-0000-4000-8000-000000000001', 'customer-360', 'Customer 360 Initiative', 'Comprehensive customer data platform and analytics', 'TEAM', '00100002-0000-4000-8000-000000000002', '{"budget": "$500K", "timeline": "6 months", "stakeholders": ["Marketing", "Sales", "Customer Success"], "priority": "high"}', 'system@demo', 'system@demo', NOW(), NOW()),
('00300002-0000-4000-8000-000000000002', 'financial-reporting', 'Financial Reporting Modernization', 'Modernize financial reporting infrastructure and processes', 'TEAM', '00100004-0000-4000-8000-000000000004', '{"budget": "$300K", "timeline": "4 months", "compliance_requirements": ["SOX", "GAAP"], "priority": "high"}', 'system@demo', 'system@demo', NOW(), NOW()),
('00300003-0000-4000-8000-000000000003', 'ml-platform', 'Machine Learning Platform', 'Build and deploy ML infrastructure and services', 'TEAM', '00100003-0000-4000-8000-000000000003', '{"budget": "$750K", "timeline": "8 months", "technologies": ["MLflow", "Kubernetes", "TensorFlow"], "priority": "medium"}', 'system@demo', 'system@demo', NOW(), NOW()),
('00300004-0000-4000-8000-000000000004', 'data-governance-pilot', 'Data Governance Pilot Program', 'Pilot program for implementing data governance best practices', 'TEAM', '00100004-0000-4000-8000-000000000004', '{"budget": "$200K", "timeline": "3 months", "scope": ["Data Quality", "Data Lineage", "Access Control"], "priority": "medium"}', 'system@demo', 'system@demo', NOW(), NOW()),
('00300005-0000-4000-8000-000000000005', 'real-time-analytics', 'Real-time Analytics Platform', 'Build real-time streaming analytics capabilities', 'TEAM', '00100001-0000-4000-8000-000000000001', '{"budget": "$400K", "timeline": "5 months", "technologies": ["Kafka", "Spark Streaming", "Delta Lake"], "priority": "low"}', 'system@demo', 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 3b. PROJECT-TEAM ASSOCIATIONS
-- ============================================================================

INSERT INTO project_teams (project_id, team_id, assigned_by, assigned_at) VALUES
-- Customer 360: data-engineering, analytics-team, data-science
('00300001-0000-4000-8000-000000000001', '00100001-0000-4000-8000-000000000001', 'system@demo', NOW()),
('00300001-0000-4000-8000-000000000001', '00100002-0000-4000-8000-000000000002', 'system@demo', NOW()),
('00300001-0000-4000-8000-000000000001', '00100003-0000-4000-8000-000000000003', 'system@demo', NOW()),

-- Financial Reporting: data-engineering, analytics-team, governance-team
('00300002-0000-4000-8000-000000000002', '00100001-0000-4000-8000-000000000001', 'system@demo', NOW()),
('00300002-0000-4000-8000-000000000002', '00100002-0000-4000-8000-000000000002', 'system@demo', NOW()),
('00300002-0000-4000-8000-000000000002', '00100004-0000-4000-8000-000000000004', 'system@demo', NOW()),

-- ML Platform: data-engineering, data-science
('00300003-0000-4000-8000-000000000003', '00100001-0000-4000-8000-000000000001', 'system@demo', NOW()),
('00300003-0000-4000-8000-000000000003', '00100003-0000-4000-8000-000000000003', 'system@demo', NOW()),

-- Data Governance Pilot: governance-team, data-engineering
('00300004-0000-4000-8000-000000000004', '00100004-0000-4000-8000-000000000004', 'system@demo', NOW()),
('00300004-0000-4000-8000-000000000004', '00100001-0000-4000-8000-000000000001', 'system@demo', NOW()),

-- Real-time Analytics: data-engineering, analytics-team
('00300005-0000-4000-8000-000000000005', '00100001-0000-4000-8000-000000000001', 'system@demo', NOW()),
('00300005-0000-4000-8000-000000000005', '00100002-0000-4000-8000-000000000002', 'system@demo', NOW())

ON CONFLICT (project_id, team_id) DO NOTHING;


-- ============================================================================
-- 4. DATA CONTRACTS (type=004)
-- ============================================================================

INSERT INTO data_contracts (id, name, kind, api_version, version, status, published, owner_team_id, domain_id, description_purpose, description_usage, description_limitations, created_by, updated_by, created_at, updated_at) VALUES
-- Customer Data Contract
('00400001-0000-4000-8000-000000000001', 'Customer Data Contract', 'DataContract', 'v3.0.2', '1.0.0', 'active', true, '00100001-0000-4000-8000-000000000001', '00000007-0000-4000-8000-000000000007', 'Core customer data contract defining customer profile, preferences, and transaction history', 'Customer master data to power user-facing apps, analytics, and marketing campaigns', 'Emails must be validated; PII must be encrypted at rest; data retention 7 years max', 'system@demo', 'system@demo', NOW(), NOW()),

-- Product Catalog Contract
('00400002-0000-4000-8000-000000000002', 'Product Catalog Contract', 'DataContract', 'v3.0.2', '1.0.0', 'deprecated', false, '00100002-0000-4000-8000-000000000002', '00000008-0000-4000-8000-000000000008', 'Complete product catalog with categories, inventory, pricing, and vendor information', 'Power e-commerce platform, merchandising experiences, and inventory management', 'Price values must be non-negative; SKUs must be unique; inventory counts must be integers', 'system@demo', 'system@demo', NOW(), NOW()),

-- Data Sharing Agreement
('00400003-0000-4000-8000-000000000003', 'Data Sharing Agreement', 'DataContract', 'v3.0.2', '2.0.0', 'active', true, '00100004-0000-4000-8000-000000000004', '0000000b-0000-4000-8000-000000000011', 'Legal agreement for data sharing between Analytics and Marketing', 'Enables sharing of aggregated analytics for campaign optimization', 'No external sharing; PII must be masked; delete after 90 days', 'system@demo', 'system@demo', NOW(), NOW()),

-- IoT Device Data Contract
('00400004-0000-4000-8000-000000000004', 'IoT Device Data Contract', 'DataContract', 'v3.0.2', '1.1.0', 'active', true, '00100003-0000-4000-8000-000000000003', '0000000a-0000-4000-8000-000000000010', 'Comprehensive IoT device management and telemetry data for smart building systems', 'Monitor device health, performance, and environmental data in near real-time for predictive maintenance and energy optimization', 'Timestamps must be UTC; numeric telemetry must be within calibrated device ranges; data retention 2 years max', 'system@demo', 'system@demo', NOW(), NOW()),

-- IoT Sensor Data Contract (retired)
('00400005-0000-4000-8000-000000000005', 'IoT Sensor Data Contract', 'DataContract', 'v3.0.2', '2.0.0', 'retired', false, '00100003-0000-4000-8000-000000000003', '0000000a-0000-4000-8000-000000000010', 'Real-time IoT sensor data from manufacturing floor', 'Stream analytics and anomaly detection', 'Primary key is (sensor_id, timestamp)', 'system@demo', 'system@demo', NOW(), NOW()),

-- Financial Transactions Contract
('00400006-0000-4000-8000-000000000006', 'Financial Transactions Contract', 'DataContract', 'v3.0.2', '1.0.0', 'draft', false, '00100004-0000-4000-8000-000000000004', '00000002-0000-4000-8000-000000000002', 'Daily financial transaction data', 'Reconciliation, accounting, and reporting', 'Amount must be >= 0; currency must be ISO-4217', 'system@demo', 'system@demo', NOW(), NOW()),

-- Inventory Management Contract
('00400007-0000-4000-8000-000000000007', 'Inventory Management Contract', 'DataContract', 'v3.0.2', '1.2.0', 'deprecated', false, '00100002-0000-4000-8000-000000000002', '00000006-0000-4000-8000-000000000006', 'Real-time inventory levels and movements', 'Track stock levels across warehouses', 'Quantity must be integer >= 0', 'system@demo', 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 4b. DATA CONTRACT SCHEMA OBJECTS (type=005)
-- ============================================================================

INSERT INTO data_contract_schema_objects (id, contract_id, name, logical_type, physical_name, description) VALUES
-- Customer Data Contract schemas
('00500001-0000-4000-8000-000000000001', '00400001-0000-4000-8000-000000000001', 'customers', 'object', 'crm.customers_v2', 'Core customer master table'),
('00500002-0000-4000-8000-000000000002', '00400001-0000-4000-8000-000000000001', 'customer_preferences', 'object', 'crm.customer_preferences', 'Customer preference settings'),
('00500003-0000-4000-8000-000000000003', '00400001-0000-4000-8000-000000000001', 'customer_addresses', 'object', 'crm.customer_addresses', 'Customer address information'),

-- IoT Device Data Contract schemas
('00500004-0000-4000-8000-000000000004', '00400004-0000-4000-8000-000000000004', 'devices', 'object', 'iot.devices_master', 'IoT device registry'),
('00500005-0000-4000-8000-000000000005', '00400004-0000-4000-8000-000000000004', 'device_telemetry', 'object', 'iot.device_telemetry_live', 'Device telemetry readings'),
('00500006-0000-4000-8000-000000000006', '00400004-0000-4000-8000-000000000004', 'device_events', 'object', 'iot.device_events_log', 'Device events and alerts')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 4c. DATA CONTRACT SCHEMA PROPERTIES (type=006)
-- ============================================================================

INSERT INTO data_contract_schema_properties (id, object_id, name, logical_type, required, "unique", primary_key, partitioned, primary_key_position, partition_key_position, critical_data_element, transform_description) VALUES
-- customers table properties
('00600001-0000-4000-8000-000000000001', '00500001-0000-4000-8000-000000000001', 'customer_id', 'string', true, true, true, false, 1, -1, true, 'Unique customer identifier (UUID format)'),
('00600002-0000-4000-8000-000000000002', '00500001-0000-4000-8000-000000000001', 'email', 'string', true, true, false, false, -1, -1, true, 'Customer email address (primary contact)'),
('00600003-0000-4000-8000-000000000003', '00500001-0000-4000-8000-000000000001', 'first_name', 'string', true, false, false, false, -1, -1, false, 'Customer first name'),
('00600004-0000-4000-8000-000000000004', '00500001-0000-4000-8000-000000000001', 'last_name', 'string', true, false, false, false, -1, -1, false, 'Customer last name'),
('00600005-0000-4000-8000-000000000005', '00500001-0000-4000-8000-000000000001', 'date_of_birth', 'date', false, false, false, false, -1, -1, false, 'Customer date of birth (YYYY-MM-DD)'),
('00600006-0000-4000-8000-000000000006', '00500001-0000-4000-8000-000000000001', 'phone_number', 'string', false, false, false, false, -1, -1, false, 'Primary phone number (E.164 format)'),
('00600007-0000-4000-8000-000000000007', '00500001-0000-4000-8000-000000000001', 'country_code', 'string', true, false, false, false, -1, -1, false, 'ISO 3166-1 alpha-2 country code'),
('00600008-0000-4000-8000-000000000008', '00500001-0000-4000-8000-000000000001', 'registration_date', 'timestamp', true, false, false, false, -1, -1, false, 'Account registration timestamp (UTC)'),
('00600009-0000-4000-8000-000000000009', '00500001-0000-4000-8000-000000000001', 'account_status', 'string', true, false, false, false, -1, -1, false, 'Account status (active, suspended, closed, pending_verification)'),
('0060000a-0000-4000-8000-000000000010', '00500001-0000-4000-8000-000000000001', 'email_verified', 'boolean', true, false, false, false, -1, -1, false, 'Whether email address has been verified'),

-- devices table properties
('0060000b-0000-4000-8000-000000000011', '00500004-0000-4000-8000-000000000004', 'device_id', 'string', true, true, true, false, 1, -1, true, 'Unique device identifier (UUID format)'),
('0060000c-0000-4000-8000-000000000012', '00500004-0000-4000-8000-000000000004', 'device_serial', 'string', true, true, false, false, -1, -1, false, 'Manufacturer serial number'),
('0060000d-0000-4000-8000-000000000013', '00500004-0000-4000-8000-000000000004', 'device_type', 'string', true, false, false, false, -1, -1, false, 'Device type (sensor, actuator, gateway, controller)'),
('0060000e-0000-4000-8000-000000000014', '00500004-0000-4000-8000-000000000004', 'status', 'string', true, false, false, false, -1, -1, false, 'Device status (active, inactive, maintenance, faulty, decommissioned)'),
('0060000f-0000-4000-8000-000000000015', '00500004-0000-4000-8000-000000000004', 'is_online', 'boolean', true, false, false, false, -1, -1, false, 'Current connectivity status')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5. DATA PRODUCTS (type=007)
-- ============================================================================

INSERT INTO data_products (id, api_version, kind, status, name, version, domain, tenant, owner_team_id, max_level_inheritance, created_at, updated_at) VALUES
('00700001-0000-4000-8000-000000000001', 'v1.0.0', 'DataProduct', 'active', 'POS Transaction Stream v1', '1.0.0', 'Retail Operations', 'retail-demo', '00100001-0000-4000-8000-000000000001', 99, NOW(), NOW()),
('00700002-0000-4000-8000-000000000002', 'v1.0.0', 'DataProduct', 'active', 'Prepared Sales Transactions v1', '1.0.0', 'Retail Analytics', 'retail-demo', '00100001-0000-4000-8000-000000000001', 99, NOW(), NOW()),
('00700003-0000-4000-8000-000000000003', 'v1.0.0', 'DataProduct', 'active', 'Demand Forecast Model Output v1', '1.0.0', 'Retail Analytics', 'retail-demo', '00100002-0000-4000-8000-000000000002', 99, NOW(), NOW()),
('00700004-0000-4000-8000-000000000004', 'v1.0.0', 'DataProduct', 'active', 'Inventory Optimization Recommendations v1', '1.0.0', 'Supply Chain', 'retail-demo', '00100001-0000-4000-8000-000000000001', 99, NOW(), NOW()),
('00700005-0000-4000-8000-000000000005', 'v1.0.0', 'DataProduct', 'active', 'Price Optimization Model Output v1', '1.0.0', 'Retail Analytics', 'retail-demo', '00100002-0000-4000-8000-000000000002', 99, NOW(), NOW()),
('00700006-0000-4000-8000-000000000006', 'v1.0.0', 'DataProduct', 'active', 'Customer Marketing Recommendations v1', '1.0.0', 'Marketing', 'retail-demo', '00100004-0000-4000-8000-000000000004', 99, NOW(), NOW()),
('00700007-0000-4000-8000-000000000007', 'v1.0.0', 'DataProduct', 'active', 'Retail Performance Dashboard Data v1', '1.0.0', 'Retail Analytics', 'retail-demo', '00100002-0000-4000-8000-000000000002', 99, NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5b. DATA PRODUCT DESCRIPTIONS (type=008)
-- ============================================================================

INSERT INTO data_product_descriptions (id, product_id, purpose, usage, limitations) VALUES
('00800001-0000-4000-8000-000000000001', '00700001-0000-4000-8000-000000000001', 'Provide real-time point-of-sale transaction data from store systems for downstream analytics and operational use cases.', 'Consume this stream for real-time fraud detection, inventory tracking, or as a foundation for prepared analytics datasets.', 'Raw data format may contain system-specific codes. Some transactions may have delayed timestamps.'),
('00800002-0000-4000-8000-000000000002', '00700002-0000-4000-8000-000000000002', 'Provide cleaned, validated, and standardized sales transaction data ready for analytics consumption.', 'Use for BI reporting, demand forecasting, customer analytics, and other downstream analytical use cases.', 'Data is batch-processed with 1-hour lag. PII fields are masked according to data governance policies.'),
('00800003-0000-4000-8000-000000000003', '00700003-0000-4000-8000-000000000003', 'Provide predicted demand for products at various locations based on historical sales and external factors.', 'Use for inventory planning, supply chain optimization, and promotional planning.', 'Forecasts are updated daily. Accuracy degrades beyond 30-day horizon.'),
('00800004-0000-4000-8000-000000000004', '00700004-0000-4000-8000-000000000004', 'Provide automated inventory reordering recommendations based on demand forecasts and current stock levels.', 'API consumed by inventory management system to trigger automated reorders.', 'Recommendations assume lead times from supplier contracts.'),
('00800005-0000-4000-8000-000000000005', '00700005-0000-4000-8000-000000000005', 'Provide data-driven pricing recommendations based on demand elasticity and competitive positioning.', 'Review recommendations weekly and apply to pricing systems via bulk import.', 'Model excludes promotional pricing. Recommendations should be reviewed by category managers.'),
('00800006-0000-4000-8000-000000000006', '00700006-0000-4000-8000-000000000006', 'Provide targeted customer segments and personalized product recommendations for marketing campaigns.', 'Export customer lists weekly for email campaigns. Use real-time API for website personalization.', 'Contains PII - restricted access. Email frequency caps applied per GDPR.'),
('00800007-0000-4000-8000-000000000007', '00700007-0000-4000-8000-000000000007', 'Provide aggregated, denormalized data optimized for executive-level retail performance dashboards.', 'Connect BI tools directly via provided connection string. Data refreshes nightly at 2 AM EST.', 'Historical data limited to 2 years rolling window.')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5c. DATA PRODUCT OUTPUT PORTS (type=009)
-- ============================================================================

INSERT INTO data_product_output_ports (id, product_id, name, version, description, port_type, status, contract_id, contains_pii, auto_approve, server) VALUES
('00900001-0000-4000-8000-000000000001', '00700001-0000-4000-8000-000000000001', 'POS Kafka Stream', '1.0.0', 'Real-time feed of raw POS transaction events', 'kafka', 'active', 'pos-transaction-contract-v1', false, false, '{"host": "kafka.example.com", "topic": "pos-transactions-raw-v1"}'),
('00900002-0000-4000-8000-000000000002', '00700002-0000-4000-8000-000000000002', 'prepared_sales_delta', '1.0.0', 'Delta table containing cleaned sales transactions', 'table', 'active', 'prepared-sales-contract-v1', true, false, '{"location": "s3://data-lake/prepared/retail/sales/v1", "format": "delta"}'),
('00900003-0000-4000-8000-000000000003', '00700003-0000-4000-8000-000000000003', 'demand_forecast_table', '1.0.0', 'Delta table containing product demand forecasts', 'table', 'active', 'demand-forecast-contract-v1', false, true, '{"location": "s3://data-analytics/retail/forecast/v1", "format": "delta"}'),
('00900004-0000-4000-8000-000000000004', '00700004-0000-4000-8000-000000000004', 'Inventory Reorder API', '1.0.0', 'API endpoint for inventory management system', 'api', 'active', NULL, false, false, '{"location": "https://api.example.com/inventory/reorder/v1"}'),
('00900005-0000-4000-8000-000000000005', '00700005-0000-4000-8000-000000000005', 'price_recommendations_table', '1.0.0', 'Delta table with optimal price recommendations', 'table', 'active', 'price-recommendations-contract-v1', false, false, '{"location": "s3://data-analytics/retail/pricing/v1", "format": "delta"}'),
('00900006-0000-4000-8000-000000000006', '00700006-0000-4000-8000-000000000006', 'marketing_campaign_list', '1.0.0', 'CSV file with customer IDs and recommended campaigns', 'file', 'active', NULL, true, false, '{"location": "s3://data-marketing/retail/campaigns/v1/targets.csv", "format": "csv"}'),
('00900007-0000-4000-8000-000000000007', '00700007-0000-4000-8000-000000000007', 'BI Tool Connection', '1.0.0', 'Direct connection endpoint for BI tool consumption', 'dashboard', 'active', NULL, false, true, '{"location": "https://bi.example.com/dashboards/retail-perf-v1"}')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5d. DATA PRODUCT INPUT PORTS (type=00a)
-- ============================================================================

INSERT INTO data_product_input_ports (id, product_id, name, version, contract_id) VALUES
('00a00001-0000-4000-8000-000000000001', '00700002-0000-4000-8000-000000000002', 'Raw POS Stream', '1.0.0', 'pos-transaction-contract-v1'),
('00a00002-0000-4000-8000-000000000002', '00700003-0000-4000-8000-000000000003', 'Prepared Sales Data', '1.0.0', 'prepared-sales-contract-v1'),
('00a00003-0000-4000-8000-000000000003', '00700004-0000-4000-8000-000000000004', 'Demand Forecast Data', '1.0.0', 'demand-forecast-contract-v1'),
('00a00004-0000-4000-8000-000000000004', '00700005-0000-4000-8000-000000000005', 'Demand Forecast Data', '1.0.0', 'demand-forecast-contract-v1'),
('00a00005-0000-4000-8000-000000000005', '00700005-0000-4000-8000-000000000005', 'Competitor Pricing Feed', '1.0.0', 'competitor-pricing-contract-v1'),
('00a00006-0000-4000-8000-000000000006', '00700006-0000-4000-8000-000000000006', 'Prepared Sales Data', '1.0.0', 'prepared-sales-contract-v1'),
('00a00007-0000-4000-8000-000000000007', '00700006-0000-4000-8000-000000000006', 'Customer Profile Data', '1.0.0', 'customer-profile-contract-v1'),
('00a00008-0000-4000-8000-000000000008', '00700007-0000-4000-8000-000000000007', 'Prepared Sales Data', '1.0.0', 'prepared-sales-contract-v1'),
('00a00009-0000-4000-8000-000000000009', '00700007-0000-4000-8000-000000000007', 'Demand Forecast Data', '1.0.0', 'demand-forecast-contract-v1'),
('00a0000a-0000-4000-8000-000000000010', '00700007-0000-4000-8000-000000000007', 'Inventory Snapshot', '1.0.0', 'inventory-snapshot-contract-v1')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5e. DATA PRODUCT SUPPORT CHANNELS (type=00b)
-- ============================================================================

INSERT INTO data_product_support_channels (id, product_id, channel, url, tool, scope, description) VALUES
('00b00001-0000-4000-8000-000000000001', '00700001-0000-4000-8000-000000000001', 'pos-stream-support', 'https://slack.com/channels/pos-stream-support', 'slack', 'interactive', '24/7 support channel for POS stream issues'),
('00b00002-0000-4000-8000-000000000002', '00700002-0000-4000-8000-000000000002', 'prepared-data-support', 'https://slack.com/channels/prepared-data-support', 'slack', 'issues', NULL),
('00b00003-0000-4000-8000-000000000003', '00700003-0000-4000-8000-000000000003', 'ml-support', 'https://teams.com/channels/ml-support', 'teams', 'interactive', NULL),
('00b00004-0000-4000-8000-000000000004', '00700004-0000-4000-8000-000000000004', 'inventory-ops-support', 'https://jira.example.com/projects/INV', 'ticket', 'issues', 'JIRA project for inventory optimization issues'),
('00b00005-0000-4000-8000-000000000005', '00700005-0000-4000-8000-000000000005', 'pricing-team', 'https://slack.com/channels/pricing-team', 'slack', 'interactive', NULL),
('00b00006-0000-4000-8000-000000000006', '00700006-0000-4000-8000-000000000006', 'marketing-ops', 'https://slack.com/channels/marketing-ops', 'slack', 'announcements', 'Campaign launch announcements and coordination'),
('00b00007-0000-4000-8000-000000000007', '00700007-0000-4000-8000-000000000007', 'bi-support', 'https://teams.com/channels/bi-support', 'teams', 'interactive', NULL)

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5f. DATA PRODUCT TEAMS (type=00c)
-- ============================================================================

INSERT INTO data_product_teams (id, product_id, name, description) VALUES
('00c00001-0000-4000-8000-000000000001', '00700001-0000-4000-8000-000000000001', 'Data Engineering', NULL),
('00c00002-0000-4000-8000-000000000002', '00700002-0000-4000-8000-000000000002', 'Data Engineering', NULL),
('00c00003-0000-4000-8000-000000000003', '00700003-0000-4000-8000-000000000003', 'Analytics Team', NULL),
('00c00004-0000-4000-8000-000000000004', '00700004-0000-4000-8000-000000000004', 'Operations Team', NULL),
('00c00005-0000-4000-8000-000000000005', '00700005-0000-4000-8000-000000000005', 'Analytics Team', NULL),
('00c00006-0000-4000-8000-000000000006', '00700006-0000-4000-8000-000000000006', 'Marketing Team', NULL),
('00c00007-0000-4000-8000-000000000007', '00700007-0000-4000-8000-000000000007', 'Analytics Team', NULL)

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 5g. DATA PRODUCT TEAM MEMBERS (type=00d)
-- ============================================================================

INSERT INTO data_product_team_members (id, team_id, username, name, role) VALUES
('00d00001-0000-4000-8000-000000000001', '00c00001-0000-4000-8000-000000000001', 'eng-lead@example.com', 'Alice Engineer', 'owner'),
('00d00002-0000-4000-8000-000000000002', '00c00002-0000-4000-8000-000000000002', 'eng-lead@example.com', 'Alice Engineer', 'owner'),
('00d00003-0000-4000-8000-000000000003', '00c00002-0000-4000-8000-000000000002', 'data-steward@example.com', 'Bob Steward', 'data steward'),
('00d00004-0000-4000-8000-000000000004', '00c00003-0000-4000-8000-000000000003', 'ml-lead@example.com', 'Charlie ML', 'owner'),
('00d00005-0000-4000-8000-000000000005', '00c00003-0000-4000-8000-000000000003', 'data-scientist@example.com', 'Dana Scientist', 'contributor'),
('00d00006-0000-4000-8000-000000000006', '00c00004-0000-4000-8000-000000000004', 'ops-lead@example.com', 'Eve Operations', 'owner'),
('00d00007-0000-4000-8000-000000000007', '00c00005-0000-4000-8000-000000000005', 'pricing-analyst@example.com', 'Frank Analyst', 'owner'),
('00d00008-0000-4000-8000-000000000008', '00c00006-0000-4000-8000-000000000006', 'marketing-lead@example.com', 'Grace Marketing', 'owner'),
('00d00009-0000-4000-8000-000000000009', '00c00007-0000-4000-8000-000000000007', 'bi-dev@example.com', 'Henry BI', 'owner')

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 6. DATA ASSET REVIEWS (type=00e)
-- ============================================================================

INSERT INTO data_asset_review_requests (id, requester_email, reviewer_email, status, notes, created_at, updated_at) VALUES
('00e00001-0000-4000-8000-000000000001', 'data.user@example.com', 'data.steward@example.com', 'queued', 'Initial review request for core sales data.', NOW(), NOW()),
('00e00002-0000-4000-8000-000000000002', 'analyst@example.com', 'data.steward@example.com', 'in_review', 'Checking staging data before promotion.', NOW(), NOW()),
('00e00003-0000-4000-8000-000000000003', 'data.user@example.com', 'security.officer@example.com', 'approved', 'Security review completed and approved.', NOW(), NOW()),
('00e00004-0000-4000-8000-000000000004', 'trainee@example.com', 'data.steward@example.com', 'needs_review', 'Please clarify the view logic and data sources.', NOW(), NOW()),
('00e00005-0000-4000-8000-000000000005', 'data.engineer@example.com', 'data.architect@example.com', 'queued', 'Review new utility function and its associated storage volume.', NOW(), NOW()),
('00e00006-0000-4000-8000-000000000006', 'data.scientist@example.com', 'lead.data.scientist@example.com', 'in_review', 'Please review this new exploratory analysis notebook for PII and best practices.', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 6b. REVIEWED ASSETS (type=00f)
-- ============================================================================

INSERT INTO reviewed_assets (id, review_request_id, asset_fqn, asset_type, status, comments, updated_at) VALUES
('00f00001-0000-4000-8000-000000000001', '00e00001-0000-4000-8000-000000000001', 'main.sales.orders', 'table', 'pending', NULL, NOW()),
('00f00002-0000-4000-8000-000000000002', '00e00001-0000-4000-8000-000000000001', 'main.marketing.campaign_view', 'view', 'pending', NULL, NOW()),
('00f00003-0000-4000-8000-000000000003', '00e00002-0000-4000-8000-000000000002', 'dev.staging.customer_data', 'table', 'approved', 'Looks good. Ready for prod.', NOW()),
('00f00004-0000-4000-8000-000000000004', '00e00002-0000-4000-8000-000000000002', 'dev.staging.udf_process_customer', 'function', 'pending', NULL, NOW()),
('00f00005-0000-4000-8000-000000000005', '00e00003-0000-4000-8000-000000000003', 'sensitive.hr.employee_pii', 'table', 'approved', 'Access restricted. PII confirmed.', NOW()),
('00f00006-0000-4000-8000-000000000006', '00e00004-0000-4000-8000-000000000004', 'main.finance.quarterly_report_view', 'view', 'needs_clarification', 'What is the source for column X? The calculation seems off.', NOW()),
('00f00007-0000-4000-8000-000000000007', '00e00005-0000-4000-8000-000000000005', 'utils.common.fn_clean_string', 'function', 'pending', NULL, NOW()),
('00f00008-0000-4000-8000-000000000008', '00e00005-0000-4000-8000-000000000005', 'utils.common.raw_uploads', 'volume', 'pending', 'Check access permissions and naming convention for this volume.', NOW()),
('00f00009-0000-4000-8000-000000000009', '00e00006-0000-4000-8000-000000000006', '/Repos/shared/exploratory_analysis/customer_segmentation_v1', 'notebook', 'pending', 'Focus on commands 3 and 5 regarding data handling.', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 7. NOTIFICATIONS (type=010)
-- ============================================================================

INSERT INTO notifications (id, type, title, subtitle, description, created_at, read, can_delete, recipient) VALUES
('01000001-0000-4000-8000-000000000001', 'success', 'Data Contract Approved', 'Contract: Customer360', 'The data contract for Customer360 has been approved by all stakeholders', NOW() - INTERVAL '1 day', false, true, NULL),
('01000002-0000-4000-8000-000000000002', 'warning', 'Compliance Policy Alert', 'PII Data Encryption', 'Some datasets containing PII are not properly encrypted. Check Compliance dashboard for details.', NOW() - INTERVAL '1 day 1 hour', false, true, NULL),
('01000003-0000-4000-8000-000000000003', 'info', 'New Business Term Added', 'Customer Lifetime Value', 'A new business term has been added to the Finance glossary', NOW() - INTERVAL '2 days', true, true, NULL),
('01000004-0000-4000-8000-000000000004', 'error', 'Security Feature Disabled', 'Column Encryption', 'Column encryption for customer_data.pii_table has been disabled unexpectedly', NOW() - INTERVAL '2 days 2 hours', false, false, NULL),
('01000005-0000-4000-8000-000000000005', 'info', 'System Maintenance', 'Scheduled Downtime', 'System maintenance scheduled for Saturday 20:00 UTC', NOW() - INTERVAL '2 days 4 hours', true, true, NULL)

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 8. COMPLIANCE POLICIES (type=011)
-- ============================================================================

INSERT INTO compliance_policies (id, name, description, rule, category, severity, is_active, created_at, updated_at) VALUES
('01100001-0000-4000-8000-000000000001', 'Naming Conventions', 'Verify that all objects follow corporate naming conventions', E'MATCH (obj:Object)\nWHERE obj.type IN [''catalog'', ''schema'', ''table'', ''view'']\nASSERT \n  CASE obj.type\n    WHEN ''catalog'' THEN obj.name MATCHES ''^[a-z][a-z0-9_]*$''\n    WHEN ''schema'' THEN obj.name MATCHES ''^[a-z][a-z0-9_]*$''\n    WHEN ''table'' THEN obj.name MATCHES ''^[a-z][a-z0-9_]*$''\n    WHEN ''view'' THEN obj.name MATCHES ''^v_[a-z][a-z0-9_]*$''\n  END', 'governance', 'high', true, NOW(), NOW()),
('01100002-0000-4000-8000-000000000002', 'PII Data Encryption', 'Ensure all PII data is encrypted at rest', 'MATCH (d:Dataset) WHERE d.contains_pii = true ASSERT d.encryption = ''AES256''', 'security', 'critical', true, NOW(), NOW()),
('01100003-0000-4000-8000-000000000003', 'Data Quality Thresholds', 'Maintain data quality metrics above defined thresholds', 'MATCH (d:Dataset) ASSERT d.completeness > 0.95 AND d.accuracy > 0.98', 'quality', 'high', true, NOW(), NOW()),
('01100004-0000-4000-8000-000000000004', 'Access Control', 'Verify proper access controls on sensitive data', 'MATCH (d:Dataset) WHERE d.sensitivity = ''high'' ASSERT d.access_level = ''restricted''', 'security', 'critical', true, NOW(), NOW()),
('01100005-0000-4000-8000-000000000005', 'Data Freshness', 'Ensure data is updated within defined timeframes', 'MATCH (d:Dataset) ASSERT d.last_updated > datetime() - duration(''P1D'')', 'freshness', 'medium', true, NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 8b. COMPLIANCE RUNS (type=012)
-- ============================================================================

INSERT INTO compliance_runs (id, policy_id, status, started_at, finished_at, success_count, failure_count, score) VALUES
('01200001-0000-4000-8000-000000000001', '01100001-0000-4000-8000-000000000001', 'succeeded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '1 minute', 4, 2, 66.7),
('01200002-0000-4000-8000-000000000002', '01100001-0000-4000-8000-000000000001', 'succeeded', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 minutes', 5, 1, 83.3),
('01200003-0000-4000-8000-000000000003', '01100002-0000-4000-8000-000000000002', 'succeeded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '40 seconds', 4, 1, 80.0),
('01200004-0000-4000-8000-000000000004', '01100003-0000-4000-8000-000000000003', 'succeeded', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 minute 10 seconds', 9, 1, 90.0),
('01200005-0000-4000-8000-000000000005', '01100004-0000-4000-8000-000000000004', 'succeeded', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '35 seconds', 3, 1, 75.0),
('01200006-0000-4000-8000-000000000006', '01100005-0000-4000-8000-000000000005', 'succeeded', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '28 seconds', 8, 1, 88.9)

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 8c. COMPLIANCE RESULTS (type=013)
-- ============================================================================

INSERT INTO compliance_results (id, run_id, object_type, object_id, object_name, passed, message, created_at) VALUES
('01300001-0000-4000-8000-000000000001', '01200001-0000-4000-8000-000000000001', 'catalog', 'analytics', 'analytics', true, NULL, NOW()),
('01300002-0000-4000-8000-000000000002', '01200001-0000-4000-8000-000000000001', 'schema', 'customer_360', 'customer_360', true, NULL, NOW()),
('01300003-0000-4000-8000-000000000003', '01200001-0000-4000-8000-000000000001', 'table', 'Orders', 'Orders', false, 'Expected name to match ^[a-z][a-z0-9_]*$', NOW()),
('01300004-0000-4000-8000-000000000004', '01200001-0000-4000-8000-000000000001', 'view', 'orders_view', 'orders_view', false, 'Views must start with v_', NOW()),
('01300005-0000-4000-8000-000000000005', '01200003-0000-4000-8000-000000000003', 'dataset', 'customer.emails', 'customer.emails', true, NULL, NOW()),
('01300006-0000-4000-8000-000000000006', '01200003-0000-4000-8000-000000000003', 'dataset', 'customer.addresses', 'customer.addresses', true, NULL, NOW()),
('01300007-0000-4000-8000-000000000007', '01200003-0000-4000-8000-000000000003', 'dataset', 'customer.cards', 'customer.cards', false, 'Encryption required: AES256', NOW()),
('01300008-0000-4000-8000-000000000008', '01200004-0000-4000-8000-000000000004', 'dataset', 'sales.orders_daily', 'sales.orders_daily', true, NULL, NOW()),
('01300009-0000-4000-8000-000000000009', '01200004-0000-4000-8000-000000000004', 'dataset', 'sales.orders_raw', 'sales.orders_raw', false, 'completeness=0.91 < 0.95', NOW()),
('0130000a-0000-4000-8000-000000000010', '01200005-0000-4000-8000-000000000005', 'dataset', 'hr.salaries', 'hr.salaries', true, NULL, NOW()),
('0130000b-0000-4000-8000-000000000011', '01200005-0000-4000-8000-000000000005', 'dataset', 'finance.payments', 'finance.payments', false, 'access_level must be restricted', NOW()),
('0130000c-0000-4000-8000-000000000012', '01200006-0000-4000-8000-000000000006', 'dataset', 'bi.product_dim', 'bi.product_dim', true, NULL, NOW()),
('0130000d-0000-4000-8000-000000000013', '01200006-0000-4000-8000-000000000006', 'dataset', 'bi.inventory_fact', 'bi.inventory_fact', false, 'last_updated older than 1 day', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 9. COST ITEMS (type=014)
-- ============================================================================
-- Note: cost_items.id is UUID type, so we use valid hex UUIDs

INSERT INTO cost_items (id, entity_type, entity_id, title, description, cost_center, custom_center_name, amount_cents, currency, start_month, created_by, created_at, updated_at) VALUES
('01400001-0000-4000-8000-000000000001', 'data_product', '00700001-0000-4000-8000-000000000001', 'Staff', 'Monthly HR cost for developers', 'HR', NULL, 450000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400002-0000-4000-8000-000000000002', 'data_product', '00700001-0000-4000-8000-000000000001', 'Consulting', 'External support', 'OTHER', '3343', 250000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400003-0000-4000-8000-000000000003', 'data_product', '00700001-0000-4000-8000-000000000001', 'Storage', 'Table storage and retention', 'STORAGE', NULL, 120000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400004-0000-4000-8000-000000000004', 'data_product', '00700001-0000-4000-8000-000000000001', 'Maintenance', 'Tooling subscriptions and upkeep', 'MAINTENANCE', NULL, 80000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400005-0000-4000-8000-000000000005', 'data_product', '00700001-0000-4000-8000-000000000001', 'Infra', 'Databricks serverless usage (synced)', 'INFRASTRUCTURE', NULL, 300000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400006-0000-4000-8000-000000000006', 'data_product', '00700002-0000-4000-8000-000000000002', 'Infra', 'Databricks serverless usage (synced)', 'INFRASTRUCTURE', NULL, 220000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400007-0000-4000-8000-000000000007', 'data_product', '00700002-0000-4000-8000-000000000002', 'Staff', 'Data engineer on-call', 'HR', NULL, 350000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW()),
('01400008-0000-4000-8000-000000000008', 'data_product', '00700002-0000-4000-8000-000000000002', 'Storage', 'Delta tables', 'STORAGE', NULL, 90000, 'USD', '2025-10-01', 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 10. SEMANTIC LINKS (type=015)
-- ============================================================================

INSERT INTO entity_semantic_links (id, entity_id, entity_type, iri, label, created_by, created_at) VALUES
('01500001-0000-4000-8000-000000000001', '00000007-0000-4000-8000-000000000007', 'data_domain', 'http://example.com/business/concepts#CustomerDomain', 'Customer Domain', 'system@demo', NOW()),
('01500002-0000-4000-8000-000000000002', '00000002-0000-4000-8000-000000000002', 'data_domain', 'http://example.com/business/concepts#FinancialDomain', 'Financial Domain', 'system@demo', NOW()),
('01500003-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000003', 'data_domain', 'http://example.com/business/concepts#SalesDomain', 'Sales Domain', 'system@demo', NOW()),
('01500004-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000004', 'data_domain', 'http://example.com/business/concepts#MarketingDomain', 'Marketing Domain', 'system@demo', NOW()),
('01500005-0000-4000-8000-000000000005', '00000005-0000-4000-8000-000000000005', 'data_domain', 'http://example.com/business/concepts#RetailDomain', 'Retail Domain', 'system@demo', NOW()),
('01500006-0000-4000-8000-000000000006', '00000008-0000-4000-8000-000000000008', 'data_domain', 'http://example.com/business/concepts#ProductDomain', 'Product Domain', 'system@demo', NOW()),
('01500007-0000-4000-8000-000000000007', '00000009-0000-4000-8000-000000000009', 'data_domain', 'http://example.com/business/concepts#EmployeeDomain', 'Employee Domain', 'system@demo', NOW()),
('01500008-0000-4000-8000-000000000008', '00700001-0000-4000-8000-000000000001', 'data_product', 'http://example.com/business/concepts#Sale', 'Sale', 'system@demo', NOW()),
('01500009-0000-4000-8000-000000000009', '00700002-0000-4000-8000-000000000002', 'data_product', 'http://example.com/business/concepts#Transaction', 'Transaction', 'system@demo', NOW()),
('0150000a-0000-4000-8000-000000000010', '00700006-0000-4000-8000-000000000006', 'data_product', 'http://example.com/business/concepts#Customer', 'Customer', 'system@demo', NOW()),
('0150000b-0000-4000-8000-000000000011', '00700007-0000-4000-8000-000000000007', 'data_product', 'http://example.com/business/concepts#Sale', 'Sale', 'system@demo', NOW()),
('0150000c-0000-4000-8000-000000000012', '00700004-0000-4000-8000-000000000004', 'data_product', 'http://example.com/business/concepts#Inventory', 'Inventory', 'system@demo', NOW()),
('0150000d-0000-4000-8000-000000000013', '00700005-0000-4000-8000-000000000005', 'data_product', 'http://example.com/business/concepts#Product', 'Product', 'system@demo', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 11. METADATA (Notes, Links, Documents)
-- ============================================================================

-- Rich Text Notes (type=016)
INSERT INTO rich_text_metadata (id, entity_id, entity_type, title, short_description, content_markdown, is_shared, level, inheritable, created_by, created_at, updated_at) VALUES
('01600001-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000004', 'data_domain', 'About the Marketing Domain', 'Scope, key concepts, and stakeholders for Marketing.', E'# Marketing Domain\n\nThe Marketing domain focuses on customer engagement, personalization, and campaign\neffectiveness. Typical assets include customer profiles, segmentation models,\npropensity and uplift scores, and activation datasets for outbound channels.\n\nCore concepts often used across data products:\n- Customer identity and householding\n- Consent and channel preferences\n- Campaign taxonomy and lifecycle\n- Response and attribution measures\n\nGovernance highlights include consent management and PII handling standards.', false, 50, true, 'system@demo', NOW(), NOW()),
('01600002-0000-4000-8000-000000000002', '00700006-0000-4000-8000-000000000006', 'data_product', 'Overview', 'What this product offers and who should use it.', E'# Customer Marketing Recommendations v1\n\nThis product provides targeted customer recommendations to support lifecycle and\npromotional campaigns. It merges prepared sales signals, customer profile\nattributes, and model outputs to produce actionable target lists.\n\nService levels and ownership:\n- Data Owner: Marketing Team\n- SLOs: Daily build by 06:00 UTC; refresh-on-demand supported\n- Data Quality: Monitored via rules on coverage, deduplication, and eligibility', false, 50, true, 'system@demo', NOW(), NOW()),
('01600003-0000-4000-8000-000000000003', '00700006-0000-4000-8000-000000000006', 'data_product', 'Architecture & Flow', 'Inputs, transformations, and outputs at a glance.', E'## Architecture and Flow\n\nInputs include prepared sales transactions and CRM profile data. Core steps:\n1. Feature assembly and feature freshness checks\n2. Inference using latest recommendation model\n3. Eligibility filtering (consent, channel, recency)\n4. Packaging outputs for activation channels', false, 50, true, 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- Link Metadata (type=017)
INSERT INTO link_metadata (id, entity_id, entity_type, title, short_description, url, is_shared, level, inheritable, created_by, created_at, updated_at) VALUES
('01700001-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000004', 'data_domain', 'Domain Operating Model', 'Roles, responsibilities, workflows.', 'https://wiki.example.com/domains/marketing/operating-model', false, 50, true, 'system@demo', NOW(), NOW()),
('01700002-0000-4000-8000-000000000002', '00700006-0000-4000-8000-000000000006', 'data_product', 'Runbook', 'Operational procedures and on-call.', 'https://runbooks.example.com/marketing/customer-recs-v1', false, 50, true, 'system@demo', NOW(), NOW()),
('01700003-0000-4000-8000-000000000003', '00700006-0000-4000-8000-000000000006', 'data_product', 'Dashboard', 'Quality and volume tracking.', 'https://bi.example.com/dashboards/customer-recs-quality', false, 50, true, 'system@demo', NOW(), NOW()),
('01700004-0000-4000-8000-000000000004', '00700006-0000-4000-8000-000000000006', 'data_product', 'Design Doc', 'Detailed design and decisions.', 'https://docs.example.com/design/customer-recs-v1', false, 50, true, 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


-- Document Metadata (type=018)
INSERT INTO document_metadata (id, entity_id, entity_type, title, short_description, original_filename, storage_path, is_shared, level, inheritable, created_by, created_at, updated_at) VALUES
('01800001-0000-4000-8000-000000000001', '00700006-0000-4000-8000-000000000006', 'data_product', 'Overview', 'Product overview visual.', 'customer_recs_overview.svg', 'images/customer_marketing_recos/overview.svg', false, 50, true, 'system@demo', NOW(), NOW()),
('01800002-0000-4000-8000-000000000002', '00700006-0000-4000-8000-000000000006', 'data_product', 'Data Flow', 'High-level data flow.', 'customer_recs_flow.svg', 'images/customer_marketing_recos/flow.svg', false, 50, true, 'system@demo', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;


COMMIT;

-- ============================================================================
-- End of Demo Data
-- ============================================================================
