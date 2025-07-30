import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate access control when attempting to update a product owned by another
 * seller.
 *
 * This test simulates two different sellers:
 *
 * - Seller A: will attempt (and should fail) to update a product
 * - Seller B: the legitimate owner/creator of the product
 *
 * Business context: The AIMall backend enforces that only the owner seller of a
 * product can perform updates to that product. Updates attempted by other
 * sellers must be rejected by the API with an authorization error.
 *
 * Workflow:
 *
 * 1. Register Seller A (will attempt unauthorized update)
 * 2. Register Seller B (the product owner)
 * 3. Create a product under Seller B
 * 4. Attempt to update Seller B's product as Seller A
 * 5. Confirm update is rejected with a permission/authorization error (e.g., 403
 *    Forbidden)
 *
 * The core assertion: Only the owning seller can update their own products. All
 * other sellers must be forbidden from updating records they do not own.
 */
export async function test_api_aimall_backend_seller_products_test_update_product_owned_by_another_seller(
  connection: api.IConnection,
) {
  // 1. Create Seller A (will attempt unauthorized update)
  const sellerACreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerACreate },
    );
  typia.assert(sellerA);

  // 2. Create Seller B (product owner)
  const sellerBCreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerBCreate },
    );
  typia.assert(sellerB);

  // 3. Create product under Seller B
  const productCreate: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerB.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 4. Attempt to update the product as Seller A (should fail due to access control)
  const updateBody: IAimallBackendProduct.IUpdate = {
    title: "UNAUTHORIZED ATTEMPT",
    description: "This update must not be allowed.",
  };
  await TestValidator.error("Only the owning seller can update the product")(
    async () => {
      // If your test infra supports simulating Seller A context (auth token), do it here
      await api.functional.aimall_backend.seller.products.update(connection, {
        productId: product.id,
        body: updateBody,
      });
    },
  );
}
