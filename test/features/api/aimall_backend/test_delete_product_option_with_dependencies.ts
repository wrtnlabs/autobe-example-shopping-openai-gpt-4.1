import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test that deletion of a product option fails if there are dependent records
 * (e.g., SKUs) referencing it.
 *
 * Business rationale:
 *
 * - Product options should not be deletable when linked to dependent entities
 *   (such as SKUs) to preserve referential integrity and fulfill
 *   catalog/business rules.
 *
 * This test simulates the following flow:
 *
 * 1. Create a seller to serve as the entity owner.
 * 2. Create a product under that seller.
 * 3. Attach a product option to the product.
 * 4. Register a SKU for the product (which, by catalog logic, means the SKU
 *    depends on the product option).
 * 5. Attempt to delete the product option. The operation should fail with an error
 *    due to the dependency.
 */
export async function test_api_aimall_backend_test_delete_product_option_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: RandomGenerator.alphaNumeric(10) + "@e2etest.com",
          contact_phone:
            "010-" +
            RandomGenerator.alphaNumeric(4) +
            "-" +
            RandomGenerator.alphaNumeric(4),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for that seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a product option attached to the product
  const option =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Color",
          value: "Red",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option);

  // 4. Create a SKU referencing the product (SKU implicitly references the option by catalog structure)
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(10),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Try to delete the product option -- should throw error due to referential integrity/business constraint.
  await TestValidator.error(
    "Deleting a product option referenced by a SKU should fail",
  )(() =>
    api.functional.aimall_backend.seller.products.productOptions.erase(
      connection,
      {
        productId: product.id,
        productOptionId: option.id,
      },
    ),
  );
}
