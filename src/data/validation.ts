/**
 * Data validation and preprocessing module
 */

import { z } from 'zod';
import { ResponseData, ItemMetadata, ItemType } from '../types/index.js';

// Zod schemas for validation
export const ResponseDataSchema = z.object({
  person_id: z.string().min(1),
  item_id: z.string().min(1),
  response: z.number(),
  group_id: z.string().optional(),
  form_id: z.string().optional(),
  weight: z.number().positive().optional()
});

export const ItemMetadataSchema = z.object({
  item_id: z.string().min(1),
  item_type: z.enum(['binary', 'ordinal', 'nominal', 'continuous']),
  categories: z.array(z.number()).optional(),
  category_labels: z.array(z.string()).optional(),
  reverse_coded: z.boolean().optional(),
  anchor_item: z.boolean().optional()
});

export const PersonMetadataSchema = z.object({
  person_id: z.string().min(1),
  group_id: z.string().optional(),
  form_id: z.string().optional(),
  focal_group: z.boolean().optional(),
  weight: z.number().positive().optional()
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataSummary {
  n_persons: number;
  n_items: number;
  n_responses: number;
  missing_rate: number;
  item_summaries: ItemSummary[];
  group_summaries?: GroupSummary[];
  form_summaries?: FormSummary[];
}

export interface ItemSummary {
  item_id: string;
  item_type: ItemType;
  n_responses: number;
  missing_rate: number;
  mean?: number;
  sd?: number;
  category_frequencies?: { [category: number]: number };
  sparse_categories?: number[];
}

export interface GroupSummary {
  group_id: string;
  n_persons: number;
  n_responses: number;
}

export interface FormSummary {
  form_id: string;
  n_persons: number;
  n_items: number;
}

/**
 * Validate response data
 */
export function validateResponseData(data: unknown[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('Response data must be a non-empty array');
    return { valid: false, errors, warnings };
  }

  // Validate each response
  const validResponses: ResponseData[] = [];
  data.forEach((item, index) => {
    const result = ResponseDataSchema.safeParse(item);
    if (!result.success) {
      errors.push(`Row ${index}: ${result.error.message}`);
    } else {
      validResponses.push(result.data);
    }
  });

  // Check for duplicate person-item pairs
  const seen = new Set<string>();
  validResponses.forEach((response) => {
    const key = `${response.person_id}_${response.item_id}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate response for person ${response.person_id} and item ${response.item_id}`);
    }
    seen.add(key);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate item metadata
 */
export function validateItemMetadata(metadata: unknown[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(metadata) || metadata.length === 0) {
    errors.push('Item metadata must be a non-empty array');
    return { valid: false, errors, warnings };
  }

  const validItems: ItemMetadata[] = [];
  metadata.forEach((item, _index) => {
    const result = ItemMetadataSchema.safeParse(item);
    if (!result.success) {
      errors.push(`Item ${_index}: ${result.error.message}`);
    } else {
      validItems.push(result.data);

      // Check category specifications
      if (result.data.item_type === 'ordinal' || result.data.item_type === 'nominal') {
        if (!result.data.categories || result.data.categories.length < 2) {
          warnings.push(`Item ${result.data.item_id}: ordinal/nominal items should have at least 2 categories defined`);
        }
      }
    }
  });

  // Check for duplicate item IDs
  const itemIds = new Set<string>();
  validItems.forEach(item => {
    if (itemIds.has(item.item_id)) {
      errors.push(`Duplicate item_id: ${item.item_id}`);
    }
    itemIds.add(item.item_id);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate data summary statistics
 */
export function generateDataSummary(
  responses: ResponseData[],
  items: ItemMetadata[]
): DataSummary {
  const personIds = new Set(responses.map(r => r.person_id));
  const itemIds = new Set(responses.map(r => r.item_id));

  const itemMap = new Map(items.map(item => [item.item_id, item]));

  // Calculate item summaries
  const itemSummaries: ItemSummary[] = Array.from(itemIds).map(itemId => {
    const itemResponses = responses.filter(r => r.item_id === itemId);
    const itemMeta = itemMap.get(itemId);
    const values = itemResponses.map(r => r.response);

    const summary: ItemSummary = {
      item_id: itemId,
      item_type: itemMeta?.item_type || 'binary',
      n_responses: itemResponses.length,
      missing_rate: 1 - (itemResponses.length / personIds.size)
    };

    // Calculate statistics for continuous/binary items
    if (itemMeta?.item_type === 'binary' || itemMeta?.item_type === 'continuous') {
      const sum = values.reduce((a, b) => a + b, 0);
      summary.mean = sum / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - summary.mean!, 2), 0) / values.length;
      summary.sd = Math.sqrt(variance);
    }

    // Calculate category frequencies for ordinal/nominal
    if (itemMeta?.item_type === 'ordinal' || itemMeta?.item_type === 'nominal') {
      summary.category_frequencies = {};
      values.forEach(v => {
        summary.category_frequencies![v] = (summary.category_frequencies![v] || 0) + 1;
      });

      // Identify sparse categories (< 5% of responses)
      const threshold = values.length * 0.05;
      summary.sparse_categories = Object.entries(summary.category_frequencies)
        .filter(([_, count]) => count < threshold)
        .map(([cat, _]) => parseInt(cat));
    }

    return summary;
  });

  // Calculate group summaries if applicable
  const groupIds = new Set(responses.filter(r => r.group_id).map(r => r.group_id!));
  const groupSummaries: GroupSummary[] | undefined = groupIds.size > 0 
    ? Array.from(groupIds).map(groupId => {
        const groupResponses = responses.filter(r => r.group_id === groupId);
        const groupPersons = new Set(groupResponses.map(r => r.person_id));
        return {
          group_id: groupId,
          n_persons: groupPersons.size,
          n_responses: groupResponses.length
        };
      })
    : undefined;

  // Calculate form summaries if applicable
  const formIds = new Set(responses.filter(r => r.form_id).map(r => r.form_id!));
  const formSummaries: FormSummary[] | undefined = formIds.size > 0
    ? Array.from(formIds).map(formId => {
        const formResponses = responses.filter(r => r.form_id === formId);
        const formPersons = new Set(formResponses.map(r => r.person_id));
        const formItems = new Set(formResponses.map(r => r.item_id));
        return {
          form_id: formId,
          n_persons: formPersons.size,
          n_items: formItems.size
        };
      })
    : undefined;

  return {
    n_persons: personIds.size,
    n_items: itemIds.size,
    n_responses: responses.length,
    missing_rate: 1 - (responses.length / (personIds.size * itemIds.size)),
    item_summaries: itemSummaries,
    group_summaries: groupSummaries,
    form_summaries: formSummaries
  };
}

/**
 * Check for data quality issues
 */
export function checkDataQuality(summary: DataSummary): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for high missing rates
  if (summary.missing_rate > 0.3) {
    warnings.push(`High overall missing rate: ${(summary.missing_rate * 100).toFixed(1)}%`);
  }

  // Check individual items
  summary.item_summaries.forEach(item => {
    if (item.missing_rate > 0.5) {
      warnings.push(`Item ${item.item_id} has high missing rate: ${(item.missing_rate * 100).toFixed(1)}%`);
    }

    // Check for sparse categories
    if (item.sparse_categories && item.sparse_categories.length > 0) {
      warnings.push(`Item ${item.item_id} has sparse categories: ${item.sparse_categories.join(', ')} (consider merging)`);
    }

    // Check for no variance
    if (item.sd !== undefined && item.sd < 0.01) {
      warnings.push(`Item ${item.item_id} has very low variance (sd=${item.sd.toFixed(4)})`);
    }
  });

  // Check group sizes for multilevel analysis
  if (summary.group_summaries) {
    const smallGroups = summary.group_summaries.filter(g => g.n_persons < 10);
    if (smallGroups.length > 0) {
      warnings.push(`${smallGroups.length} groups have fewer than 10 persons (may affect multilevel estimation)`);
    }
  }

  // Check form sample sizes for equating
  if (summary.form_summaries) {
    const smallForms = summary.form_summaries.filter(f => f.n_persons < 100);
    if (smallForms.length > 0) {
      warnings.push(`${smallForms.length} forms have fewer than 100 persons (may affect equating stability)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
