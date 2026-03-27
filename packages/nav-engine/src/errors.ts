export type NavEngineErrorCode =
  | 'VAULT_NOT_FOUND'
  | 'INJECTOR_ERROR'
  | 'NORMALIZER_ERROR'
  | 'MATH_ERROR'
  | 'VALIDATION_ERROR';

export class NavEngineError extends Error {
  constructor(
    message: string,
    public readonly code: NavEngineErrorCode,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'NavEngineError';
  }
}
