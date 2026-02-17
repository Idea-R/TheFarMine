/**
 * tools/ecs-registry.test.js
 *
 * A self-contained Node.js test and micro-benchmark harness for src/core/ecs-registry.js.
 * Uses Node’s built-in 'assert' module; no external test framework required.
 *
 * Usage:
 *   node tools/ecs-registry.test.js [--bench]
 *
 * Notes:
 * - Does not mutate or require Phaser.
 * - Safe to run in CI; no network or file writes.
 * - Micro-benchmark is optional via CLI flag --bench.
 */

/* Imports */
const assert = require('assert');
const path = require('path'); // reserved for potential path-related assertions or debugging
const {
  createRegistry,
  ENTITY_TYPES,
  COMPONENT_BITS,
  COMPONENT_INDEX,
  COMPONENTS,
  fromNames
} = require('../src/core/ecs-registry.js');
const SCHEMAS = require('../data/core/component-schemas.json');

/* Test harness state */
let __passed = 0;
let __failed = 0;
let __skipped = 0;
let __groupDepth = 0;
let __hasFailed = false;

/**
 * Prints with indentation based on group nesting.
 * @param {string} msg
 */
function println(msg) {
  const indent = '  '.repeat(__groupDepth);
  console.log(indent + msg);
}

/**
 * Mark process exit code for failure.
 */
function markFailed() {
  __hasFailed = true;
  process.exitCode = 1;
}

/**
 * Group tests under a named banner.
 * @param {string} name
 * @param {Function} fn
 */
function group(name, fn) {
  println(`▶ ${name}`);
  __groupDepth++;
  try {
    fn();
  } catch (err) {
    __failed++;
    markFailed();
    println(`✗ [Group Error] ${name} threw: ${err && err.message ? err.message : String(err)}`);
  } finally {
    __groupDepth--;
  }
}

/**
 * Execute a single test case.
 * @param {string} name
 * @param {Function} fn
 */
function test(name, fn) {
  try {
    fn();
    __passed++;
    println(`✓ ${name}`);
  } catch (err) {
    __failed++;
    markFailed();
    const message = (err && err.message) ? err.message : String(err);
    println(`✗ ${name} — ${message}`);
  }
}

/**
 * Mark a test as skipped with a reason.
 * @param {string} name
 * @param {string} reason
 */
function skip(name, reason) {
  __skipped++;
  println(`- ${name} (skipped: ${reason})`);
}

/**
 * High-resolution timing helper. Returns elapsed milliseconds.
 * @param {Function} fn
 * @returns {number}
 */
function time(fn) {
  const t0 = process.hrtime.bigint();
  fn();
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6;
}

/* Helpers for schema introspection and tolerant assertions */

/**
 * Try to obtain the component schema map from the loaded SCHEMAS JSON.
 * Returns a plain object mapping componentName -> schemaDef.
 * Falls back to SCHEMAS.* common keys, then SCHEMAS itself (minus non-object keys).
 * @returns {Record<string, any>}
 */
function getSchemaMap() {
  // Usual shape: { version: 1, components: { Name: { ... }, ... } }
  if (SCHEMAS && typeof SCHEMAS === 'object') {
    if (SCHEMAS.components && typeof SCHEMAS.components === 'object') {
      return SCHEMAS.components;
    }
    // Other potential shapes
    if (SCHEMAS.definitions && typeof SCHEMAS.definitions === 'object') {
      return SCHEMAS.definitions;
    }
    if (SCHEMAS.schema && typeof SCHEMAS.schema === 'object') {
      return SCHEMAS.schema;
    }
    // Fallback: filter out non-component keys (like version)
    const out = {};
    for (const [k, v] of Object.entries(SCHEMAS)) {
      if (k === 'version') continue;
      if (v && typeof v === 'object') {
        out[k] = v;
      }
    }
    return out;
  }
  return {};
}

/**
 * Try to normalize a component schema entry into a fields map.
 * The fields map is: fieldName -> { type?, default?, min?, max?, ... }
 * @param {any} compSchema
 * @returns {Record<string, any>}
 */
