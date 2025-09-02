import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_delete_own_external_identity_success(
  connection: api.IConnection,
) {
  /**
   * E2E Test: Customer can delete their own linked external identity.
   *
   * Scenario:
   *
   * 1. Register a new customer (join & obtain authentication context).
   * 2. Simulate that the customer has a linked external identity (UUID is
   *    generated, as no API for linkage is provided).
   * 3. Attempt to delete the external identity using the DELETE endpoint. Success
   *    is the absence of errors/exceptions, as further validation is not
   *    possible with available APIs.
   *
   * Notes:
   *
   * - We cannot validate existence/pre-existence of the external identity, nor
   *   validate audit logs, as no fetch/list/search APIs for external identities
   *   are provided.
   * - This test focuses strictly on endpoint signature, parameter integration,
   *   and the expected success path for own-identity deletion.
   */

  // 1. Register a new customer (join & authenticate)
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const joinResult = await api.functional.auth.customer.join(connection, {
    body: input,
  });
  typia.assert(joinResult);
  const customerId = joinResult.customer.id;

  // 2. (Simulated) external identity to be deleted - no linking/list API available, so generate a plausible one
  const externalIdentityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt deletion as the authenticated customer
  await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.erase(
    connection,
    {
      customerId,
      externalIdentityId,
    },
  );
  // No assertion possible for post-deletion state due to missing API; success is determined by lack of error
}
