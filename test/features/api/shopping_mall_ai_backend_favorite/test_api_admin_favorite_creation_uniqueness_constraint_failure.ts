import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_admin_favorite_creation_uniqueness_constraint_failure(
  connection: api.IConnection,
) {
  /**
   * Validate admin-side favorite uniqueness constraint enforcement.
   *
   * This E2E test verifies that an administrator cannot create two favorites
   * for the same target (combination of target_type and target_id) under the
   * same account.
   *
   * 1. Registers an admin with a unique username, simulated password hash, name,
   *    email, phone, and is_active=true.
   * 2. Uses the authenticated admin to create a favorite with fixed target_type
   *    and target_id_snapshot.
   * 3. Attempts to create a duplicate favorite for the same target; expects API to
   *    reject the duplication with an error.
   */

  // Step 1: Register admin and obtain authentication
  const adminInput = {
    username: RandomGenerator.alphabets(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  const adminId: string = adminAuth.admin.id;

  // Step 2: Create a favorite for a certain target_type and target_id_snapshot
  const targetTypes = ["product", "address", "inquiry"] as const;
  const targetType = RandomGenerator.pick(targetTypes);
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const favoriteInput = {
    shopping_mall_ai_backend_customer_id: adminId,
    target_type: targetType,
    target_id_snapshot: targetId,
    title_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const favorite =
    await api.functional.shoppingMallAiBackend.admin.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(favorite);

  // Step 3: Attempt to create a duplicate favorite (should fail)
  await TestValidator.error(
    "admin cannot create duplicate favorite for the same target",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.create(
        connection,
        {
          body: favoriteInput,
        },
      );
    },
  );
}