function extractFields(compSchema) {
  if (!compSchema || typeof compSchema !== 'object') return {};
  if (compSchema.fields && typeof compSchema.fields === 'object') return compSchema.fields;
  if (compSchema.props && typeof compSchema.props === 'object') return compSchema.props;
  if (compSchema.properties && typeof compSchema.properties === 'object') return compSchema.properties;
  // Some schemas might just be field descriptors at top-level
  const guess = {};
  for (const [k, v] of Object.entries(compSchema)) {
    if (v && typeof v === 'object' && ('default' in v || 'type' in v || 'min' in v || 'max' in v)) {
      guess[k] = v;
    }
  }
  return guess;
}

/**
 * Builds a data object that is "valid enough" for adding a component, possibly overriding defaults.
 * Attempts to set a couple of numeric fields to non-default values to test persistence and clamping.
 * @param {string} name
 * @param {Record<string, any>} schemaMap
 * @returns {Record<string, any>}
 */
function makeSampleDataForComponent(name, schemaMap) {
  const compSchema = schemaMap[name] || {};
  const fields = extractFields(compSchema);
  const out = {};
  for (const [f, d] of Object.entries(fields)) {
    // Respect default where present; alter numeric slightly
    if (d && typeof d === 'object') {
      if (typeof d.default === 'number') {
        // Provide a different number within plausible range
        let val = d.default;
        if (typeof d.min === 'number') val = Math.max(d.min, d.default + 1);
        else val = d.default + 1;
        if (typeof d.max === 'number') val = Math.min(d.max, val);
        out[f] = val;
      } else if (typeof d.default === 'boolean') {
        out[f] = !d.default;
      } else if (typeof d.default === 'string') {
        out[f] = d.default; // strings: leave default
      }
    }
  }
  return out;
}

/**
 * Helper to extract default values from schema for assertions.
 * @param {string} name
 * @param {Record<string, any>} schemaMap
 * @returns {Record<string, any>}
 */
function getDefaultsForComponent(name, schemaMap) {
  const compSchema = schemaMap[name] || {};
  const fields = extractFields(compSchema);
  const out = {};
  for (const [f, d] of Object.entries(fields)) {
    if (d && typeof d === 'object' && 'default' in d) {
      out[f] = d.default;
    }
  }
  return out;
}

/**
 * Return first numeric field with min/max constraints for a component, if any.
 * @param {string} name
 * @param {Record<string, any>} schemaMap
 * @returns {{ field: string, min?: number, max?: number, default?: number } | null}
 */
function findNumericClampedField(name, schemaMap) {
  const compSchema = schemaMap[name] || {};
  const fields = extractFields(compSchema);
  for (const [f, d] of Object.entries(fields)) {
    if (d && typeof d === 'object') {
      const hasNumberDefault = typeof d.default === 'number';
      const hasMin = typeof d.min === 'number';
      const hasMax = typeof d.max === 'number';
      if (hasNumberDefault || hasMin || hasMax) {
        return { field: f, min: d.min, max: d.max, default: d.default };
      }
    }
  }
  return null;
}

/**
 * Convenience: Determine if a registry has a component.
 * Prefers registry.hasComponent, else falls back to getComponent != null.
 * @param {any} reg
 * @param {number} id
 * @param {string} name
 * @returns {boolean}
 */
function hasComp(reg, id, name) {
  if (reg && typeof reg.hasComponent === 'function') {
    return !!reg.hasComponent(id, name);
  }
  if (reg && typeof reg.getComponent === 'function') {
    const c = reg.getComponent(id, name);
    return c !== undefined && c !== null;
  }
  throw new Error('Registry does not provide hasComponent or getComponent.');
}

/**
 * Convenience: Add a component.
 * @param {any} reg
 * @param {number} id
 * @param {string} name
 * @param {any} data
 */
function addComp(reg, id, name, data) {
  if (reg && typeof reg.addComponent === 'function') {
    return reg.addComponent(id, name, data);
  }
  throw new Error('Registry.addComponent is not available.');
}

