import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate not-found error when fetching SKU details with invalid or mismatched
 * skuId
 *
 * This test verifies the system's behavior when an administrator attempts to
 * retrieve a SKU by ID for a product but provides a skuId that does not exist
 * or does not belong to the given product. It expects the backend to return a
 * not-found (404) error for the request.
 *
 * The workflow is as follows:
 *
 * 1. Register a new seller (admin context)
 * 2. Create a new product for that seller using a valid (random) category UUID
 * 3. Attempt to fetch a SKU from the new product, but with a skuId that is a
 *    random UUID (not associated with the product and almost certainly not a
 *    real SKU)
 * 4. Validate that the API returns an error (ideally 404 Not Found)
 *
 * Dependencies used: seller and product creation (to get productId; category_id
 * and seller_id are required for the product)
 */
export async function test_api_aimall_backend_administrator_products_skus_test_get_sku_detail_with_invalid_skuid_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(6),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a new product (requires valid category_id and seller_id)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Attempt to fetch SKU detail with invalid (random) skuId for this product
  const invalidSkuId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("SKU not found error")(() =>
    api.functional.aimall_backend.administrator.products.skus.at(connection, {
      productId: product.id,
      skuId: invalidSkuId,
    }),
  );
}
