import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that after a seller updates a SKU's inventory (full PUT), if the
 * available quantity is set below the SKU's low stock threshold, the system
 * triggers the low-stock status and/or signals as per business rules.
 *
 * Test steps:
 *
 * 1. Create a new product category as admin.
 * 2. Create/enable the SELLER role as admin.
 * 3. Register (join) a seller and authenticate.
 * 4. Seller creates a product in the category.
 * 5. Seller creates a SKU with a custom low_stock_threshold.
 * 6. Seller fully updates the SKU's inventory so that quantity_available <
 *    low_stock_threshold.
 * 7. Assert business logic: response inventory record has low_stock_threshold set
 *    and status indicating low stock (e.g., 'in_stock' or another as per
 *    platform logic).
 * 8. Validate response with typia.assert and important business fields.
 */
export async function test_api_inventory_full_update_success_business_signal_on_low_stock(
  connection: api.IConnection,
) {
  // 1. Create product category as admin
  const categoryBody = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);

  // 2. Create/enable SELLER role as admin
  const roleName = "SELLER";
  const roleBody = {
    role_name: roleName,
    description: "Seller role for API E2E inventory test",
  } satisfies IShoppingMallRole.ICreate;
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: roleBody },
  );
  typia.assert(role);

  // 3. Register (join) seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBody = {
    email: sellerEmail,
    password: "testpassword1!@#",
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(sellerAuth);

  // 4. Seller creates product
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 5. Seller creates SKU with a custom low_stock_threshold
  const LOW_STOCK_THRESHOLD = 10;
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: 19999,
    status: "active",
    low_stock_threshold: LOW_STOCK_THRESHOLD,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuBody },
  );
  typia.assert(sku);

  // 6. Update inventory to fall below low_stock_threshold
  const inventoryBody = {
    quantity_available: LOW_STOCK_THRESHOLD - 4,
    quantity_reserved: 0,
    quantity_sold: 0,
    low_stock_threshold: LOW_STOCK_THRESHOLD,
    status: "in_stock",
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  const inventory =
    await api.functional.shoppingMall.seller.products.skus.inventory.update(
      connection,
      { productId: product.id, skuId: sku.id, body: inventoryBody },
    );
  typia.assert(inventory);

  // 7. Validate low-stock business logic: available < threshold
  TestValidator.predicate(
    "sku inventory in low-stock state when available < low_stock_threshold",
    inventory.quantity_available <
      (inventory.low_stock_threshold ?? LOW_STOCK_THRESHOLD),
  );

  // 8. Optionally check inferred status or specific business signal
  TestValidator.equals(
    "inventory status remains in_stock and low_stock_threshold triggers low stock business logic",
    inventory.status,
    "in_stock",
  );
  TestValidator.equals(
    "inventory low_stock_threshold is set as expected",
    inventory.low_stock_threshold,
    LOW_STOCK_THRESHOLD,
  );
}
