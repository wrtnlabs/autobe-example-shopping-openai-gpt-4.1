import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";

/**
 * E2E test of administrator's ability to list product bundles for a specific
 * product.
 *
 * Scenario:
 *
 * 1. Set up: Create at least two sellers (to allow assignment of different sellers
 *    to products)
 * 2. Create at least three products with multiple sellers and categories
 * 3. Create at least two product bundles for one selected product (acting as a
 *    bundle group), using other products as bundle components, with a mix of
 *    required and optional components, and explicit quantities
 * 4. As administrator (using admin privileges), fetch the product bundles for the
 *    selected product and verify:
 *
 *    - All expected component associations exist in the returned list
 *    - The is_required and quantity fields match the creation input
 *    - The product/bundle-component relationships are accurate
 * 5. As an unauthorized user (simulate by blanking/removing authentication
 *    headers), attempt same bundle-retrieval call and confirm access is denied
 *    or error is thrown.
 *
 * Steps:
 *
 * - Use admin account to create sellers, products, and bundles
 * - Test main bundle-list endpoint (GET
 *   /aimall-backend/administrator/products/{productId}/productBundles)
 * - Cross-validate returned associations
 * - Attempt unauthorized call and expect error
 */
export async function test_api_aimall_backend_administrator_products_productBundles_index(
  connection: api.IConnection,
) {
  // 1. Set up sellers
  const seller1 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller1);
  const seller2 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller2);

  // 2. Create products (at least three - one to act as bundle group, two as bundle components)
  // Use random UUID for category_id (schema requires UUID but actual category existence not validated in test env)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const product1 =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller1.id,
          title: RandomGenerator.paragraph()(3),
          description: RandomGenerator.content()()(2),
          main_thumbnail_uri: undefined,
          status: "active",
        },
      },
    );
  typia.assert(product1);
  const product2 =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller2.id,
          title: RandomGenerator.paragraph()(3),
          description: RandomGenerator.content()()(2),
          main_thumbnail_uri: undefined,
          status: "active",
        },
      },
    );
  typia.assert(product2);
  const product3 =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller1.id,
          title: RandomGenerator.paragraph()(3),
          description: RandomGenerator.content()()(2),
          main_thumbnail_uri: undefined,
          status: "active",
        },
      },
    );
  typia.assert(product3);

  // 3. Create product bundles for product1 (using product2 and product3 as components)
  const bundle1 =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: product1.id,
        body: {
          bundle_product_id: product1.id,
          component_product_id: product2.id,
          is_required: true,
          quantity: 2,
        },
      },
    );
  typia.assert(bundle1);
  const bundle2 =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: product1.id,
        body: {
          bundle_product_id: product1.id,
          component_product_id: product3.id,
          is_required: false,
          quantity: 1,
        },
      },
    );
  typia.assert(bundle2);

  // 4. List bundles for product1 (as admin)
  const res =
    await api.functional.aimall_backend.administrator.products.productBundles.index(
      connection,
      {
        productId: product1.id,
      },
    );
  typia.assert(res);
  // The bundles list should contain both relationships just created
  const bundleIds = res.data.map((b) => b.id);
  TestValidator.predicate("bundles returned count")(bundleIds.length >= 2);
  // Find and validate associations
  const assoc1 = res.data.find(
    (b) =>
      b.bundle_product_id === product1.id &&
      b.component_product_id === product2.id,
  );
  TestValidator.predicate("bundle1 exists")(!!assoc1);
  if (assoc1) {
    TestValidator.equals("is_required")(assoc1.is_required)(true);
    TestValidator.equals("quantity")(assoc1.quantity)(2);
  }
  const assoc2 = res.data.find(
    (b) =>
      b.bundle_product_id === product1.id &&
      b.component_product_id === product3.id,
  );
  TestValidator.predicate("bundle2 exists")(!!assoc2);
  if (assoc2) {
    TestValidator.equals("is_required")(assoc2.is_required)(false);
    TestValidator.equals("quantity")(assoc2.quantity)(1);
  }

  // 5. Simulate unauthorized attempt (by blanking headers)
  const connUnauth = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot access admin bundles API",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.productBundles.index(
      connUnauth,
      {
        productId: product1.id,
      },
    );
  });
}
