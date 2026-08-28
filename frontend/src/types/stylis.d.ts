declare module "stylis" {
  export type Middleware = (...args: unknown[]) => string | void;
  export const prefixer: Middleware;
}
