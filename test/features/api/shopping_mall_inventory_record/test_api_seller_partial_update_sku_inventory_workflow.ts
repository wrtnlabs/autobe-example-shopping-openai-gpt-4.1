import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Seller workflow: partial inventory update for product SKU.
 *
 * Verifies seller can register, create a product under a category, add a SKU,
 * and apply PATCH to update only selected inventory fields for that SKU.
 *
 * Test Steps:
 *
 * 1. Seller registration (join).
 * 2. Admin creates a category.
 * 3. Seller creates a product in the category.
 * 4. Seller adds a SKU for the product.
 * 5. Seller partially updates inventory for the SKU (PATCH updatePartial with
 *    quantity_available).
 * 6. Validate that quantity_available is updated for the right SKU and product
 *    only.
 * 7. Negative quantity or invalid fields are properly rejected.
 * 8. Error scenarios: wrong SKU/product ID, attempts by an unauthorized user.
 *
 * Implementation:
 *
 * - Use random data generation for all inputs: seller join, category, product,
 *   SKU.
 * - Use PATCH /shoppingMall/seller/products/{productId}/skus/{skuId}/inventory
 *   with IShoppingMallInventoryRecord.IPartialUpdate (set new
 *   quantity_available, status, etc.)
 * - Assert business logic (non-negative quantities, proper association, seller
 *   authorization).
 * - Test error (await TestValidator.error) for invalid IDs, negative quantity,
 *   unauthenticated attempt.
 */
export async function test_api_seller_partial_update_sku_inventory_workflow(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Admin creates a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        description_ko: RandomGenerator.paragraph({ sentences: 2 }),
        description_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller creates a product under new category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerJoin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller adds a SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        price: Math.floor(Math.random() * 90000) + 10000,
        status: "active",
        low_stock_threshold: 5,
        main_image_url: null,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Seller partially updates inventory (increase quantity_available)
  const patchBody = {
    quantity_available: 50,
  } satisfies IShoppingMallInventoryRecord.IPartialUpdate;
  const inventory =
    await api.functional.shoppingMall.seller.products.skus.inventory.updatePartial(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: patchBody,
      },
    );
  typia.assert(inventory);
  TestValidator.equals(
    "quantity_available updated",
    inventory.quantity_available,
    50,
  );
  TestValidator.equals(
    "updated sku id",
    inventory.shopping_mall_product_sku_id,
    sku.id,
  );

  // 6. Negative quantity is rejected
  await TestValidator.error("negative quantity_available fails", async () => {
    await api.functional.shoppingMall.seller.products.skus.inventory.updatePartial(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: -10, // should fail business validation
        } satisfies IShoppingMallInventoryRecord.IPartialUpdate,
      },
    );
  });

  // 7. Bad SKU ID is rejected
  await TestValidator.error("invalid SKU ID fails", async () => {
    await api.functional.shoppingMall.seller.products.skus.inventory.updatePartial(
      connection,
      {
        productId: product.id,
        skuId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          quantity_available: 10,
        } satisfies IShoppingMallInventoryRecord.IPartialUpdate,
      },
    );
  });

  // 8. Bad product ID is rejected
  await TestValidator.error("invalid product ID fails", async () => {
    await api.functional.shoppingMall.seller.products.skus.inventory.updatePartial(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        skuId: sku.id,
        body: {
          quantity_available: 10,
        } satisfies IShoppingMallInventoryRecord.IPartialUpdate,
      },
    );
  });

  // 9. Attempt as unauthorized seller - join new seller and try patch (should fail)
  const sellerJoin2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin2);
  await TestValidator.error("patch by other seller unauthorized", async () => {
    await api.functional.shoppingMall.seller.products.skus.inventory.updatePartial(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: 15,
        } satisfies IShoppingMallInventoryRecord.IPartialUpdate,
      },
    );
  });
}
