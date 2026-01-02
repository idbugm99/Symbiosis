/**
 * Strict Validator Tests
 * Tests for strictValidateWidgetDefinition and validateWidgetArray
 */

import { describe, it, expect, vi } from 'vitest';
import {
  strictValidateWidgetDefinition,
  validateWidgetArray
} from './validators.js';

describe('strictValidateWidgetDefinition', () => {
  const validWidget = {
    id: 'test-widget',
    name: 'Test Widget',
    icon: 'fa-test',
    type: 'widget',
    cols: 2,
    rows: 2,
    category: 'productivity'
  };

  describe('Valid widgets', () => {
    it('should return true for valid widget definition', () => {
      expect(strictValidateWidgetDefinition(validWidget)).toBe(true);
    });

    it('should accept widget type', () => {
      expect(strictValidateWidgetDefinition({ ...validWidget, type: 'widget' })).toBe(true);
    });

    it('should accept app type', () => {
      expect(strictValidateWidgetDefinition({ ...validWidget, type: 'app' })).toBe(true);
    });

    it('should accept minimum dimensions (1x1)', () => {
      expect(strictValidateWidgetDefinition({ ...validWidget, cols: 1, rows: 1 })).toBe(true);
    });

    it('should accept maximum dimensions (6x5)', () => {
      expect(strictValidateWidgetDefinition({ ...validWidget, cols: 6, rows: 5 })).toBe(true);
    });
  });

  describe('Invalid object types', () => {
    it('should throw error for null', () => {
      expect(() => strictValidateWidgetDefinition(null)).toThrow('Widget definition must be an object');
    });

    it('should throw error for undefined', () => {
      expect(() => strictValidateWidgetDefinition(undefined)).toThrow('Widget definition must be an object');
    });

    it('should throw error for non-object', () => {
      expect(() => strictValidateWidgetDefinition('not an object')).toThrow('Widget definition must be an object');
    });

    it('should throw error for array', () => {
      expect(() => strictValidateWidgetDefinition([])).toThrow('Widget definition must be an object');
    });
  });

  describe('Missing required fields', () => {
    it('should throw error for missing id', () => {
      const widget = { ...validWidget };
      delete widget.id;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*id/);
    });

    it('should throw error for missing name', () => {
      const widget = { ...validWidget };
      delete widget.name;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*name/);
    });

    it('should throw error for missing icon', () => {
      const widget = { ...validWidget };
      delete widget.icon;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*icon/);
    });

    it('should throw error for missing type', () => {
      const widget = { ...validWidget };
      delete widget.type;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*type/);
    });

    it('should throw error for missing cols', () => {
      const widget = { ...validWidget };
      delete widget.cols;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*cols/);
    });

    it('should throw error for missing rows', () => {
      const widget = { ...validWidget };
      delete widget.rows;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*rows/);
    });

    it('should throw error for missing category', () => {
      const widget = { ...validWidget };
      delete widget.category;
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields.*category/);
    });

    it('should throw error for multiple missing fields', () => {
      const widget = { id: 'test' };
      expect(() => strictValidateWidgetDefinition(widget)).toThrow(/missing required fields/);
    });
  });

  describe('Invalid type field', () => {
    it('should throw error for invalid type', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, type: 'invalid' })).toThrow(/invalid type.*Must be "widget" or "app"/);
    });

    it('should throw error for numeric type', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, type: 123 })).toThrow(/invalid type/);
    });

    it('should throw error for null type', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, type: null })).toThrow(/invalid type/);
    });
  });

  describe('Invalid dimensions', () => {
    it('should throw error for cols < 1', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, cols: 0 })).toThrow(/invalid cols.*Must be 1-6/);
    });

    it('should throw error for cols > 6', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, cols: 7 })).toThrow(/invalid cols.*Must be 1-6/);
    });

    it('should throw error for rows < 1', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, rows: 0 })).toThrow(/invalid rows.*Must be 1-5/);
    });

    it('should throw error for rows > 5', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, rows: 6 })).toThrow(/invalid rows.*Must be 1-5/);
    });

    it('should throw error for negative cols', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, cols: -1 })).toThrow(/invalid cols/);
    });

    it('should throw error for negative rows', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, rows: -1 })).toThrow(/invalid rows/);
    });
  });

  describe('Empty string fields', () => {
    it('should throw error for empty id', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, id: '' })).toThrow(/invalid or empty id/);
    });

    it('should throw error for whitespace-only id', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, id: '   ' })).toThrow(/invalid or empty id/);
    });

    it('should throw error for empty name', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, name: '' })).toThrow(/invalid or empty name/);
    });

    it('should throw error for empty icon', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, icon: '' })).toThrow(/invalid or empty icon/);
    });

    it('should throw error for empty category', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, category: '' })).toThrow(/invalid or empty category/);
    });

    it('should throw error for non-string id', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, id: 123 })).toThrow(/invalid or empty id/);
    });
  });

  describe('Error messages', () => {
    it('should include widget id in error messages when available', () => {
      expect(() => strictValidateWidgetDefinition({ ...validWidget, type: 'bad' }))
        .toThrow(/Widget "test-widget"/);
    });

    it('should use "unknown" when id is missing', () => {
      const widget = { ...validWidget };
      delete widget.id;
      expect(() => strictValidateWidgetDefinition(widget))
        .toThrow(/Widget "unknown"/);
    });

    it('should list all missing fields in error message', () => {
      const widget = { id: 'test' };
      try {
        strictValidateWidgetDefinition(widget);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('name');
        expect(error.message).toContain('icon');
        expect(error.message).toContain('type');
        expect(error.message).toContain('cols');
        expect(error.message).toContain('rows');
        expect(error.message).toContain('category');
      }
    });
  });
});

