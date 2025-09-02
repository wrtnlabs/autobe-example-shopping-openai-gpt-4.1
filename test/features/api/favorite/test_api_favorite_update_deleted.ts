import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

/**
 * Test that updating a logically deleted (soft-deleted) favorite by the
 * customer fails as expected.
 *
 * This test ensures that once a favorite bookmark is logically deleted
 * (soft-deleted), any further attempt to modify (update) it is rejected by
 * the API in compliance with audit, evidence, and business policy. It
 * verifies that the backend enforces correct data retention and integrity
 * for deleted personal records.
 *
 * Steps:
 *
 * 1. Register and authenticate a customer using /auth/customer/join to get a
 *    valid session.
 * 2. Generate a random UUID to represent a favorite (since there is no
 *    explicit create endpoint in the exposed API).
 * 3. Soft-delete this favorite bookmark record using DELETE
 *    /shoppingMallAiBackend/customer/favorites/{favoriteId}. This operation
 *    is idempotent (safe even if the favorite did not preexist).
 * 4. Attempt to update this favorite bookmark using PUT
 *    /shoppingMallAiBackend/customer/favorites/{favoriteId} with valid
 *    update data.
 * 5. Assert using TestValidator.error that the API rejects the update (throws
 *    an error), confirming that soft-deleted resources remain unmodifiable
 *    by design.
 */
export async function test_api_favorite_update_deleted(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer (obtain authorization for favorites management)
  const authorized = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      phone_number: RandomGenerator.mobile(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(authorized);

  // 2. Simulate a favorite record by generating a random UUID (since the API lacks an explicit create method)
  const favoriteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Soft-delete the favorite (mark as deleted). This is idempotent and safe for nonexistent records.
  await api.functional.shoppingMallAiBackend.customer.favorites.erase(
    connection,
    {
      favoriteId,
    },
  );

  // 4. Attempt to update the deleted favorite record
  await TestValidator.error(
    "cannot update a logically deleted favorite; update must be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.update(
        connection,
        {
          favoriteId,
          body: {
            shopping_mall_ai_backend_favorite_folder_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            title_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallAiBackendFavorite.IUpdate,
        },
      );
    },
  );
}
