/**
 * Tests for data validation module
 */

import {
  validateResponseData,
  validateItemMetadata,
  generateDataSummary,
  checkDataQuality
} from '../validation';
import { ResponseData, ItemMetadata } from '../../types';

describe('Data Validation', () => {
  describe('validateResponseData', () => {
    it('should accept valid response data', () => {
      const data: ResponseData[] = [
        { person_id: 'p1', item_id: 'i1', response: 1 },
        { person_id: 'p1', item_id: 'i2', response: 0 },
        { person_id: 'p2', item_id: 'i1', response: 1 }
      ];

      const result = validateResponseData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty array', () => {
      const result = validateResponseData([]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid response format', () => {
      const data = [
        { person_id: 'p1', response: 1 } // missing item_id
      ];

      const result = validateResponseData(data);
      expect(result.valid).toBe(false);
    });

    it('should warn about duplicate person-item pairs', () => {
      const data: ResponseData[] = [
        { person_id: 'p1', item_id: 'i1', response: 1 },
        { person_id: 'p1', item_id: 'i1', response: 0 } // duplicate
      ];

      const result = validateResponseData(data);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateItemMetadata', () => {
    it('should accept valid item metadata', () => {
      const items: ItemMetadata[] = [
        { item_id: 'i1', item_type: 'binary' },
        { item_id: 'i2', item_type: 'ordinal', categories: [1, 2, 3, 4, 5] }
      ];

      const result = validateItemMetadata(items);
      expect(result.valid).toBe(true);
    });

    it('should reject duplicate item IDs', () => {
      const items: ItemMetadata[] = [
        { item_id: 'i1', item_type: 'binary' },
        { item_id: 'i1', item_type: 'binary' }
      ];

      const result = validateItemMetadata(items);
      expect(result.valid).toBe(false);
    });

    it('should warn about ordinal items without categories', () => {
      const items: ItemMetadata[] = [
        { item_id: 'i1', item_type: 'ordinal' }
      ];

      const result = validateItemMetadata(items);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('generateDataSummary', () => {
    it('should generate correct summary statistics', () => {
      const responses: ResponseData[] = [
        { person_id: 'p1', item_id: 'i1', response: 1 },
        { person_id: 'p1', item_id: 'i2', response: 0 },
        { person_id: 'p2', item_id: 'i1', response: 1 },
        { person_id: 'p2', item_id: 'i2', response: 1 }
      ];

      const items: ItemMetadata[] = [
        { item_id: 'i1', item_type: 'binary' },
        { item_id: 'i2', item_type: 'binary' }
      ];

      const summary = generateDataSummary(responses, items);

      expect(summary.n_persons).toBe(2);
      expect(summary.n_items).toBe(2);
      expect(summary.n_responses).toBe(4);
      expect(summary.missing_rate).toBe(0);
      expect(summary.item_summaries).toHaveLength(2);
    });

    it('should calculate item statistics correctly', () => {
      const responses: ResponseData[] = [
        { person_id: 'p1', item_id: 'i1', response: 1 },
        { person_id: 'p2', item_id: 'i1', response: 0 },
        { person_id: 'p3', item_id: 'i1', response: 1 }
      ];

      const items: ItemMetadata[] = [
        { item_id: 'i1', item_type: 'binary' }
      ];

      const summary = generateDataSummary(responses, items);
      const itemSummary = summary.item_summaries[0];

      expect(itemSummary.n_responses).toBe(3);
      expect(itemSummary.mean).toBeCloseTo(0.667, 2);
    });
  });

  describe('checkDataQuality', () => {
    it('should warn about high missing rates', () => {
      const summary = {
        n_persons: 100,
        n_items: 20,
        n_responses: 1200, // 40% missing
        missing_rate: 0.4,
        item_summaries: []
      };

      const result = checkDataQuality(summary);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('missing rate'))).toBe(true);
    });

    it('should warn about sparse categories', () => {
      const summary = {
        n_persons: 100,
        n_items: 1,
        n_responses: 100,
        missing_rate: 0,
        item_summaries: [{
          item_id: 'i1',
          item_type: 'ordinal' as const,
          n_responses: 100,
          missing_rate: 0,
          sparse_categories: [1, 5]
        }]
      };

      const result = checkDataQuality(summary);
      expect(result.warnings.some(w => w.includes('sparse categories'))).toBe(true);
    });
  });
});
