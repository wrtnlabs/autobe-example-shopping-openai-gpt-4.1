import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validates admin soft deletion with child constraint on categories.
 *
 * 1. Register an admin and authenticate
 * 2. Create a parent category
 * 3. Create a child category referencing the parent
 * 4. Attempt to soft-delete parent (should fail due to child)
 * 5. Soft-delete child category
 * 6. Successfully soft-delete parent
 * 7. Confirm deleted_at is set on soft-deleted categories (if retrievable)
 * 8. (If supported) Ensure no soft-deleted categories in category listings
 * 9. (If available) Audit log and admin action validation as comments
 */
export async function test_api_category_soft_delete_by_admin_with_child_and_product_constraints(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      // optional: status omitted for test happy-path (default handled by backend)
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a parent category
  const parent = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0 as number & tags.Type<"int32">,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(parent);

  // 3. Create a child category referencing parent
  const child = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: parent.id,
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0 as number & tags.Type<"int32">,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(child);

  // 4. Attempt to soft-delete parent (should fail)
  await TestValidator.error(
    "Fail to soft-delete parent category with child",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: parent.id,
      });
    },
  );

  // 5. Soft-delete the child
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: child.id,
  });

  // 6. Try to soft-delete parent again (should succeed)
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: parent.id,
  });

  // 7/8. Optionally, check listing for soft-deleted categories if listing API available
  // (API not provided in current context, so validation for soft-deleted visibility is skipped.)
  // 9. Optionally, check audit logs if API available (skipped)
}
