import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";

/**
 * E2E test: Seller cannot update inventory records of a product they do not
 * own.
 *
 * This test verifies that a seller is forbidden/unauthorized from updating
 * an inventory record belonging to a product owned by a different seller.
 * It ensures proper access control enforcement.
 *
 * Steps:
 *
 * 1. Seller A registers and obtains auth context
 * 2. Seller A creates a product
 * 3. Seller A adds an inventory record
 * 4. Seller B registers (switches context to Seller B)
 * 5. Seller B attempts to update Seller A's inventory (should fail)
 * 6. Confirm error is thrown (forbidden/unauthorized)
 * 7. (Omitted: Verifying inventory unchanged, as no GET endpoint is provided)
 */
export async function test_api_seller_product_inventory_update_for_other_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Seller A registers
  const sellerA_email = typia.random<string & tags.Format<"email">>();
  const sellerA_regNum = RandomGenerator.alphaNumeric(12);
  const sellerA_name = RandomGenerator.name();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerA_email,
      business_registration_number: sellerA_regNum,
      name: sellerA_name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a product
  const product_create: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 1 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: "TAX001",
    sort_priority: 0,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: product_create,
      },
    );
  typia.assert(product);

  // 3. Seller A creates inventory
  const inventory_create: IShoppingMallAiBackendProductInventory.ICreate = {
    available_quantity: 10,
    reserved_quantity: 0,
    last_update_at: new Date().toISOString(),
    inventory_status: "in_stock",
  };
  const inventory =
    await api.functional.shoppingMallAiBackend.seller.products.inventories.create(
      connection,
      {
        productId: product.id,
        body: inventory_create,
      },
    );
  typia.assert(inventory);

  // Store original inventory details (for reference only)
  const original_inventory = { ...inventory };

  // 4. Seller B registers (context switches)
  const sellerB_email = typia.random<string & tags.Format<"email">>();
  const sellerB_regNum = RandomGenerator.alphaNumeric(12);
  const sellerB_name = RandomGenerator.name();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerB_email,
      business_registration_number: sellerB_regNum,
      name: sellerB_name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 5. Seller B attempts forbidden update
  const updateData: IShoppingMallAiBackendProductInventory.IUpdate = {
    available_quantity: original_inventory.available_quantity + 5,
    reserved_quantity: 2,
    last_update_at: new Date().toISOString(),
    inventory_status: "reserved",
  };
  await TestValidator.error(
    "forbidden: seller B cannot update another seller's inventory",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.inventories.update(
        connection,
        {
          productId: product.id,
          inventoryId: inventory.id,
          body: updateData,
        },
      );
    },
  );
  // 6. (Omitted) -- Verifying unchanged inventory, as no GET endpoint is provided
}
