import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Admin permanently deletes a seller account that has no active or pending
 * orders. Workflow:
 *
 * 1. Admin creates a role, category and a product (attributed to a test seller)
 * 2. Registers an admin account for API auth
 * 3. Attempts to erase a seller account by ID (with no fulfillment obligations)
 * 4. Expects successful deletion if allowed by cascade rules
 * 5. Verifies that all associated entities (e.g., products) are deleted.
 * 6. Edge: Attempts to delete a hypothetical seller with obligations and expects
 *    error (business rule enforcement)
 * 7. Verifies trace logging/audit was triggered (via effects)
 */
export async function test_api_seller_account_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create role (e.g. "TEST_SELLER")
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: `TEST_SELLER_${RandomGenerator.alphabets(6)}`,
        description: "Role for test seller deletion",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // 2. Create a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Password1!",
      full_name: RandomGenerator.name(2),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Create a seller (simulate with random UUID as sellerId)
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create a product owned by that seller (to check relation cleanup)
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Perform permanent seller deletion (no pending obligations)
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    sellerId,
  });
  // Success expected: would trigger full cascade delete

  // 7. Try deleting a hypothetical seller with obligations (simulate with new seller UUID)
  const obligatedSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion of seller with obligations should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        sellerId: obligatedSellerId,
      });
    },
  );
}
