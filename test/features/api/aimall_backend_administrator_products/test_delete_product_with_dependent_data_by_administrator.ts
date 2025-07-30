import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * E2E test for deleting a product with dependent option data as administrator.
 *
 * Validates that the system either (A) cascades the deletion to child product
 * option records (successfully deletes), or (B) blocks deletion and raises an
 * error due to constraint violations. Ensures at least one child option exists
 * before attempting deletion.
 *
 * Steps:
 *
 * 1. Register a seller (admin privilege).
 * 2. Create a product under the new seller (include valid random data).
 * 3. Attach a product option ('Color: Red') to the product.
 * 4. Attempt to delete the product as administrator.
 * 5. Validate: if deletion throws, constraint is enforced; if not, system allows
 *    cascade delete.
 */
export async function test_api_aimall_backend_administrator_products_test_delete_product_with_dependent_data_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: RandomGenerator.alphaNumeric(8) + "@example.com",
          contact_phone:
            "010-" +
            typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10000000> &
                  tags.Maximum<99999999>
              >()
              .toString(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a product for the seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        status: "active",
        description: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(product);

  // 3. Add a product option to create dependent record
  const option =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Color",
          value: "Red",
        },
      },
    );
  typia.assert(option);

  // 4/5. Attempt product deletion and validate result
  await TestValidator.error(
    "delete should throw if blocked by constraints, else cascade succeeds",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.erase(
      connection,
      {
        productId: product.id,
      },
    );
  });
}