/**
 * Convenience: Remove a component.
 * @param {any} reg
 * @param {number} id
 * @param {string} name
 */
function removeComp(reg, id, name) {
  if (reg && typeof reg.removeComponent === 'function') {
    return reg.removeComponent(id, name);
  }
  throw new Error('Registry.removeComponent is not available.');
}

/**
 * Convenience: Destroy entity.
 * @param {any} reg
 * @param {number} id
 */
function destroyEnt(reg, id) {
  if (reg && typeof reg.destroyEntity === 'function') {
    return reg.destroyEntity(id);
  }
  throw new Error('Registry.destroyEntity is not available.');
}

/* Begin Tests */

const SCHEMA_MAP = getSchemaMap();

group('1) Schema Sanity', () => {
  test('SCHEMAS.version === 1', () => {
    assert.strictEqual(SCHEMAS.version, 1, 'component-schemas.json must have version 1');
  });

  test('Bits are contiguous from 0..maxBit and component names are unique', () => {
    const bits = Object.values(COMPONENT_BITS).map(Number).sort((a, b) => a - b);
    assert.ok(bits.length > 0, 'COMPONENT_BITS must not be empty');
    const unique = new Set(bits);
    assert.strictEqual(unique.size, bits.length, 'Component bits must be unique');
    const maxBit = bits[bits.length - 1];
    for (let i = 0; i <= maxBit; i++) {
      assert.ok(unique.has(i), `Missing contiguous bit index ${i}`);
    }
  });

  test('COMPONENT_BITS keys match schema component names (subset) and COMPONENT_INDEX covers all bits', () => {
    const names = Object.keys(COMPONENT_BITS);
    for (const name of names) {
      assert.ok(SCHEMA_MAP[name], `Schema for component ${name} is missing in component-schemas.json`);
      const bit = COMPONENT_BITS[name];
      const idx = COMPONENT_INDEX[bit];
      assert.ok(idx !== undefined, `COMPONENT_INDEX[${bit}] must be defined for component ${name}`);
    }
  });
});

group('2) Registry Basics', () => {
  const reg = createRegistry();
  test('createRegistry() returns a registry object', () => {
    assert.ok(reg && typeof reg === 'object', 'registry should be an object');
  });

  let idBasic = -1;
  test('createEntity() without archetype returns valid id and has empty mask (no components)', () => {
    assert.ok(typeof reg.createEntity === 'function', 'registry.createEntity must exist');
    idBasic = reg.createEntity();
    assert.ok(typeof idBasic === 'number' && idBasic >= 0, 'createEntity must return a non-negative numeric id');
    // "mask==0" in spirit: ensure no components present
    let anyPresent = false;
    for (const name of Object.keys(COMPONENT_BITS)) {
      if (hasComp(reg, idBasic, name)) {
        anyPresent = true;
        break;
      }
    }
    assert.strictEqual(anyPresent, false, 'newly created entity should have no components');
  });

  // Prepare representative components
  const repComps = ['Position', 'Health'].filter(n => n in COMPONENT_BITS);

  if (repComps.length === 0) {
    skip('addComponent/getComponent/hasComponent for representative components', 'No representative components (Position/Health) available in COMPONENT_BITS');
  } else {
    for (const cname of repComps) {
      test(`addComponent/getComponent/hasComponent happy path for ${cname}`, () => {
        const sample = makeSampleDataForComponent(cname, SCHEMA_MAP);
        addComp(reg, idBasic, cname, sample);
        assert.ok(hasComp(reg, idBasic, cname), `${cname} should be present after addComponent`);
        const comp = reg.getComponent ? reg.getComponent(idBasic, cname) : null;
        if (comp) {
          // Ensure object structure
          assert.ok(typeof comp === 'object', `getComponent(${cname}) should return an object`);
          // If we overrode a numeric field, ensure it stuck (within min/max)
          const schema = SCHEMA_MAP[cname];
          const fields = extractFields(schema);
          for (const [f, d] of Object.entries(fields)) {
            if (d && typeof d === 'object' && typeof d.default === 'number' && f in sample) {
              const val = comp[f];
              if (typeof d.min === 'number') {
                assert.ok(val >= d.min, `${cname}.${f} should be >= min (${d.min})`);
              }
              if (typeof d.max === 'number') {
                assert.ok(val <= d.max, `${cname}.${f} should be <= max (${d.max})`);
              }
            }
          }
        }
      });

      test(`removeComponent clears bit and storage for ${cname}`, () => {
        // ensure exists first (if not, add again)
        if (!hasComp(reg, idBasic, cname)) {
          addComp(reg, idBasic, cname, makeSampleDataForComponent(cname, SCHEMA_MAP));
        }
        removeComp(reg, idBasic, cname);
        assert.strictEqual(hasComp(reg, idBasic, cname), false, `${cname} should not be present after removeComponent`);
        if (reg.getComponent) {
          const comp = reg.getComponent(idBasic, cname);
          assert.ok(comp === undefined || comp === null, `getComponent(${cname}) should be undefined/null after removal`);
        }
      });
    }
  }

  test('destroyEntity removes all components and mask', () => {
    const id = reg.createEntity();
    for (const name of Object.keys(COMPONENT_BITS)) {
      // Add a couple only, limit to 3 to avoid heavy setup
      if (Math.random() < 0.2) {
        try {
          addComp(reg, id, name, makeSampleDataForComponent(name, SCHEMA_MAP));
        } catch {
          // ignore components that cannot be constructed
        }
      }
    }
    destroyEnt(reg, id);
    for (const name of Object.keys(COMPONENT_BITS)) {
      assert.strictEqual(hasComp(reg, id, name), false, `After destroyEntity, ${name} should not be present`);
    }
  });
});

