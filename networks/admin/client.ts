// ============================================================================
// Typed admin API client.
//
// Every admin call goes through adminRequest(). Its types come from the
// backend's contract (docs/admin.openapi.yaml → generated/schema.d.ts, see
// scripts/sync-admin-spec.js), so:
//   - a path or method the API does not have does not compile;
//   - path params, request body and response `data` are typed from the spec;
//   - failures arrive as AdminApiError with the server's error code.
//
// It uses the shared axios instance, so admin calls get the same token
// attachment and refresh-on-401 as the rest of the app.
// ============================================================================

import type { components, paths } from './generated/schema';
import { MainAxiosInstance } from '../network/network';
import { buildAdminUrl, toAdminApiError } from './errors';

export { AdminApiError } from './errors';

export type Schemas = components['schemas'];
export type ListMeta = Schemas['Meta'];

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type AdminPath = keyof paths;

/** Paths that support `M`. */
export type PathsFor<M extends Method> = {
  [P in AdminPath]: NonNullable<paths[P][M]> extends never ? never : P;
}[AdminPath];

type Operation<P extends AdminPath, M extends Method> = NonNullable<paths[P][M]>;
type Responses<O> = O extends { responses: infer R } ? R : never;
type JsonOf<R> = R extends { content: { 'application/json': infer B } } ? B : never;
type SuccessKeys<R> = Extract<keyof R, 200 | 201 | 202>;
type SuccessBody<O> = { [K in SuccessKeys<Responses<O>>]: JsonOf<Responses<O>[K]> }[SuccessKeys<Responses<O>>];

/** The `data` an operation returns on success. */
export type DataOf<P extends AdminPath, M extends Method> = SuccessBody<Operation<P, M>> extends { data?: infer D } ? D : unknown;

type PathParams<O> = O extends { parameters: { path: infer PP } } ? (PP extends Record<string, unknown> ? PP : undefined) : undefined;
type Body<O> = O extends { requestBody?: { content: { 'application/json': infer B } } } ? B : never;

export type RequestOptions<P extends AdminPath, M extends Method> = {
  params?: PathParams<Operation<P, M>>;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: Body<Operation<P, M>> | Record<string, unknown>;
  signal?: AbortSignal;
};

export interface AdminResult<D> {
  data: D;
  meta?: ListMeta;
}

// Drop undefined/null query values so `?state=undefined` never reaches the server.
const cleanQuery = (query?: RequestOptions<any, any>['query']) =>
  query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')) : undefined;

export async function adminRequest<M extends Method, P extends PathsFor<M>>(
  method: M,
  path: P,
  options: RequestOptions<P, M> = {}
): Promise<AdminResult<DataOf<P, M>>> {
  const url = buildAdminUrl(String(path), options.params as Record<string, string> | undefined);
  try {
    const res = await MainAxiosInstance.request({
      method,
      url,
      params: cleanQuery(options.query),
      data: options.body,
      signal: options.signal,
    });
    return { data: res.data?.data as DataOf<P, M>, meta: res.data?.meta };
  } catch (err) {
    throw toAdminApiError(err);
  }
}

/** Shorthands. */
export const adminApi = {
  get: <P extends PathsFor<'get'>>(path: P, options?: RequestOptions<P, 'get'>) => adminRequest('get', path, options),
  post: <P extends PathsFor<'post'>>(path: P, options?: RequestOptions<P, 'post'>) => adminRequest('post', path, options),
  put: <P extends PathsFor<'put'>>(path: P, options?: RequestOptions<P, 'put'>) => adminRequest('put', path, options),
  patch: <P extends PathsFor<'patch'>>(path: P, options?: RequestOptions<P, 'patch'>) => adminRequest('patch', path, options),
  delete: <P extends PathsFor<'delete'>>(path: P, options?: RequestOptions<P, 'delete'>) => adminRequest('delete', path, options),
};
