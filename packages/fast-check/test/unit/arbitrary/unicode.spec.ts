import * as fc from 'fast-check';
import { unicode } from '../../../src/arbitrary/unicode';

import { fakeArbitrary } from './__test-helpers__/ArbitraryHelpers';

import * as CharacterArbitraryBuilderMock from '../../../src/arbitrary/_internals/builders/CharacterArbitraryBuilder';
import {
  assertProduceValuesShrinkableWithoutContext,
  assertProduceCorrectValues,
  assertShrinkProducesSameValueWithoutInitialContext,
  assertShrinkProducesStrictlySmallerValue,
  assertProduceSameValueGivenSameSeed,
} from './__test-helpers__/ArbitraryAssertions';

function beforeEachHook() {
  jest.resetModules();
  jest.restoreAllMocks();
  fc.configureGlobal({ beforeEach: beforeEachHook });
}
beforeEach(beforeEachHook);

describe('unicode', () => {
  it('should be able to unmap any mapped value', () => {
    // Arrange
    const { min, max, mapToCode, unmapFromCode } = extractArgumentsForBuildCharacter(unicode);

    // Act / Assert
    fc.assert(
      fc.property(fc.integer({ min, max }), (n) => {
        expect(unmapFromCode(mapToCode(n))).toBe(n);
      })
    );
  });

  it('should always unmap outside of the range for values it could not have generated', () => {
    // Arrange
    const { min, max, mapToCode, unmapFromCode } = extractArgumentsForBuildCharacter(unicode);
    const allPossibleValues = new Set([...Array(max - min + 1)].map((_, i) => mapToCode(i + min)));

    // Act / Assert
    fc.assert(
      // [0, 1112063] is the range requested by fullUnicode
      fc.property(fc.oneof(fc.integer({ min: -1, max: 1112064 }), fc.maxSafeInteger()), (code) => {
        fc.pre(!allPossibleValues.has(code)); // not a possible code for our mapper
        const unmapped = unmapFromCode(code);
        expect(unmapped < min || unmapped > max).toBe(true);
      })
    );
  });
});

describe('unicode (integration)', () => {
  const isCorrect = (value: string) =>
    value.length === 1 &&
    0x0000 <= value.charCodeAt(0) &&
    value.charCodeAt(0) <= 0xffff &&
    !(0xd800 <= value.charCodeAt(0) && value.charCodeAt(0) <= 0xdfff); /*surrogate pairs*/

  const isStrictlySmaller = (c1: string, c2: string) => remapCharToIndex(c1) < remapCharToIndex(c2);

  const unicodeBuilder = () => unicode();

  it('should produce the same values given the same seed', () => {
    assertProduceSameValueGivenSameSeed(unicodeBuilder);
  });

  it('should only produce correct values', () => {
    assertProduceCorrectValues(unicodeBuilder, isCorrect);
  });

  it('should produce values seen as shrinkable without any context', () => {
    assertProduceValuesShrinkableWithoutContext(unicodeBuilder);
  });

  it('should be able to shrink to the same values without initial context', () => {
    assertShrinkProducesSameValueWithoutInitialContext(unicodeBuilder);
  });

  it('should preserve strictly smaller ordering in shrink', () => {
    assertShrinkProducesStrictlySmallerValue(unicodeBuilder, isStrictlySmaller);
  });
});

// Helpers

function extractArgumentsForBuildCharacter(build: () => void) {
  const { instance } = fakeArbitrary();
  const buildCharacterArbitrary = jest.spyOn(CharacterArbitraryBuilderMock, 'buildCharacterArbitrary');
  buildCharacterArbitrary.mockImplementation(() => instance);

  build();
  const [min, max, mapToCode, unmapFromCode] = buildCharacterArbitrary.mock.calls[0];
  return { min, max, mapToCode, unmapFromCode };
}

function remapCharToIndex(c: string): number {
  const cp = c.codePointAt(0)!;
  if (cp >= 0x20 && cp <= 0x7e) return cp - 0x20;
  if (cp < 0x20) return cp + 0x7e - 0x20 + 1;
  return cp;
}