describe('validateWidgetArray', () => {
  const validWidget1 = {
    id: 'widget-1',
    name: 'Widget 1',
    icon: 'fa-test',
    type: 'widget',
    cols: 2,
    rows: 2,
    category: 'productivity'
  };

  const validWidget2 = {
    id: 'widget-2',
    name: 'Widget 2',
    icon: 'fa-test',
    type: 'app',
    cols: 3,
    rows: 3,
    category: 'utilities'
  };

  const invalidWidget = {
    id: 'invalid',
    name: 'Invalid Widget',
    // missing required fields
  };

  describe('Valid arrays', () => {
    it('should return all valid widgets', () => {
      const result = validateWidgetArray([validWidget1, validWidget2]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('widget-1');
      expect(result[1].id).toBe('widget-2');
    });

    it('should return empty array for empty input', () => {
      const result = validateWidgetArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single valid widget', () => {
      const result = validateWidgetArray([validWidget1]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('widget-1');
    });
  });

  describe('Invalid arrays', () => {
    it('should throw error for non-array input', () => {
      expect(() => validateWidgetArray(null)).toThrow('Widget definitions must be an array');
    });

    it('should throw error for undefined', () => {
      expect(() => validateWidgetArray(undefined)).toThrow('Widget definitions must be an array');
    });

    it('should throw error for object', () => {
      expect(() => validateWidgetArray({ widgets: [] })).toThrow('Widget definitions must be an array');
    });

    it('should throw error for string', () => {
      expect(() => validateWidgetArray('not an array')).toThrow('Widget definitions must be an array');
    });
  });

  describe('Filtering invalid widgets', () => {
    it('should filter out invalid widgets by default', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateWidgetArray([validWidget1, invalidWidget, validWidget2]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('widget-1');
      expect(result[1].id).toBe('widget-2');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log warning for filtered widgets', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      validateWidgetArray([validWidget1, invalidWidget, validWidget2]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 invalid widget(s) filtered out of 3')
      );

      consoleSpy.mockRestore();
    });

    it('should log error for each invalid widget', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      validateWidgetArray([invalidWidget]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Validation] Widget at index 0:')
      );

      consoleSpy.mockRestore();
    });

    it('should include index in error message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      validateWidgetArray([validWidget1, invalidWidget, validWidget2]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Widget at index 1:')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Throw on invalid mode', () => {
    it('should throw error on first invalid widget when throwOnInvalid=true', () => {
      expect(() => validateWidgetArray([validWidget1, invalidWidget, validWidget2], true))
        .toThrow(/Widget at index 1:/);
    });

    it('should not process widgets after first invalid when throwOnInvalid=true', () => {
      try {
        validateWidgetArray([validWidget1, invalidWidget, validWidget2], true);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Widget at index 1');
      }
    });

    it('should throw immediately for invalid widget at index 0', () => {
      expect(() => validateWidgetArray([invalidWidget, validWidget1], true))
        .toThrow(/Widget at index 0:/);
    });

    it('should not log to console when throwOnInvalid=true', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        validateWidgetArray([invalidWidget], true);
      } catch {
        // Expected
      }

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Mixed valid and invalid widgets', () => {
    it('should return only valid widgets from mixed array', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateWidgetArray([
        validWidget1,
        invalidWidget,
        validWidget2,
        { ...validWidget1, id: '', name: 'Invalid 2' },
        validWidget1
      ]);

      expect(result).toHaveLength(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2); // 2 invalid widgets

      consoleSpy.mockRestore();
    });

    it('should handle all invalid widgets', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateWidgetArray([invalidWidget, { id: 'bad' }]);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle widget with all fields at boundaries', () => {
      const widget = {
        id: 'a',
        name: 'A',
        icon: 'i',
        type: 'widget',
        cols: 6,
        rows: 5,
        category: 'c'
      };
      const result = validateWidgetArray([widget]);
      expect(result).toHaveLength(1);
    });

    it('should reject widget with whitespace-only strings', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const widget = {
        id: '   ',
        name: 'Test',
        icon: 'fa-test',
        type: 'widget',
        cols: 2,
        rows: 2,
        category: 'test'
      };
      const result = validateWidgetArray([widget]);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
