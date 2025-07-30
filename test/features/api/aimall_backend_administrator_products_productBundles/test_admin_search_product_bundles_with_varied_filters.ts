import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";
import type { IPageIAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching administrator product bundles using advanced filters and
 * pagination.
 *
 * This scenario simulates an administrator managing bundles for a catalog
 * product, and validates the advanced search API for product bundles in a
 * realistic admin workflow.
 *
 * Process:
 *
 * 1. Create static category_id and seller_id to link all products by foreign key.
 * 2. Create two component products (A & B) under the same category/seller.
 * 3. Create the master (bundle group) product under the same keys.
 * 4. Register two different bundle relationships for the master product
 *
 *    - One bundle (with component A), required, quantity 2
 *    - Another bundle (with component B), optional, quantity 1
 * 5. Search with empty filter (should return all bundles for the product)
 * 6. Search filtering by component_product_id (should match correct bundle)
 * 7. Filter by is_required true/false; check results are specific to requiredness
 * 8. Filter by quantity; ensure only those with that quantity are found
 * 9. Paginate for limit (page size) to confirm expected subset
 * 10. Impossible filter (random UUID as component) must return empty
 * 11. Invalid filters (negative limit or missing bundle_product_id) are rejected
 *     with error
 *
 * Edge cases:
 *
 * - Advanced filter by arbitrary date is not included (not in schema)
 *
 * Validation:
 *
 * - All API results are type-asserted (typia.assert)
 * - Filtered results checked for correctness using TestValidator helpers
 * - Error scenarios validated via TestValidator.error
 */
export async function test_api_aimall_backend_administrator_products_productBundles_test_admin_search_product_bundles_with_varied_filters(
  connection: api.IConnection,
) {
  // 1. Create static foreign keys for category/seller
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Create two component products
  const componentA =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: "Component Product A",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentA);

  const componentB =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: "Component Product B",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(componentB);

  // 3. Create master (bundle) product
  const masterProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title: "Master Bundle Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(masterProduct);

  // 4. Register bundle relationships - one required, one optional
  const bundleRequired =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: componentA.id,
          is_required: true,
          quantity: 2,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundleRequired);

  const bundleOptional =
    await api.functional.aimall_backend.administrator.products.productBundles.create(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: componentB.id,
          is_required: false,
          quantity: 1,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundleOptional);

  // 5. Search with empty filter (should return all bundles for the master product)
  const allBundles =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id },
      },
    );
  typia.assert(allBundles);
  TestValidator.predicate("all bundles returned")(allBundles.data.length >= 2);

  // 6. Filter by component_product_id
  const filterByComponentA =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: componentA.id,
        },
      },
    );
  typia.assert(filterByComponentA);
  TestValidator.predicate("component A only")(
    filterByComponentA.data.every(
      (x) => x.component_product_id === componentA.id,
    ),
  );

  // 7. Filter by is_required true
  const filterRequired =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id, is_required: true },
      },
    );
  typia.assert(filterRequired);
  TestValidator.predicate("required only")(
    filterRequired.data.every((x) => x.is_required === true),
  );

  // 8. Filter by is_required false
  const filterOptional =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id, is_required: false },
      },
    );
  typia.assert(filterOptional);
  TestValidator.predicate("optional only")(
    filterOptional.data.every((x) => x.is_required === false),
  );

  // 9. Filter by quantity
  const filterByQuantity =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id, quantity: 2 },
      },
    );
  typia.assert(filterByQuantity);
  TestValidator.predicate("quantity = 2")(
    filterByQuantity.data.every((x) => x.quantity === 2),
  );

  // 10. Pagination test (limit = 1)
  const pagedBundles =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id, limit: 1, page: 1 },
      },
    );
  typia.assert(pagedBundles);
  TestValidator.equals("pagination size")(pagedBundles.data.length)(1);

  // 11. Impossible filter (random UUID as component, not in bundles)
  const impossibleComponent =
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: {
          bundle_product_id: masterProduct.id,
          component_product_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(impossibleComponent);
  TestValidator.equals("impossible filter empty")(
    impossibleComponent.data.length,
  )(0);

  // 12. Invalid filter: negative limit
  await TestValidator.error("negative limit error")(async () => {
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: { bundle_product_id: masterProduct.id, limit: -1 as any },
      },
    );
  });

  // 13. Invalid filter: missing bundle_product_id
  await TestValidator.error("missing bundle_product_id")(async () => {
    await api.functional.aimall_backend.administrator.products.productBundles.search(
      connection,
      {
        productId: masterProduct.id,
        body: {} as any,
      },
    );
  });
}
