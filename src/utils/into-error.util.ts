export const intoError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(JSON.stringify(error));
