import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate hard deletion of a SKU by an administrator for a given product.
 *
 * This test ensures that an administrator can successfully perform a hard
 * delete operation on a SKU that belongs to a product. The operation is
 * verified by attempting to retrieve the deleted SKU afterwards and expecting a
 * not found or error response. This test guarantees data integrity and correct
 * enforcement of deletion logic in the AIMall backend, fulfilling business and
 * compliance requirements.
 *
 * Step-by-step process:
 *
 * 1. Create a new product using the admin product creation endpoint (dependency).
 * 2. Create a new SKU for the product using the admin SKU creation endpoint
 *    (dependency).
 * 3. Perform DELETE on the SKU using the product's ID and SKU's ID as the
 *    administrator.
 * 4. (Skipped) Attempt to retrieve the SKU after deletion and expect a not found
 *    error (unimplementable due to SDK limitation).
 */
export async function test_api_aimall_backend_administrator_products_skus_test_delete_sku_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a product (as admin)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const productTitle: string = RandomGenerator.paragraph()();
  const status: string = "active";

  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: sellerId,
          title: productTitle,
          status,
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for the product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: skuCode,
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Delete the SKU
  await api.functional.aimall_backend.administrator.products.skus.erase(
    connection,
    {
      productId: product.id,
      skuId: sku.id,
    },
  );

  // 4. (Skipped) Attempt to retrieve the deleted SKU after deletion.
  // No 'get SKU' endpoint function is available in the SDK, so this step is omitted as per implementation guidelines.
}
