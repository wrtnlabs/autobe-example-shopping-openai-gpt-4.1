import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate admin full inventory update on SKU (PUT): normal/edge/error flows.
 *
 * Steps:
 *
 * 1. Admin registration and login
 * 2. Category created
 * 3. Product created (using the new category)
 * 4. SKU created for the product
 * 5. Admin issues full PUT inventory update; verify all fields written
 * 6. Negative: Invalid negative/overflow values rejected
 * 7. Negative: Only admins can update (others denied)
 * 8. Negative: Non-existent SKU/update triggers error
 */
export async function test_api_inventory_full_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category
  const categoryBody = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Create a product in the category
  const productBody = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Create an SKU for the product
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    price: 19999,
    status: "active",
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Full PUT inventory update
  const newInventoryBody = {
    quantity_available: 100, // normal value
    quantity_reserved: 15,
    quantity_sold: 500,
    low_stock_threshold: 10,
    status: "in_stock",
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  const inventory: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.admin.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: newInventoryBody,
      },
    );
  typia.assert(inventory);
  TestValidator.equals(
    "sku id matches on inventory",
    inventory.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "quantity_available written",
    inventory.quantity_available,
    100,
  );
  TestValidator.equals(
    "quantity_reserved written",
    inventory.quantity_reserved,
    15,
  );
  TestValidator.equals("quantity_sold written", inventory.quantity_sold, 500);
  TestValidator.equals(
    "low_stock_threshold written",
    inventory.low_stock_threshold,
    10,
  );
  TestValidator.equals("status written", inventory.status, "in_stock");

  // 6. Negative test: negative values rejected
  await TestValidator.error(
    "negative quantity_available rejected",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.inventory.update(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: {
            quantity_available: -1 as number & tags.Type<"int32">,
            quantity_reserved: 1,
            quantity_sold: 1,
            low_stock_threshold: 1,
            status: "in_stock",
          } satisfies IShoppingMallInventoryRecord.IUpdate,
        },
      );
    },
  );
  await TestValidator.error("negative quantity_reserved rejected", async () => {
    await api.functional.shoppingMall.admin.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: 1,
          quantity_reserved: -2 as number & tags.Type<"int32">,
          quantity_sold: 1,
          low_stock_threshold: 1,
          status: "in_stock",
        } satisfies IShoppingMallInventoryRecord.IUpdate,
      },
    );
  });
  await TestValidator.error("negative quantity_sold rejected", async () => {
    await api.functional.shoppingMall.admin.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: 1,
          quantity_reserved: 1,
          quantity_sold: -3 as number & tags.Type<"int32">,
          low_stock_threshold: 1,
          status: "in_stock",
        } satisfies IShoppingMallInventoryRecord.IUpdate,
      },
    );
  });

  // 7. Error: Only admins can update
  // Simulate non-admin by using unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update inventory",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.inventory.update(
        unauthConn,
        {
          productId: product.id,
          skuId: sku.id,
          body: {
            quantity_available: 10,
            quantity_reserved: 20,
            quantity_sold: 30,
            low_stock_threshold: 5,
            status: "in_stock",
          } satisfies IShoppingMallInventoryRecord.IUpdate,
        },
      );
    },
  );

  // 8. Error: Non-existent SKU/product ids
  await TestValidator.error(
    "updating inventory for non-existent SKU fails",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.inventory.update(
        connection,
        {
          productId: product.id,
          skuId: typia.random<string & tags.Format<"uuid">>(),
          body: newInventoryBody,
        },
      );
    },
  );
  await TestValidator.error(
    "updating inventory for non-existent product fails",
    async () => {
      await api.functional.shoppingMall.admin.products.skus.inventory.update(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          skuId: sku.id,
          body: newInventoryBody,
        },
      );
    },
  );
}
