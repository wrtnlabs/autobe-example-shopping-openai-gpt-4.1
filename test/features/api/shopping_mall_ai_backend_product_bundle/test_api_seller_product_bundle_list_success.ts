import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";
import type { IPageIShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_product_bundle_list_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register a seller (acquire authentication)
   * 2. Create a product for this seller
   * 3. Create at least two product bundles for the product
   * 4. Retrieve the bundle list and verify relevant bundles are returned with
   *    correct summary information
   */

  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNum = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: sellerRegNum,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // 2. Create product
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "subscription",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "draft",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create two bundles for the product
  const bundleInputs: IShoppingMallAiBackendProductBundle.ICreate[] = [
    0, 1,
  ].map((idx) => ({
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: `Bundle ${idx + 1} - ${RandomGenerator.name(2)}`,
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 10000 + idx * 500,
    inventory_policy: RandomGenerator.pick([
      "track",
      "ignore",
      "inherit",
    ] as const),
    is_active: true,
  }));
  const createdBundles: IShoppingMallAiBackendProductBundle[] = [];
  for (const input of bundleInputs) {
    const bundle =
      await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
        connection,
        {
          productId: product.id,
          body: input,
        },
      );
    typia.assert(bundle);
    createdBundles.push(bundle);
  }

  // 4. Retrieve bundles list by PATCH endpoint
  const bundlesPage =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(bundlesPage);
  // Assert every created bundle is present in returned data
  for (const bundle of createdBundles) {
    const found = bundlesPage.data.find(
      (item) =>
        item.id === bundle.id &&
        item.bundle_name === bundle.bundle_name &&
        item.sku_code === bundle.sku_code &&
        item.price === bundle.price &&
        item.inventory_policy === bundle.inventory_policy &&
        item.is_active === bundle.is_active &&
        item.shopping_mall_ai_backend_products_id === product.id,
    );
    TestValidator.predicate(
      `Bundle with id=${bundle.id} should exist in returned summary`,
      !!found,
    );
  }
  // Assert pagination meta is present and correct
  TestValidator.predicate(
    "Pagination meta format is valid",
    typeof bundlesPage.pagination === "object" &&
      typeof bundlesPage.pagination.current === "number",
  );
  // Assert that at least two bundles are returned for the product
  TestValidator.predicate(
    "At least two bundles returned",
    bundlesPage.data.length >= 2,
  );
}
