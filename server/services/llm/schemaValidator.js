/**
 * Zod Schema Adapter & Validator
 * Uses `zod` package if installed, with a built-in Zod-compatible API fallback
 * so `z.object`, `z.string`, `z.number`, `z.boolean`, `z.enum`, `z.array` work seamlessly
 * in any environment without crashing if optional node_modules are absent.
 */

let zodLib = null;
try {
  zodLib = require('zod');
} catch {
  zodLib = null;
}

class BaseSchema {
  constructor(type, validator, jsonType = {}) {
    this._type = type;
    this._validator = validator;
    this._jsonSchema = jsonType;
    this._isOptional = false;
    this._isNullable = false;
    this._defaultVal = undefined;
    this._description = undefined;
  }

  optional() {
    const clone = this._clone();
    clone._isOptional = true;
    return clone;
  }

  nullable() {
    const clone = this._clone();
    clone._isNullable = true;
    return clone;
  }

  default(val) {
    const clone = this._clone();
    clone._isOptional = true;
    clone._defaultVal = val;
    return clone;
  }

  describe(desc) {
    const clone = this._clone();
    clone._description = desc;
    return clone;
  }

  _clone() {
    const copy = new BaseSchema(this._type, this._validator, { ...this._jsonSchema });
    copy._isOptional = this._isOptional;
    copy._isNullable = this._isNullable;
    copy._defaultVal = this._defaultVal;
    copy._description = this._description;
    return copy;
  }

  parse(data, path = '') {
    if (data === undefined || (data === null && this._isOptional && !this._isNullable)) {
      if (this._defaultVal !== undefined) return this._defaultVal;
      if (this._isOptional) return undefined;
      throw new Error(`Validation error at ${path || 'root'}: Expected ${this._type}, received ${data}`);
    }
    if (data === null) {
      if (this._isNullable) return null;
      if (this._defaultVal !== undefined) return this._defaultVal;
      throw new Error(`Validation error at ${path || 'root'}: Expected ${this._type}, received null`);
    }
    return this._validator(data, path);
  }

  safeParse(data) {
    try {
      const parsed = this.parse(data);
      return { success: true, data: parsed };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          issues: [{ message: error.message }]
        }
      };
    }
  }

  toJSONSchema() {
    const base = { ...this._jsonSchema };
    if (this._description) base.description = this._description;
    return base;
  }
}

