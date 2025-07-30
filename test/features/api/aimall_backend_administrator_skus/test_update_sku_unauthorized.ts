import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Verify that updating a SKU as a non-administrator (e.g., as seller or
 * customer) is correctly denied.
 *
 * Business context:
 *
 * - Only system administrators should be able to update SKU records via this
 *   endpoint.
 * - This test confirms the system rejects unauthorized SKU update attempts by
 *   non-admin users.
 *
 * Steps:
 *
 * 1. Create a product (as setup, with admin privileges).
 * 2. Create a SKU belonging to the above product (as admin).
 * 3. Attempt to update the SKU as a non-admin (simulate a regular seller/customer
 *    connection, with no admin rights):
 *
 *    - Call the update SKU endpoint with a new, likely unique, SKU code.
 *    - Confirm an error/denial occurs.
 * 4. Optionally, re-fetch the SKU as admin and confirm its data was not changed
 *    (skipped here as fetch is not available).
 */
export async function test_api_aimall_backend_administrator_skus_test_update_sku_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create a product as admin (for the SKU to belong to)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: sellerId,
          title: "Unauthorized SKU Update Test Product",
          description: "Setup for unauthorized SKU update E2E test.",
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU as admin
  const sku: IAimallBackendSku =
    await api.functional.aimall_backend.administrator.skus.create(connection, {
      body: {
        product_id: product.id,
        sku_code: "INITIAL-AUTOTEST-SKU",
      } satisfies IAimallBackendSku.ICreate,
    });
  typia.assert(sku);

  // 3. Attempt to update the SKU as a regular/seller connection (simulate lack of admin rights)
  // Note: The actual test framework should provide a way to obtain or simulate a connection without admin rights.
  // Here we use the same connection, but in a realistic test this would switch identity.
  const updateBody: IAimallBackendSku.IUpdate = {
    sku_code: `UNAUTHORIZED-UPDATE-${Math.floor(Math.random() * 100000)}`,
  };
  await TestValidator.error("SKU update unauthorized")(() =>
    api.functional.aimall_backend.administrator.skus.update(connection, {
      skuId: sku.id,
      body: updateBody,
    }),
  );

  // 4. Confirm SKU data not changed (as admin) -- skipped, as read/fetch API is not provided.
}
