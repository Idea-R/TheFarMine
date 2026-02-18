/**
 * The Far Mine - Core Movement System (MVP)
 *
 * Purpose:
 * - Deterministically integrates Velocity into Position for entities that have both components.
 * - Enforces a maximum speed (Velocity.maxSpeed > 0) by clamping velocity magnitude.
 * - Engine-agnostic and depends solely on the public ecs-registry API documented in docs/core-systems/ecs-architecture.md.
 *
 * Contracts and components:
 * - Position: { x:number, y:number, dirDeg:number }
 * - Velocity: { vx:number, vy:number, maxSpeed:number }
 *
 * Determinism and performance:
 * - Uses registry.view(['position','velocity']).each(...) which iterates EIDs in ascending order.
 * - Branch-light hot loop with minimal allocations (no per-entity object allocations).
 * - Numeric safety: dtSec must be finite and within [0, 1] to mirror our fixed-step loop expectations.
 * - Malformed numeric component fields (NaN/Infinity) are coerced to 0 to keep prototypes robust.
 *
 * Instrumentation:
 * - If registry.profiler?.counters['Movement.iterations'] exists and is numeric, it is incremented by the number of processed entities.
 *
 * Notes:
 * - No collider or tile collision resolution in this MVP—it is strictly kinematic integration.
 */

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 * @property {number} dirDeg
 */

/**
 * @typedef {Object} Velocity
 * @property {number} vx
 * @property {number} vy
 * @property {number} maxSpeed
 */

/**
 * Clamp a velocity vector in-place to respect its maxSpeed constraint (if > 0).
 * Non-finite inputs (NaN/Infinity) are coerced to 0. When maxSpeed <= 0, velocity is considered unlimited.
 *
 * Mutates the given velocity object in-place and also returns the (possibly) adjusted components.
 *
 * @param {Velocity} vel - Velocity component to clamp and sanitize.
 * @returns {{vx:number, vy:number}} The clamped velocity components.
 *
 * @example
 * const vel = { vx: 10, vy: 0, maxSpeed: 8 };
 * const out = clampVelocity(vel);
 * // vel.vx === 8, vel.vy === 0
 * // out => { vx: 8, vy: 0 }
 */
export function clampVelocity(vel) {
  // Sanitize velocity components
  let vx = Number.isFinite(vel?.vx) ? vel.vx : 0;
  let vy = Number.isFinite(vel?.vy) ? vel.vy : 0;

  // Write back sanitized values (in case they were NaN/Infinity)
  vel.vx = vx;
  vel.vy = vy;

  // Sanitize maxSpeed
  let maxSpeed = Number.isFinite(vel?.maxSpeed) ? vel.maxSpeed : 0;
  vel.maxSpeed = maxSpeed;

  // No clamping when unlimited or non-positive
  if (maxSpeed > 0) {
    // Compute magnitude; inputs are finite at this point
    const speedSq = vx * vx + vy * vy;
    // Avoid sqrt for zero vector fast-path
    if (speedSq > 0) {
      const speed = Math.sqrt(speedSq);
      if (speed > maxSpeed) {
        // Scale down to maxSpeed
        let factor = maxSpeed / speed;
        // Guard against non-finite scale (should not occur given guards, but robust under prototypes)
        if (!Number.isFinite(factor)) {
          factor = 0;
        }
        vx *= factor;
        vy *= factor;

        // Mutate in-place
        vel.vx = vx;
        vel.vy = vy;
      }
    }
  }

  return { vx, vy };
}

/**
 * Update movement system: clamps velocities (respecting maxSpeed) and integrates into positions.
 * Deterministic over EID order via registry.view(['position','velocity']).each.
 * No collision handling in this MVP.
 *
 * Numeric safeguards:
 * - dtSec must be finite and within [0, 1] inclusive. Otherwise, the function returns early with no side-effects.
 * - Non-finite Position/Velocity fields are coerced to 0 to avoid propagation of NaNs/Infinities.
 *
 * Instrumentation:
 * - If registry.profiler?.counters['Movement.iterations'] exists (numeric), increments it by the number
 *   of processed entities. If the counter key does not exist, no new counters are created.
 *
 * @param {import('../ecs-registry.js').Registry} registry - ECS registry with view driver and optional profiler.
 * @param {number} dtSec - Delta time in seconds, finite and within [0, 1] for MVP fixed-step semantics.
 * @returns {void}
 *
 * @example
 * // Example usage:
 * // Assume `registry` has an entity with:
 * // Position: { x: 0, y: 0, dirDeg: 0 }
 * // Velocity: { vx: 10, vy: 0, maxSpeed: 8 }
 * // Calling updateMovement(registry, 0.1) clamps vel to 8 and integrates:
 * // pos.x += 8 * 0.1 => 0.8, pos.y unchanged.
 * updateMovement(registry, 0.1);
 */
export function updateMovement(registry, dtSec) {
  // Validate dtSec for MVP fixed-step compatibility; early out on invalid to ensure no side-effects
  if (
    typeof dtSec !== 'number' ||
    !Number.isFinite(dtSec) ||
    dtSec < 0 ||
    dtSec > 1
  ) {
    return;
  }

  // Acquire view once; relies on registry's eid-ascending deterministic iteration
  const view = registry.view(['position', 'velocity']);
  let processed = 0;

  view.each((eid, pos, vel) => {
    // Sanitize velocity components
    let vx = Number.isFinite(vel?.vx) ? vel.vx : 0;
    let vy = Number.isFinite(vel?.vy) ? vel.vy : 0;

    // Write back any corrections
    if (vx !== vel.vx) vel.vx = vx;
    if (vy !== vel.vy) vel.vy = vy;

    // Sanitize maxSpeed (<= 0 means unlimited)
    let maxSpeed = Number.isFinite(vel?.maxSpeed) ? vel.maxSpeed : 0;
    if (maxSpeed !== vel.maxSpeed) vel.maxSpeed = maxSpeed;

    // Clamp velocity magnitude if limited and necessary
    if (maxSpeed > 0) {
      const speedSq = vx * vx + vy * vy;
      if (speedSq > 0) {
        const speed = Math.sqrt(speedSq);
        if (speed > maxSpeed) {
          let factor = maxSpeed / speed;
          if (!Number.isFinite(factor)) {
            factor = 0;
          }
          vx *= factor;
          vy *= factor;
          // Mutate in-place for consistency
          vel.vx = vx;
          vel.vy = vy;
        }
      }
    }

    // Sanitize position components before integration
    let x = Number.isFinite(pos?.x) ? pos.x : 0;
    let y = Number.isFinite(pos?.y) ? pos.y : 0;

    if (x !== pos.x) pos.x = x;
    if (y !== pos.y) pos.y = y;

    // Kinematic integration (no collisions in MVP)
    x += vx * dtSec;
    y += vy * dtSec;

    pos.x = x;
    pos.y = y;

    processed++;
  });

  // Optional instrumentation hook; increment only if the field exists and is numeric
  const profiler = registry && registry.profiler;
  const counters = profiler && profiler.counters;
  if (
    counters &&
    Object.prototype.hasOwnProperty.call(counters, 'Movement.iterations') &&
    typeof counters['Movement.iterations'] === 'number'
  ) {
    counters['Movement.iterations'] += processed;
  }
}