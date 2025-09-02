import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_update_success_seller_role(
  connection: api.IConnection,
) {
  /**
   * Test successful update of a seller-owned product bundle (SKU/variant).
   *
   * This test ensures that:
   *
   * 1. A new seller is registered (proper authentication established).
   * 2. A product is created under the seller account.
   * 3. A bundle is created for the product.
   * 4. The bundle is then updated by the seller, changing multiple fields:
   *
   *    - Bundle_name
   *    - Sku_code (must be new/unique)
   *    - Price
   *    - Inventory_policy
   *    - Is_active
   * 5. All changes are verified to be reflected in the returned bundle object.
   * 6. Ownership and product linkage are preserved (bundle's product ID remains
   *    the same).
   * 7. All business and technical assertions are validated via TestValidator and
   *    typia.assert.
   */

  // 1. Register & authenticate seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const authorization = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(authorization);

  // 2. Create a product under the seller
  const productInput = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 5,
    tax_code: "VAT2024",
    sort_priority: 2,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create a new bundle for this product
  const bundleCreate: IShoppingMallAiBackendProductBundle.ICreate = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: RandomGenerator.alphaNumeric(10),
    price: 22000,
    inventory_policy: "track",
    is_active: true,
  };
  const bundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleCreate,
      },
    );
  typia.assert(bundle);

  // 4. Prepare update (change all business attributes)
  const newSku = RandomGenerator.alphaNumeric(12);
  TestValidator.notEquals(
    "Updated sku_code must not match previous sku_code",
    newSku,
    bundle.sku_code,
  );
  const updateData: IShoppingMallAiBackendProductBundle.IUpdate = {
    bundle_name: RandomGenerator.name(3),
    sku_code: newSku,
    price: 33000,
    inventory_policy: "ignore",
    is_active: false,
  };

  // 5. Perform bundle update
  const updated =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.update(
      connection,
      {
        productId: product.id,
        bundleId: bundle.id,
        body: updateData,
      },
    );
  typia.assert(updated);

  // 6. Validate updated fields
  TestValidator.equals(
    "updated bundle_name matches",
    updated.bundle_name,
    updateData.bundle_name,
  );
  TestValidator.equals(
    "updated sku_code matches",
    updated.sku_code,
    updateData.sku_code,
  );
  TestValidator.equals(
    "updated price matches",
    updated.price,
    updateData.price,
  );
  TestValidator.equals(
    "updated inventory_policy matches",
    updated.inventory_policy,
    updateData.inventory_policy,
  );
  TestValidator.equals(
    "updated is_active matches",
    updated.is_active,
    updateData.is_active,
  );

  // 7. Product linkage unchanged
  TestValidator.equals(
    "product ID linkage remains the same",
    updated.shopping_mall_ai_backend_products_id,
    product.id,
  );
}
