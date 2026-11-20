export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  static badRequest(m: string, d?: unknown, code?: string) {
    return new ApiError(400, m, d, code);
  }
  static unauthorized(m = 'Authentication required') {
    return new ApiError(401, m);
  }
  static forbidden(m = 'You do not have permission to perform this action') {
    return new ApiError(403, m);
  }
  static notFound(m = 'Resource not found') {
    return new ApiError(404, m);
  }
  static conflict(m: string, code?: string) {
    return new ApiError(409, m, undefined, code);
  }
}
