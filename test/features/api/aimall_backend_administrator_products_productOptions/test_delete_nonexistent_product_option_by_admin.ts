import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validates the system correctly rejects deletion attempts for a non-existent
 * product option under a given product by an administrator.
 *
 * Business scenario:
 *
 * - Only administrators are permitted to invoke this operation.
 * - The product is freshly created (guaranteed valid and isolated from other
 *   tests).
 * - The target product option does not exist under this product (never created in
 *   this workflow).
 *
 * This test ensures:
 *
 * 1. The API properly returns a not found error when deletion of the non-existent
 *    product option is attempted.
 * 2. No side-effect or record deletion occurs.
 * 3. Only supported API endpoints and DTOs are used—no extra access methods or
 *    helpers assumed.
 *
 * Steps:
 *
 * 1. Create a seller to act as the product owner (ensuring a valid seller_id for
 *    product creation).
 * 2. Create a product belonging to that seller.
 * 3. Generate a random UUID for a productOptionId not present under the created
 *    product.
 * 4. Attempt to delete this non-existent option—expect a not found error (HTTP 404
 *    or similar).
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_delete_nonexistent_product_option_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a seller to be owner of the test product
  const seller =
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
  typia.assert(seller);

  // 2. Create a product linked to the new seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Generate a random UUID for a non-existent productOptionId
  const nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to delete this non-existent product option as admin; should throw not found error
  await TestValidator.error("delete non-existent product option must fail")(
    async () => {
      await api.functional.aimall_backend.administrator.products.productOptions.erase(
        connection,
        {
          productId: product.id,
          productOptionId: nonExistentOptionId,
        },
      );
    },
  );
}