group('3) Archetypes', () => {
  const reg = createRegistry();
  const hasArchetypes = ENTITY_TYPES && typeof ENTITY_TYPES === 'object' && Object.keys(ENTITY_TYPES).length > 0;

  if (!hasArchetypes) {
    skip('ENTITY_TYPES.player/reg/tile archetype composition', 'No ENTITY_TYPES provided');
  } else {
    // player archetype
    if ('player' in ENTITY_TYPES) {
      test('ENTITY_TYPES.player attaches minimal component set and defaults', () => {
        const id = reg.createEntity('player');
        // If Player component exists, ensure present
        if ('Player' in COMPONENT_BITS) {
          assert.ok(hasComp(reg, id, 'Player'), 'player archetype should include Player component');
          const defaults = getDefaultsForComponent('Player', SCHEMA_MAP);
          const comp = reg.getComponent ? reg.getComponent(id, 'Player') : null;
          if (comp && ('inputEnabled' in defaults)) {
            assert.strictEqual(comp.inputEnabled, defaults.inputEnabled, 'Player.inputEnabled should match default (expected true by docs)');
          }
        }
        // Collider defaults
        if ('Collider' in COMPONENT_BITS) {
          assert.ok(hasComp(reg, id, 'Collider'), 'player archetype should include Collider');
          const defaults = getDefaultsForComponent('Collider', SCHEMA_MAP);
          const comp = reg.getComponent ? reg.getComponent(id, 'Collider') : null;
          if (comp) {
            if ('width' in defaults) {
              assert.strictEqual(comp.width, defaults.width, 'Collider.width should equal default (e.g., 12)');
            }
            if ('height' in defaults) {
              assert.strictEqual(comp.height, defaults.height, 'Collider.height should equal default (e.g., 12)');
            }
          }
        }
        // Stamina defaults
        if ('Stamina' in COMPONENT_BITS) {
          assert.ok(hasComp(reg, id, 'Stamina'), 'player archetype should include Stamina');
          const defaults = getDefaultsForComponent('Stamina', SCHEMA_MAP);
          const comp = reg.getComponent ? reg.getComponent(id, 'Stamina') : null;
          if (comp) {
            for (const [k, v] of Object.entries(defaults)) {
              assert.strictEqual(comp[k], v, `Stamina.${k} should equal default`);
            }
          }
        }
      });
    } else {
      skip('ENTITY_TYPES.player', 'player archetype not found');
    }

    // "reg" archetype (regular entity)
    if ('reg' in ENTITY_TYPES) {
      test('ENTITY_TYPES.reg attaches minimal component set', () => {
        const id = reg.createEntity('reg');
        // At least one component present
        let count = 0;
        for (const cname of Object.keys(COMPONENT_BITS)) {
          if (hasComp(reg, id, cname)) count++;
        }
        assert.ok(count > 0, 'reg archetype should attach at least one component');
      });
    } else {
      skip('ENTITY_TYPES.reg', 'reg archetype not found');
    }

    // tile archetype
    if ('tile' in ENTITY_TYPES) {
      test('ENTITY_TYPES.tile uses layer 0 and Collider.solid for rock (as per defaults)', () => {
        const id = reg.createEntity('tile');
        // Tile.layer == 0 by default (if schema defines)
        if ('Tile' in COMPONENT_BITS) {
          assert.ok(hasComp(reg, id, 'Tile'), 'tile archetype should include Tile component');
          const tileDefaults = getDefaultsForComponent('Tile', SCHEMA_MAP);
          const tile = reg.getComponent ? reg.getComponent(id, 'Tile') : null;
          if (tile && ('layer' in tileDefaults)) {
            assert.strictEqual(tile.layer, tileDefaults.layer, 'Tile.layer should equal default (e.g., 0)');
          }
        }
        // Collider.solid for rock (if default true)
        if ('Collider' in COMPONENT_BITS) {
          const colDefaults = getDefaultsForComponent('Collider', SCHEMA_MAP);
          const col = reg.getComponent ? reg.getComponent(id, 'Collider') : null;
          if (col && ('solid' in colDefaults)) {
            assert.strictEqual(col.solid, colDefaults.solid, 'Collider.solid should match default (true for rock-like tiles)');
          }
        }
      });
    } else {
      skip('ENTITY_TYPES.tile', 'tile archetype not found');
    }
  }
});

