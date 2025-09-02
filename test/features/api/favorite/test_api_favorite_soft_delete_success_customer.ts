import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_favorite_soft_delete_success_customer(
  connection: api.IConnection,
) {
  /**
   * Test the soft (logical) deletion of a customer's favorite using the
   * deleted_at mechanism.
   *
   * This scenario ensures that a customer can remove their favorite by marking
   * it as deleted, following compliance for personal data (soft delete via
   * deleted_at field). The steps below are implemented based on available
   * API/SDK:
   *
   * 1. Register and authenticate a new customer using the /auth/customer/join
   *    endpoint.
   * 2. Simulate creation of a favorite (no real API endpoint for creation
   *    available), using a randomly generated UUID as the favoriteId.
   * 3. Delete the favorite using the
   *    /shoppingMallAiBackend/customer/favorites/{favoriteId} endpoint.
   * 4. Assert that the erase call does not throw and completes without error.
   * 5. (Cannot verify deleted_at or exclusion from queries; read/list endpoints
   *    are unavailable.)
   *
   * Note:
   *
   * - The test is limited to what is technically feasible with current
   *   SDK/functions.
   * - Additional validation would require read/audit APIs for favorites, which
   *   are not present.
   */

  // 1. Register and authenticate customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const authResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(authResult);
  // Customer authentication; Authorization header is auto-set on connection

  // 2. Simulate favorite creation (since no real API endpoint provided)
  const favoriteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // In a real E2E, create via favorite-create endpoint and persist the id

  // 3. Perform soft-delete of the favorite
  await api.functional.shoppingMallAiBackend.customer.favorites.erase(
    connection,
    {
      favoriteId,
    },
  );
  // Success is implied if no exception is thrown and call completes

  // 4. No further business assertions possible due to lack of read/list endpoints for favorites
}
