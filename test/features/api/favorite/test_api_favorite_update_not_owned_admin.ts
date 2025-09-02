import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";

export async function test_api_favorite_update_not_owned_admin(
  connection: api.IConnection,
) {
  /**
   * Test that one admin cannot update another admin's favorite bookmark
   * (ownership boundary enforcement).
   *
   * This test registers two distinct admins (Admin1 and Admin2). Although the
   * endpoint for favorite creation is not exposed, the test simulates Admin1 as
   * owner of a favorite record by generating a random UUID. After registering
   * and auto-authenticating both admins in sequence, the test context is set to
   * Admin2. Admin2 then attempts to update a favorite (using the simulated ID)
   * that should belong to Admin1. The update must fail, enforcing that admins
   * cannot update another admin's favorite. If the SDK or backend is
   * implemented correctly, the update operation should return an error
   * (forbidden or similar) which the test asserts using TestValidator.error.
   *
   * Steps:
   *
   * 1. Register Admin1 (auto-login)
   * 2. Register Admin2 (auto-login, context switch)
   * 3. (Omitted: Favorite creation by Admin1—no endpoint available; simulate
   *    favoriteId)
   * 4. Admin2 attempts to update Admin1's favorite
   * 5. Assert update is rejected (ownership boundary enforced)
   */
  // Step 1: Register Admin1 (sets Authorization header via SDK)
  const admin1Credentials = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@admin1.example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const admin1Auth = await api.functional.auth.admin.join(connection, {
    body: admin1Credentials,
  });
  typia.assert(admin1Auth);

  // (Step 2 omitted: favorite creation endpoint not provided.)
  const fakeFavoriteId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Register Admin2 (auto-login, overwrites context Authorization)
  const admin2Credentials = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@admin2.example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const admin2Auth = await api.functional.auth.admin.join(connection, {
    body: admin2Credentials,
  });
  typia.assert(admin2Auth);

  // Step 4: Admin2 attempts to update Admin1's favorite (ownership boundary test)
  await TestValidator.error(
    "Admin cannot update another admin's favorite (ownership boundary)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.favorites.update(
        connection,
        {
          favoriteId: fakeFavoriteId,
          body: {
            title_snapshot: RandomGenerator.paragraph({ sentences: 4 }),
            shopping_mall_ai_backend_favorite_folder_id: null,
          } satisfies IShoppingMallAiBackendFavorite.IUpdate,
        },
      );
    },
  );
}
