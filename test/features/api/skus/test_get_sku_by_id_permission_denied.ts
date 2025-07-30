import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test forbidden access when a non-admin user attempts to fetch SKU details by
 * ID.
 *
 * This test ensures that the SKU fetch endpoint
 * `/aimall-backend/administrator/skus/{skuId}` properly enforces role-based
 * access restrictions.
 *
 * Business context: Only administrators are permitted to access SKU detail
 * endpoints in the AIMall backend for security and catalog integrity. Any
 * attempt by users with seller or customer roles to access these endpoints must
 * be blocked by the system.
 *
 * Steps:
 *
 * 1. As an admin, create a valid product (so SKU can be attached to it).
 * 2. As an admin, create a SKU record under the product.
 * 3. Simulate a role switch: Remove/admin login context (simulate
 *    seller/customer), removing admin privileges.
 * 4. Attempt to fetch the SKU by ID using the restricted endpoint as a non-admin.
 * 5. Verify a forbidden error (permission denied) is thrown—not a not-found, not
 *    an input error.
 * 6. Confirm that the SKU ID used is valid and would be accessible to an admin.
 *
 * Expected outcome: Permission denied error is thrown for non-admin role and
 * SKU data is never revealed in this context.
 */
export async function test_api_skus_test_get_sku_by_id_permission_denied(
  connection: api.IConnection,
) {
  // 1. Create a valid product as an administrator
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product for SKU Permission",
          description: "A test product to link SKU for permission test.",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a valid SKU for that product as an administrator
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: `PERM-SKU-${Math.floor(Math.random() * 100000)}`,
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  /**
   * 3. Simulate role switch: remove admin privileges. This step is required to
   *    imitate a non-admin (seller or customer). For e2e, this may be
   *    accomplished by clearing admin tokens or switching to a new
   *    unauthenticated or seller/customer-only connection. The code here
   *    assumes that the 'connection' object is mutable for test purposes and
   *    you can change/remove headers/roles as appropriate. In a real
   *    environment, you would re-authenticate as a non-admin or clear
   *    credentials. For example: connection.headers.Authorization = undefined;
   *    Assuming unauthorized context from this step onwards.
   */
  delete connection.headers?.Authorization;

  // 4. Attempt to access the SKU as a non-admin—should throw forbidden
  await TestValidator.error("forbidden for non-admin")(() =>
    api.functional.aimall_backend.administrator.skus.at(connection, {
      skuId: sku.id,
    }),
  );
}
