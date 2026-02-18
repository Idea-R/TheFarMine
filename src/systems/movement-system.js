'use strict';

/**
 * The Far Mine - MVP Movement System
 * Pure ESM module implementing deterministic movement integration for ECS.
 *
 * Query contract: { allOf: ["Position", "Velocity"] }
 * Determinism: Assumes registry.each(query, fn) yields ascending entity ids.
 *
 * Example:
 *   import { createMovementSystem } from './src/systems/movement-system.js';
 *   const movement = createMovementSystem({ fixedStepMs: 16 });
 *   movement.update(registry, 16);
 *
 * JSDoc Types:
 * @typedef {Object} Position
 * @property {number} x - integer tile x
 * @property {number} y - integer tile y
 * @property {number} dirDeg - integer direction in degrees [0..359]
 *
 * @typedef {Object} Velocity
 * @property {number} vx - velocity x in units/sec (finite)
 * @property {number} vy - velocity y in units/sec (finite)
 * @property {number} maxSpeed - non-negative finite max speed (int acceptable)
 *
 * @typedef {Object} Profiler
 * @property {(name:string, value:number)=>void} counter
 *
 * @typedef {Object} Registry
 * @property {(query: {allOf:string[]}, fn: (eid:number)=>void)=>void} [each]
 * @property {(query: {allOf:string[]})=>Iterable<number>|number[]} [view]
 * @property {(eid:number, key:string)=>any} get
 * @property {(eid:number, key:string, value:any)=>void} set
 *
 * @typedef {Object} System
 * @property {string} id
 * @property {{ allOf: string[] }} query
 * @property {(registry: Registry, dtMs?: number|null|undefined)=>void} update
 */

const __DEV__ = typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV !== 'production';

/**
 * Convert radians to degrees.
 * @param {number} rad
 * @returns {number}
 */
function toDegrees(rad) {
  return rad * (180 / Math.PI);
}

/**
 * Normalize degrees into [0, 360)
 * @param {number} deg
 * @returns {number}
 */
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Internal dev assertion helper.
 * Throws only in DEV builds.
 * @param {any} condition
 * @param {string} message
 */
function devAssert(condition, message) {
  if (__DEV__ && !condition) {
    throw new Error('[MovementSystem] ' + message);
  }
}

/**
 * Helper to determine finite number.
 * @param {any} n
 * @returns {boolean}
 */
function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Clamp a velocity vector to a maximum speed, preserving direction.
 *
 * - If maxSpeed is 0, returns zero velocity and speed 0.
 * - If current speed <= maxSpeed, returns original components.
 * - If over the limit, scales vx,vy to have magnitude exactly maxSpeed.
 *
 * In DEV, asserts that vx, vy are finite and maxSpeed is non-negative finite.
 * In production, non-finite inputs are coerced to safe defaults (vx/vy -> 0, maxSpeed -> 0).
 *
 * @param {number} vx
 * @param {number} vy
 * @param {number} maxSpeed
 * @returns {{ vx:number, vy:number, speed:number }}
 */
export function clampVelocity(vx, vy, maxSpeed) {
  const vxNum = Number(vx);
  const vyNum = Number(vy);
  const msNum = Number(maxSpeed);

  if (__DEV__) {
    devAssert(Number.isFinite(vxNum) && Number.isFinite(vyNum), `Velocity.vx/vy must be finite numbers. Got vx=${String(vx)}, vy=${String(vy)}`);
    devAssert(Number.isFinite(msNum) && msNum >= 0, `Velocity.maxSpeed must be a non-negative finite number. Got maxSpeed=${String(maxSpeed)}`);
  }

  const sx = Number.isFinite(vxNum) ? vxNum : 0;
  const sy = Number.isFinite(vyNum) ? vyNum : 0;

  let ms = msNum;
  if (!Number.isFinite(ms) || ms < 0) ms = 0;

  const speed = Math.hypot(sx, sy);
  if (ms === 0 || speed === 0) {
    return { vx: 0, vy: 0, speed: 0 };
  }

  if (speed <= ms) {
    return { vx: sx, vy: sy, speed };
  }

  const scale = ms / speed;
  return { vx: sx * scale, vy: sy * scale, speed: ms };
}

/**
 * Create the Movement System.
 *
 * Options:
 * - id: string (default "MovementSystem")
 * - fixedStepMs: number (default 16) — used when dtMs is null/undefined/invalid
 * - profiler?: { counter(name:string, value:number):void } (optional)
 *
 * @param {{ id?: string, fixedStepMs?: number, profiler?: Profiler }} [options]
 * @returns {System}
 */
