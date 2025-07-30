import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductBundle";
import type { IPageIAimallBackendProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProductBundle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced product bundle search with various filters for a seller
 * product.
 *
 * This test validates advanced filtering and pagination workflows for product
 * bundle search:
 *
 * 1. Create a main (bundle) product
 * 2. Create two component products
 * 3. Assign two bundle relationships (with different filters: is_required,
 *    quantity)
 * 4. Search by different filters (is_required, component_product_id, quantity)
 * 5. Verify only matching bundles are returned for each search
 * 6. Check pagination works as expected
 * 7. Edge case: impossible match (random UUID as component_product_id)
 * 8. Error case: invalid filter (negative quantity)
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_search_product_bundles_with_various_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Create main product (bundle group)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const mainProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(mainProduct);

  // 2. Create two component products
  const component1 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: RandomGenerator.alphaNumeric(10),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(component1);
  const component2 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: RandomGenerator.alphaNumeric(10),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(component2);

  // 3. Assign two bundle relationships: one required with higher qty, one optional with min qty
  const bundle1 =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          component_product_id: component1.id,
          is_required: true,
          quantity: 2,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle1);
  const bundle2 =
    await api.functional.aimall_backend.seller.products.productBundles.create(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          component_product_id: component2.id,
          is_required: false,
          quantity: 1,
        } satisfies IAimallBackendProductBundle.ICreate,
      },
    );
  typia.assert(bundle2);

  // 4-1. Search by is_required=true
  let searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          is_required: true,
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("required bundle only")(
    searchResult.data.length === 1 && searchResult.data[0].id === bundle1.id,
  );

  // 4-2. Search by is_required=false
  searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          is_required: false,
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("optional bundle only")(
    searchResult.data.length === 1 && searchResult.data[0].id === bundle2.id,
  );

  // 4-3. Search by component_product_id
  searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          component_product_id: component1.id,
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("only bundle1 for component1")(
    searchResult.data.length === 1 && searchResult.data[0].id === bundle1.id,
  );

  // 4-4. Search by minimum quantity (should only return bundle1)
  searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          quantity: 2,
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("only bundle1 for qty>=2")(
    searchResult.data.length === 1 && searchResult.data[0].id === bundle1.id,
  );

  // 5. Pagination test (limit=1)
  searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          limit: 1,
          page: 1,
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals("pagination size")(searchResult.data.length)(1);
  TestValidator.equals("pagination limit")(searchResult.pagination.limit)(1);

  // 6. Impossible match: random UUID as component_product_id
  searchResult =
    await api.functional.aimall_backend.seller.products.productBundles.search(
      connection,
      {
        productId: mainProduct.id,
        body: {
          bundle_product_id: mainProduct.id,
          component_product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendProductBundle.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals("impossible match, no results")(
    searchResult.data.length,
  )(0);

  // 7. Invalid filter: negative quantity
  await TestValidator.error("negative quantity triggers validation error")(
    async () => {
      await api.functional.aimall_backend.seller.products.productBundles.search(
        connection,
        {
          productId: mainProduct.id,
          body: {
            bundle_product_id: mainProduct.id,
            quantity: -1 as any,
          } as IAimallBackendProductBundle.IRequest,
        },
      );
    },
  );
}