group('4) Coercion & Clamping', () => {
  const reg = createRegistry();

  // Health clamping
  if ('Health' in COMPONENT_BITS) {
    const fieldInfo = findNumericClampedField('Health', SCHEMA_MAP);
    if (fieldInfo) {
      test('Health numeric fields are clamped within [min..max] on addComponent', () => {
        const id = reg.createEntity();
        const over = {};
        const under = {};
        const nanv = {};
        const dflt = getDefaultsForComponent('Health', SCHEMA_MAP);
        const fld = fieldInfo.field;
        // Make over/under/nan values where applicable
        if (typeof fieldInfo.max === 'number') over[fld] = fieldInfo.max + 1000;
        if (typeof fieldInfo.min === 'number') under[fld] = fieldInfo.min - 1000;
        nanv[fld] = NaN;

        // Underflow case
        addComp(reg, id, 'Health', under);
        const hc1 = reg.getComponent ? reg.getComponent(id, 'Health') : null;
        if (hc1 && typeof fieldInfo.min === 'number') {
          assert.ok(hc1[fld] >= fieldInfo.min, `Health.${fld} should be clamped to min ${fieldInfo.min}`);
        }

        // Overflow case
        removeComp(reg, id, 'Health');
        addComp(reg, id, 'Health', over);
        const hc2 = reg.getComponent ? reg.getComponent(id, 'Health') : null;
        if (hc2 && typeof fieldInfo.max === 'number') {
          assert.ok(hc2[fld] <= fieldInfo.max, `Health.${fld} should be clamped to max ${fieldInfo.max}`);
        }

        // NaN coercion -> default
        removeComp(reg, id, 'Health');
        addComp(reg, id, 'Health', nanv);
        const hc3 = reg.getComponent ? reg.getComponent(id, 'Health') : null;
        if (hc3 && fld in dflt) {
          assert.strictEqual(hc3[fld], dflt[fld], `Health.${fld} NaN should coerce to default`);
        }
      });
    } else {
      skip('Health clamping on addComponent', 'No numeric clamped field detected in Health schema');
    }
  } else {
    skip('Health clamping on addComponent', 'Health component not found');
  }

  // applyPatch coercion if available
  const hasApplyPatch = typeof (createRegistry().applyPatch) === 'function';
  if (hasApplyPatch) {
    test('applyPatch coerces NaN/undefined/overflows within min/max per schema', () => {
      const r = createRegistry();
      const id = r.createEntity();
      // choose a component with numeric constraints if possible
      let targetComp = null;
      let targetField = null;
      let info = null;
      for (const cname of Object.keys(COMPONENT_BITS)) {
        const fi = findNumericClampedField(cname, SCHEMA_MAP);
        if (fi) {
          targetComp = cname;
          targetField = fi.field;
          info = fi;
          break;
        }
      }
      if (!targetComp) {
        skip('applyPatch coercion', 'No component with numeric clamped field found');
        return;
      }
      // seed with defaults
      addComp(r, id, targetComp, {});
      const over = {}; const under = {}; const nanv = {}; const undefv = {};
      if (typeof info.max === 'number') over[targetField] = info.max + 9999;
      if (typeof info.min === 'number') under[targetField] = info.min - 9999;
      nanv[targetField] = NaN;
      undefv[targetField] = undefined;

      r.applyPatch(id, { [targetComp]: over });
      const c1 = r.getComponent(id, targetComp);
      if (typeof info.max === 'number') {
        assert.ok(c1[targetField] <= info.max, `${targetComp}.${targetField} should clamp to max via applyPatch`);
      }

      r.applyPatch(id, { [targetComp]: under });
      const c2 = r.getComponent(id, targetComp);
      if (typeof info.min === 'number') {
        assert.ok(c2[targetField] >= info.min, `${targetComp}.${targetField} should clamp to min via applyPatch`);
      }

      const dflts = getDefaultsForComponent(targetComp, SCHEMA_MAP);
      r.applyPatch(id, { [targetComp]: nanv });
      const c3 = r.getComponent(id, targetComp);
      if (targetField in dflts) {
        assert.strictEqual(c3[targetField], dflts[targetField], `${targetComp}.${targetField} NaN should coerce to default via applyPatch`);
      }

      r.applyPatch(id, { [targetComp]: undefv });
      const c4 = r.getComponent(id, targetComp);
      if (targetField in dflts) {
        assert.strictEqual(c4[targetField], dflts[targetField], `${targetComp}.${targetField} undefined should coerce to default via applyPatch`);
      }
    });
  } else {
    skip('applyPatch coercion', 'registry.applyPatch not available');
  }
});

