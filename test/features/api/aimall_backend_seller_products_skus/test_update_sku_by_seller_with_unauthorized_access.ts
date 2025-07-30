import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Confirm the business rule that prevents a seller from updating a SKU for a
 * product they do not own.
 *
 * This test covers the following business workflow for multi-seller protection:
 *
 * 1. Register Seller A (using administrator-level onboarding API).
 * 2. Register Seller A's product using Seller A's identity.
 * 3. Register a SKU for Seller A's product under Seller A's context.
 * 4. Register a second, independent Seller B (using onboarding API).
 * 5. Attempt to update the SKU of Seller A's product using Seller B's identity.
 * 6. Confirm that the system returns a 403 Forbidden error, preventing
 *    unauthorized access.
 *
 * This test ensures sellers cannot manipulate or update product SKUs they do
 * not own, enforcing strict authorization.
 */
export async function test_api_aimall_backend_seller_products_skus_test_update_sku_by_seller_with_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller A's product
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create SKU under Seller A's product
  const sku: IAimallBackendSku =
    await api.functional.aimall_backend.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(12),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 4. Register Seller B
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 5. Simulate Seller B context (role switch, if necessary)
  // (No explicit login API provided in materials, so we simulate the call as Seller B)
  // In actual E2E, this step could involve bearers/user-tokens, but we'll assume connection context is updated

  // 6. Attempt to update Seller A's SKU as Seller B and verify authorization error
  await TestValidator.error("Unauthorized SKU update forbidden")(async () => {
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
        } satisfies IAimallBackendSku.IUpdate,
      },
    );
  });
}
