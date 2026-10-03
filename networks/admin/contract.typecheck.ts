// ============================================================================
// Compile-time contract checks for the typed admin client. Never executed —
// `npx tsc --noEmit` type-checks it. Each @ts-expect-error line MUST fail to
// compile; if the client stopped enforcing the contract, tsc reports the
// directive as unused and the build breaks.
// ============================================================================
import { adminApi, adminRequest, type DataOf } from './client';

export async function contractChecks() {
  // Real operations compile, with typed results.
  const overview = await adminApi.get('/api/admin/overview');
  const queues: { type: string; count: number | null }[] = overview.data.queues;
  const provider = await adminApi.get('/api/admin/providers/{providerId}', { params: { providerId: 'abc' } });
  const state: 'incomplete' | 'pending' | 'approved' | 'rejected' | 'suspended' = provider.data.state;
  await adminApi.put('/api/admin/providers/{providerId}/suspend', { params: { providerId: 'abc' }, body: { reason: 'checks' } });

  // @ts-expect-error — not an admin API path
  await adminApi.get('/api/admin/does-not-exist');

  // @ts-expect-error — the path exists but not with this method
  await adminRequest('post', '/api/admin/overview');

  // @ts-expect-error — `state` is a known enum on the provider summary
  const wrong: number = provider.data.state;

  type Tokens = DataOf<'/api/admin/auth/refresh-token', 'post'>;
  const expiresIn: number = ({} as Tokens).expiresInSeconds;

  return { queues, state, wrong, expiresIn };
}