export function createMovementSystem(options = {}) {
  const sysId = typeof options.id === 'string' && options.id.length > 0 ? options.id : 'MovementSystem';
  const fixedStepMs = isFiniteNumber(options.fixedStepMs) && options.fixedStepMs >= 0 ? options.fixedStepMs : 16;
  const profiler = options.profiler && typeof options.profiler.counter === 'function' ? options.profiler : null;

  /** @type {{ allOf: string[] }} */
  const query = Object.freeze({ allOf: ['Position', 'Velocity'] });

  // Warn-once flags (per system instance).
  let warnedLagFrame = false;

  /**
   * Update loop integrating positions based on clamped velocities.
   * @param {Registry} registry
   * @param {number|null|undefined} dtMs
   */
  function update(registry, dtMs) {
    let useDtMs = dtMs;
    if (!(typeof useDtMs === 'number' && Number.isFinite(useDtMs) && useDtMs >= 0)) {
      useDtMs = fixedStepMs;
    }

    if (__DEV__) {
      devAssert(typeof useDtMs === 'number' && Number.isFinite(useDtMs) && useDtMs >= 0, `Resolved dtMs must be a non-negative finite number. Got ${String(useDtMs)}`);
      if (useDtMs > 100 && !warnedLagFrame) {
        // Optionally warn on lag frames to surface stability issues early.
        console.warn(`[${sysId}] MovementSystem: large dtMs (${useDtMs}ms). Integration may be unstable.`);
        warnedLagFrame = true;
      }
    }

    const dtSec = useDtMs / 1000;

    // DEV: warn once per update call if a component is missing.
    let warnedMissingPos = false;
    let warnedMissingVel = false;

    let processed = 0;

    /** @param {number} eid */
    const processEntity = (eid) => {
      const pos = registry && typeof registry.get === 'function' ? registry.get(eid, 'Position') : null;
      const vel = registry && typeof registry.get === 'function' ? registry.get(eid, 'Velocity') : null;

      if (!pos || !vel) {
        if (__DEV__) {
          if (!pos && !warnedMissingPos) {
            console.warn(`[${sysId}] MovementSystem: missing Position for entity ${String(eid)} (skipped).`);
            warnedMissingPos = true;
          }
          if (!vel && !warnedMissingVel) {
            console.warn(`[${sysId}] MovementSystem: missing Velocity for entity ${String(eid)} (skipped).`);
            warnedMissingVel = true;
          }
        }
        return;
      }

      if (__DEV__) {
        devAssert(Number.isInteger(pos.x) && Number.isInteger(pos.y) && Number.isInteger(pos.dirDeg),
          `Position must have integer fields x, y, dirDeg for entity ${String(eid)}. Got ${JSON.stringify(pos)}`);
        devAssert(isFiniteNumber(vel.vx) && isFiniteNumber(vel.vy),
          `Velocity.vx/vy must be finite numbers for entity ${String(eid)}. Got ${JSON.stringify(vel)}`);
        devAssert(Number.isFinite(vel.maxSpeed) && vel.maxSpeed >= 0,
          `Velocity.maxSpeed must be a non-negative finite number for entity ${String(eid)}. Got ${JSON.stringify(vel)}`);
      }

      // 1) Clamp velocity to maxSpeed while preserving direction.
      const clamped = clampVelocity(vel.vx, vel.vy, vel.maxSpeed);

      // 2) Integrate position using dt (seconds).
      let nx = pos.x + clamped.vx * dtSec;
      let ny = pos.y + clamped.vy * dtSec;

      // 3) MVP rounding policy: round to nearest integer for grid determinism.
      nx = Math.round(nx);
      ny = Math.round(ny);

      // 4) Direction policy: update only if moving.
      let ndir = pos.dirDeg;
      if (clamped.speed > 0) {
        const deg = toDegrees(Math.atan2(clamped.vy, clamped.vx));
        const normalized = normalizeDeg(deg);
        // Round to integer degrees and normalize to [0..359]
        ndir = Math.round(normalized) % 360;
        if (ndir < 0) ndir += 360;
      }

      const updatedPos = { x: nx, y: ny, dirDeg: ndir };

      if (__DEV__) {
        devAssert(Number.isInteger(updatedPos.x) && Number.isInteger(updatedPos.y) && Number.isInteger(updatedPos.dirDeg),
          `Updated Position must contain integer x, y, dirDeg for entity ${String(eid)}.`);
      }

      if (registry && typeof registry.set === 'function') {
        registry.set(eid, 'Position', updatedPos);
      }
      processed++;
    };

    // Iterate entities matching the query.
    if (registry && typeof registry.each === 'function') {
      registry.each(query, processEntity);
    } else if (registry && typeof registry.view === 'function') {
      const view = registry.view(query);
      if (view && typeof view[Symbol.iterator] === 'function') {
        for (const eid of view) processEntity(eid);
      } else if (Array.isArray(view)) {
        for (let i = 0; i < view.length; i++) processEntity(view[i]);
      } else if (__DEV__) {
        console.warn(`[${sysId}] MovementSystem: registry.view(query) returned a non-iterable; no entities processed.`);
      }
    } else if (__DEV__) {
      console.warn(`[${sysId}] MovementSystem: registry lacks 'each' or 'view'; no entities processed.`);
    }

    if (profiler) {
      try {
        profiler.counter('Movement.entities', processed);
        profiler.counter('Movement.dtMs', useDtMs);
      } catch (e) {
        // Swallow profiler errors to avoid affecting gameplay.
      }
    }
  }

  return {
    id: sysId,
    query,
    update,
  };
}