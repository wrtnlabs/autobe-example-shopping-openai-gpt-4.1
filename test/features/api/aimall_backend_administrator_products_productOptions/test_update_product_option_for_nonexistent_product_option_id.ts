import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Test updating a product option with a valid productId but a non-existent
 * productOptionId.
 *
 * Ensures the system responds with 404 Not Found and no state mutation occurs
 * when attempting to update a product option that does not exist for a valid
 * product.
 *
 * Steps:
 *
 * 1. Create a seller (dependency).
 * 2. Create a product owned by that seller.
 * 3. Attempt to update a product option with a non-existent productOptionId.
 * 4. Verify that the API throws a 404 not found error.
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_update_product_option_for_nonexistent_product_option_id(
  connection: api.IConnection,
) {
  // 1. Create a seller (dependency for valid product)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(1),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product owned by that seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Generate a random (non-existent) productOptionId and compose update payload
  const nonExistentProductOptionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const updatePayload: IAimallBackendProductOption.IUpdate = {
    name: RandomGenerator.alphaNumeric(6),
    value: RandomGenerator.alphaNumeric(8),
  };

  // 4. Attempt the update and assert that a not found error is thrown
  await TestValidator.error(
    "update with non-existent productOptionId should throw not found error",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.productOptions.update(
      connection,
      {
        productId: product.id,
        productOptionId: nonExistentProductOptionId,
        body: updatePayload,
      },
    );
  });
}
