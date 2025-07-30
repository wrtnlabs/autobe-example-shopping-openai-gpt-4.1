import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that SKU creation is forbidden for non-administrator users.
 *
 * This test ensures that a user without administrator privileges (for example,
 * a customer, seller, or unauthenticated user) cannot create a SKU via the
 * administrator endpoint. The system must enforce role-based access control and
 * deny such requests, responding with an appropriate forbidden error.
 *
 * Steps:
 *
 * 1. Prepare a valid product as the SKU parent using the administrator endpoint
 *    (done as admin).
 * 2. Simulate a non-admin context by removing Authorization from connection
 *    headers.
 * 3. Attempt to create a SKU referencing the created product, using non-admin
 *    context.
 * 4. Ensure API responds with a forbidden error (authorization failure)—RBAC for
 *    SKU creation is enforced.
 */
export async function test_api_aimall_backend_administrator_skus_test_create_sku_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. Prepare a product as SKU parent (admin privileges)
  const productInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.alphaNumeric(20),
    description: RandomGenerator.paragraph()(),
    main_thumbnail_uri: undefined,
    status: "active",
  } satisfies IAimallBackendProduct.ICreate;
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 2. Simulate non-admin context (remove Authorization header)
  const nonAdminConnection = {
    ...connection,
    headers: Object.fromEntries(
      Object.entries(connection.headers ?? {}).filter(
        ([k]) => k.toLowerCase() !== "authorization",
      ),
    ),
  };

  // 3. Attempt to create SKU without admin rights
  const skuBody = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(16),
  } satisfies IAimallBackendSku.ICreate;

  // 4. Validate forbidden error is thrown (RBAC enforced)
  await TestValidator.error("RBAC: Non-admin SKU creation must be forbidden")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.create(
        nonAdminConnection,
        { body: skuBody },
      );
    },
  );
}
