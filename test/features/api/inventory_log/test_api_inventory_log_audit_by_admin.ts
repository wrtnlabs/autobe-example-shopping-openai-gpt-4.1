import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Comprehensive test for admin inventory audit logs on a product SKU.
 *
 * - Register admin and create category/product/SKU
 * - Simulate several inventory-affecting actions (just SKU creates, or with
 *   various status/threshold changes)
 * - Fetch inventory logs: default, paginated, filtered by
 *   change_type/actor_type/date/reason
 * - Check that logs reflect business actions, are paginated, filtered, and
 *   secured
 */
export async function test_api_inventory_log_audit_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Category create
  const categoryData = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryData },
  );
  typia.assert(category);

  // 3. Product create
  const productData = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productData },
  );
  typia.assert(product);

  // 4. SKU create
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    price: Math.round(Math.random() * 100000) + 10000,
    status: "active",
    low_stock_threshold: Math.floor(Math.random() * 10) + 1,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.admin.products.skus.create(
    connection,
    { productId: product.id, body: skuData },
  );
  typia.assert(sku);

  // Simulate inventory changes by re-creating SKU w/ changed fields; each create should generate new logs
  // Change status, then threshold, then price
  const statusChangeSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: { ...skuData, status: "blocked" },
    });
  typia.assert(statusChangeSku);

  const thresholdChangeSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: {
        ...skuData,
        low_stock_threshold: skuData.low_stock_threshold + 5,
      },
    });
  typia.assert(thresholdChangeSku);

  const priceChangeSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: { ...skuData, price: skuData.price + 5000 },
    });
  typia.assert(priceChangeSku);

  // 5. Audit log: default fetch
  const logsResponse =
    await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
      connection,
      { productId: product.id, skuId: sku.id, body: {} },
    );
  typia.assert(logsResponse);
  TestValidator.predicate(
    "should have at least one inventory log entry",
    logsResponse.data.length >= 1,
  );

  // Paginated fetch
  const paged =
    await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
      connection,
      { productId: product.id, skuId: sku.id, body: { page: 1, limit: 2 } },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination limit applied",
    paged.data.length,
    Math.min(2, logsResponse.data.length),
  );

  // change_type filter (if any logs have recognizable type)
  if (logsResponse.data[0]?.change_type) {
    const ctFiltered =
      await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: { change_type: logsResponse.data[0].change_type },
        },
      );
    typia.assert(ctFiltered);
    TestValidator.predicate(
      "change_type filter returns some entries",
      ctFiltered.data.length > 0,
    );
    // actor_type filter (should be 'admin')
    const actorFiltered =
      await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
        connection,
        { productId: product.id, skuId: sku.id, body: { actor_type: "admin" } },
      );
    typia.assert(actorFiltered);
    TestValidator.predicate(
      "actor_type=admin yields logs",
      actorFiltered.data.length > 0,
    );
  }

  // created_from/created_to filters
  if (logsResponse.data.length > 0) {
    const firstCreated = logsResponse.data[0].created_at;
    const lastCreated =
      logsResponse.data[logsResponse.data.length - 1].created_at;
    const timeFiltered =
      await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: { created_from: firstCreated, created_to: lastCreated },
        },
      );
    typia.assert(timeFiltered);
    TestValidator.predicate(
      "date range returns logs",
      timeFiltered.data.length > 0,
    );
  }

  // out-of-range page -> empty results
  const emptyPage =
    await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
      connection,
      { productId: product.id, skuId: sku.id, body: { page: 99, limit: 5 } },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page returns zero logs",
    emptyPage.data.length,
    0,
  );

  // Access control: unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch denied", async () => {
    await api.functional.shoppingMall.admin.products.skus.inventory.logs.index(
      unauthConn,
      { productId: product.id, skuId: sku.id, body: {} },
    );
  });
}
