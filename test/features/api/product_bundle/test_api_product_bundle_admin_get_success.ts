import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductBundle";

/**
 * Validate that an admin can retrieve full details of a specific product
 * bundle (SKU/variant) for a product.
 *
 * Business scenario:
 *
 * - Ensures admin authentication and access control by performing join.
 * - Verifies database integrity and relationship: Product must exist, and
 *   bundle must be linked to product.
 * - Checks retrieval endpoint returns all critical bundle fields (SKU, price,
 *   policy, activation, linkage).
 *
 * Steps:
 *
 * 1. Admin joins/registers and authenticates.
 * 2. Admin creates a product with valid, unique data.
 * 3. Admin creates a product bundle/SKU with distinct SKU and config.
 * 4. Admin GETs the bundle by productId and bundleId.
 * 5. Validate the retrieved data: All fields (SKU, price, inventory policy,
 *    is_active, linkage) match those from creation. Confirm strict type
 *    shape.
 */
export async function test_api_product_bundle_admin_get_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate password hash (never plain password)
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: passwordHash,
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  typia.assert(adminAuth.admin);

  // 2. Create a new product as admin
  const productInput = {
    title: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(24),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 7,
      sentenceMax: 16,
    }),
    product_type: RandomGenerator.alphabets(6),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 3. Create a bundle/SKU for the product
  const bundleInput = {
    shopping_mall_ai_backend_products_id: product.id,
    bundle_name: RandomGenerator.name(2),
    sku_code: RandomGenerator.alphaNumeric(16),
    price: 11990,
    inventory_policy: "track",
    is_active: true,
  } satisfies IShoppingMallAiBackendProductBundle.ICreate;
  const bundle =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.create(
      connection,
      { productId: product.id, body: bundleInput },
    );
  typia.assert(bundle);

  // 4. Retrieve bundle detail as admin by productId & bundleId
  const output =
    await api.functional.shoppingMallAiBackend.admin.products.bundles.at(
      connection,
      {
        productId: product.id,
        bundleId: bundle.id,
      },
    );
  typia.assert(output);

  // 5. Validate bundle details against creation
  TestValidator.equals("product bundle - id", output.id, bundle.id);
  TestValidator.equals(
    "product bundle - parent linkage",
    output.shopping_mall_ai_backend_products_id,
    product.id,
  );
  TestValidator.equals(
    "product bundle - SKU",
    output.sku_code,
    bundleInput.sku_code,
  );
  TestValidator.equals(
    "product bundle - name",
    output.bundle_name,
    bundleInput.bundle_name,
  );
  TestValidator.equals(
    "product bundle - price",
    output.price,
    bundleInput.price,
  );
  TestValidator.equals(
    "product bundle - inventory policy",
    output.inventory_policy,
    bundleInput.inventory_policy,
  );
  TestValidator.equals(
    "product bundle - is_active",
    output.is_active,
    bundleInput.is_active,
  );
}
