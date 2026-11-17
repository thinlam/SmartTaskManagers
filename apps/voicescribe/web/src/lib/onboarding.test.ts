import { describe, expect, it } from 'vitest';
import { clampStepIndex, ONBOARDING_STEPS } from './onboarding';

describe('clampStepIndex', () => {
  it('keeps an in-range index unchanged', () => {
    expect(clampStepIndex(2, ONBOARDING_STEPS.length)).toBe(2);
  });

  it('clamps a negative index to 0 (Back at the first step)', () => {
    expect(clampStepIndex(-1, ONBOARDING_STEPS.length)).toBe(0);
  });

  it('clamps an index past the end to the last step', () => {
    expect(clampStepIndex(999, ONBOARDING_STEPS.length)).toBe(ONBOARDING_STEPS.length - 1);
  });
});

describe('ONBOARDING_STEPS', () => {
  it('every step has a non-empty selector, title and description', () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.selector.length).toBeGreaterThan(0);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });
});
