import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate error handling when updating a product using an invalid
 * (non-existent or deleted) productId as a seller.
 *
 * This test checks that the API does not allow updates to products that do not
 * exist or have been deleted and returns a proper error (e.g., 404 not found).
 * The seller will have valid credentials and may own existing products, but
 * will attempt to update an invalid productId. No data should be altered.
 *
 * Steps:
 *
 * 1. Register a seller account (dependency).
 * 2. Generate a random UUID for productId that does not correspond to any existing
 *    product (simulate "deleted" or "never existed").
 * 3. Attempt to update the product as the seller with valid input.
 * 4. Assert that an error occurs (preferably 404 not found) and no data is
 *    modified.
 * 5. Optionally, assert that no side effects occurred—since no get/list API is
 *    available, error assertion is sufficient.
 */
export async function test_api_aimall_backend_seller_products_test_update_product_with_invalid_product_id_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller (dependency: create valid seller credentials)
  const sellerInput = {
    business_name: RandomGenerator.alphabets(10),
    email: RandomGenerator.alphabets(8) + "@autotest.com",
    contact_phone: "010-" + typia.random<string>() + "-9999",
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Generate a random, non-existent productId
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();

  // 3. Compose a valid update body (data is valid, but productId is invalid)
  const updateBody = {
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()()(1),
    status: "inactive",
  } satisfies IAimallBackendProduct.IUpdate;

  // 4. Attempt to update and expect an error (e.g., 404 not found)
  await TestValidator.error("update with invalid productId should fail")(
    async () => {
      await api.functional.aimall_backend.seller.products.update(connection, {
        productId: invalidProductId,
        body: updateBody,
      });
    },
  );
}
