import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_seller_create_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful creation of a product bundle/SKU by an
   * authenticated seller.
   *
   * 1. Register as seller and obtain authentication context.
   * 2. Create a product as the seller to get a valid productId.
   * 3. Use the returned productId to create a bundle (SKU/variant).
   * 4. Verify the created bundle matches the input and is linked to the parent
   *    product.
   */

  // 1. Seller registration
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches input",
    sellerAuth.seller.email,
    sellerInput.email,
  );

  // 2. Product creation
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 9 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 99,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(createdProduct);
  TestValidator.equals(
    "product title matches input",
    createdProduct.title,
    productInput.title,
  );
  TestValidator.equals(
    "product slug matches input",
    createdProduct.slug,
    productInput.slug,
  );

  // 3. Bundle creation (SKU/variant)
  const bundleInput = {
    shopping_mall_ai_backend_products_id: createdProduct.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: RandomGenerator.alphaNumeric(16),
    price: 10000 + Math.floor(Math.random() * 40001),
    inventory_policy: RandomGenerator.pick(["track", "ignore"] as const),
    is_active: true,
  } satisfies IShoppingMallAiBackendProductBundle.ICreate;
  const createdBundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: createdProduct.id,
        body: bundleInput,
      },
    );
  typia.assert(createdBundle);
  TestValidator.equals(
    "bundle product linkage is correct",
    createdBundle.shopping_mall_ai_backend_products_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "bundle name matches input",
    createdBundle.bundle_name,
    bundleInput.bundle_name,
  );
  TestValidator.equals(
    "bundle sku_code matches input",
    createdBundle.sku_code,
    bundleInput.sku_code,
  );
  TestValidator.equals(
    "bundle price matches input",
    createdBundle.price,
    bundleInput.price,
  );
  TestValidator.equals(
    "bundle inventory policy matches input",
    createdBundle.inventory_policy,
    bundleInput.inventory_policy,
  );
  TestValidator.equals(
    "bundle active status matches input",
    createdBundle.is_active,
    bundleInput.is_active,
  );
}
