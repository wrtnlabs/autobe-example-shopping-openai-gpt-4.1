import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

export async function test_api_product_bundle_seller_get_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Seller retrieves product bundle (SKU/variant) details and
   * verifies integrity.
   *
   * Validates that a seller, after authenticating and registering as a business
   * account, can:
   *
   * 1. Register a new product.
   * 2. Add a new bundle (SKU/variant) to that product.
   * 3. Retrieve the details of the created bundle using GET
   *    /shoppingMallAiBackend/seller/products/{productId}/bundles/{bundleId}.
   * 4. Assert that all major details in the fetched bundle match what was
   *    submitted during creation.
   *
   * Business rules: All operations require seller authentication and correct
   * linkage between product and bundle.
   */

  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessNo = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_registration_number: sellerBusinessNo,
      name: sellerName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerAuth);

  // 2. Create a product
  const productCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(product);

  // 3. Create a bundle (SKU/variant)
  const bundleCreate = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.paragraph({ sentences: 2 }),
    sku_code: RandomGenerator.alphaNumeric(16),
    price: 30000,
    inventory_policy: "track-stock",
    is_active: true,
  } satisfies IShoppingMallAiBackendProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.create(
      connection,
      {
        productId: product.id,
        body: bundleCreate,
      },
    );
  typia.assert(bundle);

  // 4. Fetch the bundle by its ID
  const fetched =
    await api.functional.shoppingMallAiBackend.seller.products.bundles.at(
      connection,
      {
        productId: product.id,
        bundleId: bundle.id,
      },
    );
  typia.assert(fetched);

  // 5. Assert all business details match those submitted at creation
  TestValidator.equals("bundle ID matches", fetched.id, bundle.id);
  TestValidator.equals(
    "product linkage matches",
    fetched.shopping_mall_ai_backend_products_id,
    bundleCreate.shopping_mall_ai_backend_products_id,
  );
  TestValidator.equals(
    "bundle name matches",
    fetched.bundle_name,
    bundleCreate.bundle_name,
  );
  TestValidator.equals(
    "SKU code matches",
    fetched.sku_code,
    bundleCreate.sku_code,
  );
  TestValidator.equals("price matches", fetched.price, bundleCreate.price);
  TestValidator.equals(
    "inventory policy matches",
    fetched.inventory_policy,
    bundleCreate.inventory_policy,
  );
  TestValidator.equals(
    "is_active matches",
    fetched.is_active,
    bundleCreate.is_active,
  );
}
