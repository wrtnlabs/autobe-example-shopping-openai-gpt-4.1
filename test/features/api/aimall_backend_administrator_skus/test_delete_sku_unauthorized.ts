import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Verify that a SKU cannot be deleted by unauthorized (non-administrator)
 * users.
 *
 * This test confirms RBAC enforcement by attempting to delete a SKU from a
 * non-admin context (e.g., as a seller or customer). The operation must be
 * blocked and return an access denied/forbidden error. This ensures that only
 * users with administrator privileges can permanently remove SKUs, and that
 * unauthorized actors cannot disrupt catalog integrity by deleting stock
 * keeping units.
 *
 * Test Steps:
 *
 * 1. Create a product (using admin privilege; required to generate a valid SKU
 *    parent).
 * 2. Create a SKU linked to the product (admin privilege).
 * 3. (Simulate) Switch to a non-admin user context (customer or seller) -- as
 *    feasible in available API/environment.
 * 4. Attempt to delete the SKU using the non-admin user's credentials.
 * 5. Validate that the API call is rejected, raising a forbidden/access-denied
 *    error and not allowing actual deletion.
 */
export async function test_api_aimall_backend_administrator_skus_test_delete_sku_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a product as admin
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product for Unauthorized Delete",
          description:
            "Test product associated with SKU for unauthorized deletion check.",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // Step 2: Create a SKU for that product as admin
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: `SKU-${typia.random<string>()}`,
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // --- Simulate switching to a non-admin user ---
  // In a real test suite, you should use a connection with seller/customer credentials,
  // not administrator. Adjust according to available authentication APIs.
  // Here, we assume such a context is already present if supported.

  // Step 3: Attempt to delete SKU as unauthorized user and validate forbidden error
  await TestValidator.error("Only admin can delete SKU")(async () => {
    await api.functional.aimall_backend.administrator.skus.erase(connection, {
      skuId: sku.id,
    });
  });
}
