import { Random } from '../../random/generator/Random';
import { Stream } from '../../stream/Stream';
import { Value } from '../arbitrary/definition/Value';
import { PreconditionFailure } from '../precondition/PreconditionFailure';

const safeMathFloor = Math.floor;
const safeMathLog = Math.log;

/**
 * Represent failures of the property
 * @remarks Since 3.0.0
 * @public
 */
export type PropertyFailure = {
  /**
   * The original error that has been intercepted.
   * Possibly not an instance Error as users can throw anything.
   * @remarks Since 3.0.0
   */
  error: unknown;
  /**
   * The error message extracted from the error
   * @remarks Since 3.0.0
   */
  errorMessage: string;
};

/**
 * Property
 *
 * A property is the combination of:
 * - Arbitraries: how to generate the inputs for the algorithm
 * - Predicate: how to confirm the algorithm succeeded?
 *
 * @remarks Since 1.19.0
 * @public
 */
export interface IRawProperty<Ts, IsAsync extends boolean = boolean> {
  /**
   * Is the property asynchronous?
   *
   * true in case of asynchronous property, false otherwise
   * @remarks Since 0.0.7
   */
  isAsync(): IsAsync;

  /**
   * Generate values of type Ts
   *
   * @param mrng - Random number generator
   * @param runId - Id of the generation, starting at 0 - if set the generation might be biased
   *
   * @remarks Since 0.0.7 (return type changed in 3.0.0)
   */
  generate(mrng: Random, runId?: number): Value<Ts>;

  /**
   * Shrink value of type Ts
   *
   * @param value - The value to be shrunk, it can be context-less
   *
   * @remarks Since 3.0.0
   */
  shrink(value: Value<Ts>): Stream<Value<Ts>>;

  /**
   * Check the predicate for v
   * @param v - Value of which we want to check the predicate
   * @remarks Since 0.0.7
   */
  run(
    v: Ts
  ):
    | (IsAsync extends true ? Promise<PreconditionFailure | PropertyFailure | null> : never)
    | (IsAsync extends false ? PreconditionFailure | PropertyFailure | null : never);
}

/**
 * Convert runId (IProperty) into a frequency (Arbitrary)
 *
 * @param runId - Id of the run starting at 0
 * @returns Frequency of bias starting at 2
 *
 * @internal
 */
export const runIdToFrequency = (runId: number): number => 2 + safeMathFloor(safeMathLog(runId + 1) / safeMathLog(10));
