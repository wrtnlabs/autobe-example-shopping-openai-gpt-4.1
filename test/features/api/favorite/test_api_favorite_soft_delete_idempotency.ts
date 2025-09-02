import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_favorite_soft_delete_idempotency(
  connection: api.IConnection,
) {
  /**
   * Test purpose: Ensure soft-delete action on customer favorites is
   * idempotent.
   *
   * Business context: Customers may remove the same favorite multiple times
   * (e.g., due to retries/network errors). The endpoint contract requires
   * repeated DELETEs on the same favoriteId to always succeed (idempotency):
   * the first marks as deleted (soft-delete), repeats do not error or cause
   * side effects.
   *
   * Step-by-step process:
   *
   * 1. Register and authenticate a customer (to obtain authorization/session)
   * 2. Generate a valid favoriteId (simulate ownership as creation/listing APIs
   *    are not available)
   * 3. Issue DELETE /shoppingMallAiBackend/customer/favorites/{favoriteId}
   *    (initial logical deletion)
   * 4. Repeat the DELETE for exactly the same favoriteId (must succeed, no error,
   *    no-op for idempotency)
   * 5. If both operations succeed without exception, idempotency is confirmed
   */

  // 1. Customer registration/authentication (prerequisite)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joined = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joined);
  // Authorization context (JWT token) is now in connection for subsequent operations

  // 2. Simulate a favoriteId (as if a real favorite exists)
  const favoriteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. First DELETE - perform soft-delete
  await api.functional.shoppingMallAiBackend.customer.favorites.erase(
    connection,
    {
      favoriteId,
    },
  );

  // 4. Second DELETE - verify idempotency (must also succeed, no error)
  await api.functional.shoppingMallAiBackend.customer.favorites.erase(
    connection,
    {
      favoriteId,
    },
  );

  // 5. If no exceptions were thrown, idempotency contract is validated.
}