const fallbackZ = {
  string() {
    let minLen = null;
    let maxLen = null;
    const schema = new BaseSchema(
      'string',
      (val, path) => {
        if (typeof val !== 'string') {
          throw new Error(`Validation error at ${path || 'root'}: Expected string, received ${typeof val}`);
        }
        if (minLen !== null && val.length < minLen) {
          throw new Error(`Validation error at ${path || 'root'}: String must be at least ${minLen} chars`);
        }
        if (maxLen !== null && val.length > maxLen) {
          throw new Error(`Validation error at ${path || 'root'}: String must be at most ${maxLen} chars`);
        }
        return val;
      },
      { type: 'STRING' }
    );
    schema.min = (n) => {
      minLen = n;
      return schema;
    };
    schema.max = (n) => {
      maxLen = n;
      return schema;
    };
    return schema;
  },

  number() {
    let minVal = null;
    let maxVal = null;
    const schema = new BaseSchema(
      'number',
      (val, path) => {
        if (typeof val !== 'number' || Number.isNaN(val)) {
          throw new Error(`Validation error at ${path || 'root'}: Expected number, received ${typeof val}`);
        }
        if (minVal !== null && val < minVal) {
          throw new Error(`Validation error at ${path || 'root'}: Number must be >= ${minVal}`);
        }
        if (maxVal !== null && val > maxVal) {
          throw new Error(`Validation error at ${path || 'root'}: Number must be <= ${maxVal}`);
        }
        return val;
      },
      { type: 'NUMBER' }
    );
    schema.min = (n) => {
      minVal = n;
      return schema;
    };
    schema.max = (n) => {
      maxVal = n;
      return schema;
    };
    return schema;
  },

  boolean() {
    return new BaseSchema(
      'boolean',
      (val, path) => {
        if (typeof val !== 'boolean') {
          throw new Error(`Validation error at ${path || 'root'}: Expected boolean, received ${typeof val}`);
        }
        return val;
      },
      { type: 'BOOLEAN' }
    );
  },

  enum(values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('z.enum requires a non-empty array of strings');
    }
    return new BaseSchema(
      `enum(${values.join('|')})`,
      (val, path) => {
        if (!values.includes(val)) {
          throw new Error(
            `Validation error at ${path || 'root'}: Expected one of [${values.join(', ')}], received ${JSON.stringify(val)}`
          );
        }
        return val;
      },
      { type: 'STRING', enum: values }
    );
  },

  array(itemSchema) {
    return new BaseSchema(
      'array',
      (val, path) => {
        if (!Array.isArray(val)) {
          throw new Error(`Validation error at ${path || 'root'}: Expected array, received ${typeof val}`);
        }
        return val.map((item, idx) => itemSchema.parse(item, `${path}[${idx}]`));
      },
      {
        type: 'ARRAY',
        items: itemSchema && typeof itemSchema.toJSONSchema === 'function' ? itemSchema.toJSONSchema() : { type: 'STRING' }
      }
    );
  },

  object(shape = {}) {
    const properties = {};
    const required = [];
    for (const [k, propSchema] of Object.entries(shape)) {
      if (propSchema && typeof propSchema.toJSONSchema === 'function') {
        properties[k] = propSchema.toJSONSchema();
      }
      if (propSchema && !propSchema._isOptional) {
        required.push(k);
      }
    }

    const schema = new BaseSchema(
      'object',
      (val, path) => {
        if (typeof val !== 'object' || val === null || Array.isArray(val)) {
          throw new Error(`Validation error at ${path || 'root'}: Expected object, received ${typeof val}`);
        }
        const out = {};
        for (const [key, propSchema] of Object.entries(shape)) {
          const propPath = path ? `${path}.${key}` : key;
          const parsedVal = propSchema.parse(val[key], propPath);
          if (parsedVal !== undefined) {
            out[key] = parsedVal;
          }
        }
        return out;
      },
      {
        type: 'OBJECT',
        properties,
        ...(required.length > 0 ? { required } : {})
      }
    );
    schema.shape = shape;
    return schema;
  }
};

const z = zodLib ? zodLib.z || zodLib : fallbackZ;

/**
 * Extracts raw JSON object/array from an LLM text response that may contain markdown code fences.
 * @param {string} rawText
 * @returns {any}
 */
function parseJsonFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response when expecting JSON');
  }

  let cleaned = rawText.trim();

  // Strip ```json ... ``` fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to find first { ... } or [ ... ] block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate);
    }
    throw new Error(`Failed to parse JSON from model output: ${cleaned.slice(0, 180)}`);
  }
}

/**
 * Validates parsed data against a Zod schema (or plain shape object).
 * @param {any} data
 * @param {any} schema - Zod schema or shape object
 * @returns {any} Validated data
 */
function validateWithSchema(data, schema) {
  if (!schema) return data;

  if (typeof schema.safeParse === 'function') {
    const res = schema.safeParse(data);
    if (!res.success) {
      const msg =
        res.error?.issues?.map((i) => `${(i.path || []).join('.')}: ${i.message}`).join('; ') ||
        res.error?.message ||
        'Schema validation failed';
      throw new Error(msg);
    }
    return res.data;
  }

  if (typeof schema.parse === 'function') {
    return schema.parse(data);
  }

  // If plain object shape was passed, wrap with fallbackZ.object
  if (typeof schema === 'object') {
    return fallbackZ.object(schema).parse(data);
  }

  return data;
}

/**
 * Converts a schema into a human-readable JSON description for prompt injection.
 */
function describeSchemaForPrompt(schema) {
  if (!schema) return 'a valid JSON object';
  if (typeof schema.toJSONSchema === 'function') {
    return JSON.stringify(schema.toJSONSchema());
  }
  if (schema._def && typeof schema._def === 'object') {
    // Real zod schema introspection
    try {
      if (schema.shape) {
        const keys = Object.keys(schema.shape);
        return `JSON object with keys: ${keys.join(', ')}`;
      }
    } catch {
      // ignore
    }
  }
  return 'a valid JSON object matching the requested fields';
}

module.exports = {
  z,
  parseJsonFromText,
  validateWithSchema,
  describeSchemaForPrompt
};