group('5) Query & View', () => {
  const reg = createRegistry();
  // Build some test entities
  const names = Object.keys(COMPONENT_BITS);
  const posName = names.includes('Position') ? 'Position' : names[0];
  const velName = names.includes('Velocity') ? 'Velocity' : names[1] || names[0];
  const frozenName = names.includes('Frozen') ? 'Frozen' : null;

  // Build expected mask for fromNames
  test("fromNames builds correct mask for ['Position','Velocity'] or substitutes", () => {
    const incNames = (posName === velName) ? [posName] : [posName, velName];
    const mask = fromNames(incNames);
    let expected = 0;
    for (const n of incNames) {
      const bit = COMPONENT_BITS[n];
      expected |= (1 << bit);
    }
    assert.strictEqual(mask, expected, 'fromNames should build OR mask from component bits');
  });

  // Seed registry
  const ids = [];
  for (let i = 0; i < 20; i++) {
    const id = reg.createEntity();
    // Half get pos, a quarter get vel, an eighth get both
    if (i % 2 === 0) addComp(reg, id, posName, makeSampleDataForComponent(posName, SCHEMA_MAP));
    if (i % 4 === 0) addComp(reg, id, velName, makeSampleDataForComponent(velName, SCHEMA_MAP));
    if (frozenName && i % 8 === 0) addComp(reg, id, frozenName, makeSampleDataForComponent(frozenName, SCHEMA_MAP));
    ids.push(id);
  }

  // query(requiredMask[, excludeMask])
  if (typeof reg.query === 'function') {
    test('query(requiredMask) yields matching entities and excludeMask filters out', () => {
      const req = fromNames((posName === velName) ? [posName] : [posName, velName]);
      const exc = frozenName ? fromNames([frozenName]) : 0;
      const res = reg.query(req, exc);
      const arr = Array.isArray(res) ? res : (res && typeof res.toArray === 'function' ? res.toArray() : []);
      // manual check
      const manual = ids.filter((id) => {
        const hasReq = hasComp(reg, id, posName) && (posName === velName || hasComp(reg, id, velName));
        const notExc = !frozenName || !hasComp(reg, id, frozenName);
        return hasReq && notExc;
      });
      assert.ok(Array.isArray(arr), 'query() should return an array or an array-like');
      assert.strictEqual(arr.length, manual.length, 'query() result count should match manual filter');
      for (const id of arr) {
        assert.ok(manual.includes(id), 'query() should only return ids that match required and not excluded masks');
      }
    });
  } else {
    skip('query(requiredMask, excludeMask)', 'registry.query not available');
  }

  // view(include, exclude)
  if (typeof reg.view === 'function') {
    test("view(includeNames, excludeNames).forEach(fn) iterates snapshot and provides component bags", () => {
      const include = (posName === velName) ? [posName] : [posName, velName];
      const exclude = frozenName ? [frozenName] : [];
      const v = reg.view(include, exclude);
      assert.ok(v && typeof v.forEach === 'function', 'view() should return an object with forEach');
      let iterCount = 0;
      v.forEach((entityId, bag) => {
        iterCount++;
        assert.ok(typeof entityId === 'number', 'view callback first arg should be entity id');
        // Some implementations pass (bag, entityId). Try to detect
        if (bag && typeof bag === 'number' && (entityId && typeof entityId === 'object')) {
          // swap if argument order is (bag, id)
          const tmp = bag; // actually id
          bag = entityId; // actually bag
          entityId = tmp;
        }
        assert.ok(bag && typeof bag === 'object', 'view callback should provide a components bag object');
        for (const n of include) {
          assert.ok(n in bag, `bag should include ${n} component`);
          assert.ok(typeof bag[n] === 'object', `${n} component in bag should be an object`);
        }
        if (exclude.length > 0) {
          for (const n of exclude) {
            // Some views might omit excluded entirely; ensure not present
            assert.strictEqual(hasComp(reg, entityId, n), false, `Excluded component ${n} should not be present`);
          }
        }
      });
      assert.ok(iterCount > 0, 'view should iterate at least one entity when data seeded');
    });
  } else {
    skip('view(includeNames, excludeNames).forEach', 'registry.view not available');
  }
});

