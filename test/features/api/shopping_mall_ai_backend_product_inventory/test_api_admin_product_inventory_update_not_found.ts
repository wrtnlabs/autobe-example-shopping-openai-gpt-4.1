import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

export async function test_api_admin_product_inventory_update_not_found(
  connection: api.IConnection,
) {
  /**
   * Confirm that updating a non-existent inventory record for a product fails.
   *
   * - Register a new admin and obtain context
   * - Create a new product as the admin
   * - Attempt to update an inventory by a random non-existent inventoryId for
   *   this product
   * - Assert that the API rejects the update (not found error)
   *
   * This ensures the update endpoint checks for existence and does not silently
   * create or mutate inventory records when using invalid/ghost IDs.
   */

  // 1. Register a new admin account for authentication context
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@autobe-test.com`;
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a fresh product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: RandomGenerator.pick(["active", "draft"] as const),
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 0,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Compose an update attempt using a definitely random, non-existent inventory ID
  const nonExistentInventoryId = typia.random<string & tags.Format<"uuid">>();
  const inventoryUpdate: IShoppingMallAiBackendProductInventory.IUpdate = {
    available_quantity: 100,
    reserved_quantity: 0,
    inventory_status: "in_stock",
    last_update_at: new Date().toISOString(),
  };

  await TestValidator.error(
    "should fail to update a non-existent product inventory record",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.products.inventories.update(
        connection,
        {
          productId: product.id,
          inventoryId: nonExistentInventoryId,
          body: inventoryUpdate,
        },
      );
    },
  );
}
