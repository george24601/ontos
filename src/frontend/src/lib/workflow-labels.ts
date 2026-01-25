/**
 * Workflow label utilities.
 * 
 * Provides consistent, localized labels for workflow trigger types,
 * entity types, and step types throughout the application.
 */

import { TFunction } from 'i18next';
import { TriggerType, EntityType, StepType } from '@/types/process-workflow';

/**
 * Get a human-readable label for a trigger type.
 */
export function getTriggerTypeLabel(type: TriggerType, t: TFunction): string {
  return t(`common:workflows.triggerTypes.${type}`, { defaultValue: formatFallback(type) });
}

/**
 * Get a human-readable label for an entity type.
 */
export function getEntityTypeLabel(type: EntityType, t: TFunction): string {
  return t(`common:workflows.entityTypes.${type}`, { defaultValue: formatFallback(type) });
}

/**
 * Get a human-readable label for a step type.
 */
export function getStepTypeLabel(type: StepType, t: TFunction): string {
  return t(`common:workflows.stepTypes.${type}`, { defaultValue: formatFallback(type) });
}

/**
 * Get a formatted trigger display string including entity types.
 * Example: "On Create (Table, View)"
 */
export function getTriggerDisplay(
  trigger: { type: TriggerType; entity_types: EntityType[] },
  t: TFunction
): string {
  const typeLabel = getTriggerTypeLabel(trigger.type, t);
  
  if (!trigger.entity_types || trigger.entity_types.length === 0) {
    return typeLabel;
  }
  
  const entityLabels = trigger.entity_types
    .map(et => getEntityTypeLabel(et, t))
    .join(', ');
  
  return `${typeLabel} (${entityLabels})`;
}

/**
 * Format a snake_case or kebab-case string as a fallback label.
 * Example: "on_request_review" -> "On Request Review"
 */
function formatFallback(value: string): string {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * All trigger types for use in selectors/dropdowns.
 */
export const ALL_TRIGGER_TYPES: TriggerType[] = [
  'on_create',
  'on_update',
  'on_delete',
  'on_status_change',
  'scheduled',
  'manual',
  'before_create',
  'before_update',
  'on_request_review',
  'on_request_access',
  'on_request_publish',
  'on_request_status_change',
  'on_job_success',
  'on_job_failure',
  'on_subscribe',
  'on_unsubscribe',
  'on_expiring',
  'on_revoke',
];

/**
 * All entity types for use in selectors/dropdowns.
 */
export const ALL_ENTITY_TYPES: EntityType[] = [
  'catalog',
  'schema',
  'table',
  'view',
  'data_contract',
  'data_product',
  'dataset',
  'domain',
  'project',
  'access_grant',
  'role',
  'data_asset_review',
  'job',
  'subscription',
];

/**
 * All step types for use in selectors/dropdowns.
 */
export const ALL_STEP_TYPES: StepType[] = [
  'validation',
  'approval',
  'notification',
  'assign_tag',
  'remove_tag',
  'conditional',
  'script',
  'pass',
  'fail',
  'policy_check',
  'delivery',
];

