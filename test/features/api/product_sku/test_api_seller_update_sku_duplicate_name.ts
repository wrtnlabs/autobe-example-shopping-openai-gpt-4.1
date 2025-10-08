import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that business rules prevent a seller from updating an SKU's name to
 * duplicate another SKU's name under the same product.
 *
 * 1. Register a new seller account, capturing the seller UUID for product
 *    association.
 * 2. Create an admin role ('SELLER') for assignment.
 * 3. Create a product category as required for product creation.
 * 4. Create a new product owned by the seller and categorized using the above
 *    category.
 * 5. Create two SKUs with distinct names (skuNameA, skuNameB) under the product.
 * 6. Attempt to update the second SKU (sku2) so that its name matches the first
 *    SKU's name (skuNameA).
 * 7. Expect a validation error that forbids duplicate SKU names within the same
 *    product.
 */
export async function test_api_seller_update_sku_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Register new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);

  // 2. Ensure the SELLER role exists (required for seller accounts and permissions)
  const roleBody = {
    role_name: "SELLER",
    description: "Seller role for e-commerce platform",
  } satisfies IShoppingMallRole.ICreate;
  const adminRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: roleBody,
    });
  typia.assert(adminRole);

  // 3. Create a category for the product
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

  // 4. Seller creates a product
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    is_active: true,
    main_image_url: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Create two SKUs with different names
  const skuNameA = RandomGenerator.name(2);
  const skuNameB = RandomGenerator.name(2) + "-B";
  const sku1Body = {
    sku_code: RandomGenerator.alphaNumeric(12),
    name: skuNameA,
    price: 61000,
    status: "active",
    main_image_url: undefined,
    low_stock_threshold: undefined,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2Body = {
    sku_code: RandomGenerator.alphaNumeric(12),
    name: skuNameB,
    price: 63000,
    status: "active",
    main_image_url: undefined,
    low_stock_threshold: undefined,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 6 & 7. Attempt to update sku2's name to match sku1's name, expect error
  await TestValidator.error(
    "should not allow SKU name duplication within product",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.update(
        connection,
        {
          productId: product.id,
          skuId: sku2.id,
          body: {
            name: skuNameA,
          } satisfies IShoppingMallProductSku.IUpdate,
        },
      );
    },
  );
}
