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
 * Validates that the API returns an empty bundle list for a product that has no
 * assigned bundles.
 *
 * Business context:
 *
 * - New sellers may create products that are not part of any bundle yet.
 * - It's essential for downstream systems and frontend UI to receive an empty
 *   result (not an error or null) when querying bundles for such products,
 *   along with correct pagination metadata.
 *
 * Workflow:
 *
 * 1. Register a new seller via the administrator route.
 * 2. Create a standalone product as that seller (without adding it to any bundle).
 * 3. Request the productBundles list for the new product via its productId.
 * 4. Assert that the response is a valid page object with .data = [] and correct
 *    pagination fields (records=0, pages=0, etc).
 */
export async function test_api_aimall_backend_seller_products_productBundles_test_list_product_bundles_with_no_bundles(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(12),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a standalone product (not assigned to any bundle)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.alphabets(10),
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 3. List product bundles for the new product (should be empty)
  const bundlesPage =
    await api.functional.aimall_backend.seller.products.productBundles.index(
      connection,
      {
        productId: product.id,
      },
    );
  typia.assert(bundlesPage);
  TestValidator.equals("empty bundle list")(bundlesPage.data)([]);
  TestValidator.equals("zero records")(bundlesPage.pagination.records)(0);
  TestValidator.equals("zero pages")(bundlesPage.pagination.pages)(0);
}
