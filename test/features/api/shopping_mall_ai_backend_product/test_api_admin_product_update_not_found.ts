import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * Validate update failure when targeting non-existent product (admin
 * endpoint).
 *
 * 1. Register a new admin account and ensure authenticated connection as
 *    admin.
 * 2. Attempt to update a product using a fresh (valid but non-existent) uuid
 *    for {productId} and a valid payload.
 * 3. Confirm the API returns an error (such as 404 not found) and does not
 *    yield a successful update result.
 * 4. Validate that no data-modification side effects occur as a result of this
 *    operation (by expecting an error, not a product response).
 * 5. Check that the error path (not found) is hit, while success would be a
 *    test failure.
 */
export async function test_api_admin_product_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin account
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: `${RandomGenerator.alphaNumeric(8)}@domain.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinRes);

  // 2. Attempt product update using a random (non-existent) UUID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const updatePayload = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    product_type: RandomGenerator.alphaNumeric(8),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 5,
  } satisfies IShoppingMallAiBackendProduct.IUpdate;

  // 3. Confirm proper error response
  await TestValidator.error(
    "should return not found when updating non-existent product",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.update(
        connection,
        {
          productId: nonExistentProductId,
          body: updatePayload,
        },
      );
    },
  );
}
