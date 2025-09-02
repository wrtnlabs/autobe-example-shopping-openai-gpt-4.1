import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

/**
 * Validate error handling of required field validation failure when
 * attempting to create a favorite via the admin favorites API.
 *
 * This test ensures that the API strictly enforces presence and validity of
 * all required fields ('shopping_mall_ai_backend_customer_id',
 * 'target_type', etc.) in the favorite creation DTO, and returns
 * appropriate errors if any are missing or invalid.
 *
 * Workflow:
 *
 * 1. Register a new admin via /auth/admin/join (sets up admin authentication
 *    context).
 * 2. Attempt to create a favorite with empty string for 'target_type' — expect
 *    a validation error.
 * 3. Attempt to create a favorite with empty string for
 *    'shopping_mall_ai_backend_customer_id' — expect a validation error.
 * 4. Attempt to create a favorite with both as empty strings — expect a
 *    validation error.
 *
 * These cases verify that the API does not accept incomplete or
 * incorrectly-typed data for favorites in admin scenarios, and that no
 * invalid records can be created.
 */
export async function test_api_admin_favorite_creation_validation_failure(
  connection: api.IConnection,
) {
  // 1. Register admin (setup authentication for admin endpoints)
  const adminJoinInput = {
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Attempt creation with empty string for 'target_type' (required)
  await TestValidator.error(
    "Should fail when 'target_type' is empty",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            target_type: "",
          },
        },
      );
    },
  );

  // 3. Attempt creation with empty string for 'shopping_mall_ai_backend_customer_id' (required)
  await TestValidator.error(
    "Should fail when 'shopping_mall_ai_backend_customer_id' is empty",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: "",
            target_type: "product",
          },
        },
      );
    },
  );

  // 4. Attempt creation with both as empty strings
  await TestValidator.error(
    "Should fail when both required fields are empty",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: "",
            target_type: "",
          },
        },
      );
    },
  );
}