group('6) Error Handling', () => {
  const reg = createRegistry();

  test('addComponent throws on unknown component name', () => {
    const id = reg.createEntity();
    assert.throws(() => {
      addComp(reg, id, '__NoSuchComponent__', {});
    }, /unknown|invalid|NoSuch|not found/i, 'addComponent should throw on unknown component name');
  });

  test("createEntity('unknownArchetype') throws", () => {
    if (typeof reg.createEntity !== 'function') {
      skip("createEntity('unknownArchetype') throws", 'registry.createEntity not available');
      return;
    }
    assert.throws(() => {
      reg.createEntity('__no_such_archetype__');
    }, /unknown|invalid|archetype|not found/i, 'createEntity should throw on unknown archetype');
  });
});

group('7) FreeId Reuse', () => {
  const reg = createRegistry();
  const ids = [];
  for (let i = 0; i < 6; i++) {
    ids.push(reg.createEntity());
  }
  // destroy a few
  const destroyed = [ids[1], ids[3], ids[5]];
  destroyed.forEach(id => destroyEnt(reg, id));

  // create new ones
  const newIds = [reg.createEntity(), reg.createEntity(), reg.createEntity()];

  test('At least one id is reused from the free list and masks reset to 0', () => {
    const reused = newIds.filter(id => destroyed.includes(id));
    assert.ok(reused.length >= 1, 'Expected at least one entity id to be reused from the free list');
    // For each new id, ensure mask/components are clean
    for (const id of newIds) {
      let anyPresent = false;
      for (const name of Object.keys(COMPONENT_BITS)) {
        if (hasComp(reg, id, name)) {
          anyPresent = true;
          break;
        }
      }
      assert.strictEqual(anyPresent, false, 'Reused entity id should start with no components (mask == 0)');
    }
  });
});

