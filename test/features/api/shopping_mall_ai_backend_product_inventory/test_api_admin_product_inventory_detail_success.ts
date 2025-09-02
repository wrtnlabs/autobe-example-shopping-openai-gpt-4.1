import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

/**
 * Validates that an authenticated admin user can retrieve the detailed
 * information for a specific product inventory record using productId and
 * inventoryId.
 *
 * Steps:
 *
 * 1. Register an admin account and log in using /auth/admin/join, storing the
 *    returned admin context.
 * 2. (Cannot create product, so use a random/simulated productId)
 * 3. Using the admin token, call
 *    /shoppingMallAiBackend/admin/products/{productId}/inventories to
 *    create a new inventory record; capture the returned inventoryId.
 * 4. Call
 *    /shoppingMallAiBackend/admin/products/{productId}/inventories/{inventoryId}
 *    with both productId and inventoryId to fetch the detail.
 * 5. Validate that all relevant fields from the fetch match what was created
 *    in step 3 (data integrity: available_quantity, reserved_quantity,
 *    inventory_status, last_update_at...).
 *
 * This covers a full stock management lookup scenario at admin permissions
 * level and ensures data path correctness from supply setup to retrieval.
 */
export async function test_api_admin_product_inventory_detail_success(
  connection: api.IConnection,
) {
  // 1. Admin join (register & login)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Prepare productId (simulated, since no create API is given)
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create inventory for product (as admin)
  const inventoryInput = {
    available_quantity: typia.random<number & tags.Type<"int32">>(),
    reserved_quantity: typia.random<number & tags.Type<"int32">>(),
    inventory_status: RandomGenerator.pick([
      "in_stock",
      "out_of_stock",
      "reserved",
      "discontinued",
    ] as const),
    last_update_at: new Date().toISOString(),
  } satisfies IShoppingMallAiBackendProductInventory.ICreate;

  const createdInventory =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.create(
      connection,
      {
        productId,
        body: inventoryInput,
      },
    );
  typia.assert(createdInventory);
  TestValidator.equals(
    "inventory create: product linkage",
    createdInventory.shopping_mall_ai_backend_products_id,
    productId,
  );

  // 4. Retrieve inventory detail by productId, inventoryId
  const fetched =
    await api.functional.shoppingMallAiBackend.admin.products.inventories.at(
      connection,
      {
        productId: productId,
        inventoryId: createdInventory.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(fetched);

  // 5. Validate all fields
  TestValidator.equals("inventory id matches", fetched.id, createdInventory.id);
  TestValidator.equals(
    "product id linkage matches",
    fetched.shopping_mall_ai_backend_products_id,
    productId,
  );
  TestValidator.equals(
    "available_quantity as created",
    fetched.available_quantity,
    inventoryInput.available_quantity,
  );
  TestValidator.equals(
    "reserved_quantity as created",
    fetched.reserved_quantity,
    inventoryInput.reserved_quantity,
  );
  TestValidator.equals(
    "inventory_status as created",
    fetched.inventory_status,
    inventoryInput.inventory_status,
  );
  TestValidator.equals(
    "last_update_at as created",
    fetched.last_update_at,
    inventoryInput.last_update_at,
  );
}
