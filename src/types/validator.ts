import type { Ruleset } from './validationRules';
import { packagePrivate } from '../packagePrivateAccess';

export interface AssertMatchesOpts {
  readonly errorFactory?: undefined | ((...params: ConstructorParameters<typeof Error>) => Error)
  readonly at?: undefined | string
  readonly errorPrefix?: undefined | string
}

export const createAssertMatchesOptsCheck = (validator: ValidatorTemplateTag): Validator => validator`{
  errorFactory?: undefined | ${Function}
  at?: undefined | string
  errorPrefix?: undefined | string
}`;

export interface Expectation {
  readonly [packagePrivate]: {
    readonly type: 'expectation'
    readonly testExpectation: (valueBeingMatched: unknown) => string | null
  }
}

export interface LazyEvaluator {
  readonly [packagePrivate]: {
    readonly type: 'lazyEvaluator'
    readonly deriveValidator: (value: unknown) => Validator
  }
}

export interface Validator<T=unknown> {
  readonly [packagePrivate]: { readonly type: 'validator' }
  readonly matches: (value: unknown) => value is T
  readonly assertMatches: (value: unknown, opts?: AssertMatchesOpts) => T
  readonly assertionTypeGuard: (value: unknown, opts?: AssertMatchesOpts) => asserts value is T
  readonly assertArgs: (whichFn: string, args: ArrayLike<unknown>) => void
  readonly ruleset: Ruleset
}

export interface ValidatorTemplateTagStaticFields {
  fromRuleset: <T=unknown>(rule: Ruleset) => Validator<T>
  from: (unknownValue: string | Validator) => Validator
  lazy: (deriveValidator: (value: unknown) => Validator) => LazyEvaluator
  expectTo: (callback: (valueBeingMatched: unknown) => string | null) => Expectation
}

type Primitive = string | number | bigint | boolean | symbol | null | undefined;
export type InterpolatedValue = (
  Primitive
  | Validator
  | LazyEvaluator
  | Expectation
  | RegExp
  | (new (...args: any) => any)
);

export type ValidatorTemplateTag = ValidatorTemplateTagStaticFields & (
  <T>(
    parts: TemplateStringsArray,
    ...interpolated: readonly InterpolatedValue[]
  ) => Validator<T>
);

export function isValidator(value: unknown): value is Validator {
  return Object(value)[packagePrivate]?.type === 'validator';
}

export function isExpectation(value: unknown): value is Expectation {
  return Object(value)[packagePrivate]?.type === 'expectation';
}

export function isLazyEvaluator(value: unknown): value is LazyEvaluator {
  return Object(value)[packagePrivate]?.type === 'lazyEvaluator';
}

export function createInterpolatedValueCheck(validator: ValidatorTemplateTag): Validator {
  const primitiveCheck = validator`string | number | bigint | boolean | symbol | null | undefined`;
  return validator`
    ${validator.expectTo(value => primitiveCheck.matches(value) ? null : 'be a primitive.')}
    | ${validator.expectTo(value => isValidator(value) ? null : 'be a Validator.')}
    | ${validator.expectTo(value => isExpectation(value) ? null : 'be an Expectation (from .expectTo()).')}
    | ${validator.expectTo(value => isLazyEvaluator(value) ? null : 'be a LazyEvaluator (from .lazy()).')}
    | ${validator.expectTo(value => value instanceof RegExp ? null : 'be an instance of RegExp.')}
    | ${validator.expectTo(value => value instanceof Function ? null : 'be an instance of Function.')}
  `;
}