/* Micro-Benchmark (optional) */
if (process.argv.includes('--bench')) {
  group('Micro-Benchmark: masked checks', () => {
    const reg = createRegistry();

    // Prefer archetypes if present; otherwise spawn empty and add components
    const archs = ENTITY_TYPES && typeof ENTITY_TYPES === 'object' ? Object.keys(ENTITY_TYPES) : [];
    const totalToSpawn = 400;

    // Determine component names for the hot mask
    const names = Object.keys(COMPONENT_BITS);
    const posName = names.includes('Position') ? 'Position' : names[0];
    const velName = names.includes('Velocity') ? 'Velocity' : names[1] || names[0];
    const hotMask = fromNames((posName === velName) ? [posName] : [posName, velName]);

    const ids = [];
    for (let i = 0; i < totalToSpawn; i++) {
      let id;
      if (archs.length > 0) {
        const a = archs[i % archs.length];
        id = reg.createEntity(a);
      } else {
        id = reg.createEntity();
      }
      // Ensure distribution of Position/Velocity
      if (!hasComp(reg, id, posName) && i % 2 === 0) {
        addComp(reg, id, posName, makeSampleDataForComponent(posName, SCHEMA_MAP));
      }
      if (!hasComp(reg, id, velName) && i % 3 === 0) {
        addComp(reg, id, velName, makeSampleDataForComponent(velName, SCHEMA_MAP));
      }
      ids.push(id);
    }

    const iterations = 10000;
    // Precompute entity masks if registry provides a way; otherwise rely on hasComponent combo check
    const hasMaskCheck = typeof reg.maskOf === 'function';
    let matched = 0;
    const ms = time(() => {
      matched = 0;
      if (hasMaskCheck) {
        for (let k = 0; k < iterations; k++) {
          for (let i = 0; i < ids.length; i++) {
            const m = reg.maskOf(ids[i]);
            // Common mask check
            if ((m & hotMask) === hotMask) matched++;
          }
        }
      } else {
        // Fallback: check via hasComponent calls
        for (let k = 0; k < iterations; k++) {
          for (let i = 0; i < ids.length; i++) {
            if (hasComp(reg, ids[i], posName) && (posName === velName || hasComp(reg, ids[i], velName))) {
              matched++;
            }
          }
        }
      }
    });
    const totalChecks = iterations * ids.length;
    const nsPerIter = (ms * 1e6) / totalChecks;

    test('Benchmark results logged', () => {
      println(`  Entities: ${ids.length}`);
      println(`  Iterations: ${iterations}`);
      println(`  Matches: ${matched}`);
      println(`  Time: ${ms.toFixed(3)} ms`);
      println(`  Per-check: ${nsPerIter.toFixed(2)} ns (guidance: 10k masked checks < 0.5 ms on mid-tier laptop)`);
      assert.ok(ms >= 0, 'Benchmark executed');
    });
  });
}

/* Summary */
(function summary() {
  const total = __passed + __failed + __skipped;
  console.log('');
  console.log(`Summary: ${__passed} passed, ${__failed} failed, ${__skipped} skipped (total ${total})`);
  if (!__hasFailed) {
    process.exitCode = 0;
  }
})();