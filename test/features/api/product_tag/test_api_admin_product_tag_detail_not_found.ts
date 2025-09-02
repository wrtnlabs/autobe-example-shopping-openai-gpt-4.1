import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";

export async function test_api_admin_product_tag_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validates error handling for fetching a product tag detail by non-existent
   * or soft-deleted tagId via admin API.
   *
   * Business context: Product catalog managers (admins) must not be able to
   * retrieve deleted or never-created product tags. This is essential for
   * preserving data consistency and ensuring soft-deleted records are hidden in
   * admin-facing management UIs and integration scenarios.
   *
   * Test steps:
   *
   * 1. Register and authenticate an admin account (for access to protected
   *    endpoints).
   * 2. Try GETting a random tagId that cannot exist, assert error is thrown (404
   *    or domain error expected).
   * 3. Create a product tag, assert creation is successful.
   * 4. Soft-delete the tag by id (erase), assert call succeeds.
   * 5. Attempt to GET the deleted tag by id, assert error is thrown (resource is
   *    not visible after deletion).
   */

  // 1. Register and authenticate admin user
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(64),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@admin.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Attempt to GET a non-existent tag by random UUID
  await TestValidator.error(
    "should return error for non-existent product tag",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.at(
        connection,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Create a valid product tag
  const created =
    await api.functional.shoppingMallAiBackend.admin.productTags.create(
      connection,
      {
        body: {
          tag_name: RandomGenerator.name(2),
          tag_code: RandomGenerator.alphaNumeric(10),
        } satisfies IShoppingMallAiBackendProductTag.ICreate,
      },
    );
  typia.assert(created);

  // 4. Soft-delete the tag
  await api.functional.shoppingMallAiBackend.admin.productTags.erase(
    connection,
    {
      tagId: created.id as string & tags.Format<"uuid">,
    },
  );

  // 5. Attempt to GET the soft-deleted tag
  await TestValidator.error(
    "should return error for soft-deleted product tag",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.productTags.at(
        connection,
        {
          tagId: created.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
