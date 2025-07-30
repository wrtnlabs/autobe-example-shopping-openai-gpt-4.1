import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Test hard deletion (erase) of a product option as an administrator.
 *
 * Business context: Administrators need the capability to permanently remove
 * (hard delete) variant options from products—e.g., when a color or size is
 * deactivated from the catalog. Once deleted, product options must be gone from
 * future queries (no soft deletion).
 *
 * Steps:
 *
 * 1. Register a new seller (required for product creation).
 * 2. Create a new product as the administrator under this newly created seller.
 * 3. As administrator, add a product option to the product (e.g., option name
 *    "Color", value "Red").
 * 4. Immediately delete this product option as administrator using the erase
 *    endpoint.
 * 5. (No product option listing endpoint available in SDK, so this check is
 *    skipped.)
 * 6. (Edge case) Confirm that deleting the same product option again results in an
 *    error (not found/404 or similar).
 *
 * Validations:
 *
 * - Product option is created successfully and assigned to the product.
 * - Product option is permanently erased.
 * - (If error handling is available) Deleting a non-existent option returns an
 *   error.
 */
export async function test_api_aimall_backend_test_delete_product_option_as_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product as the administrator
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.alphabets(12),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create a product option as the administrator
  const productOption =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
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
  typia.assert(productOption);

  // 4. Delete the product option as administrator
  await api.functional.aimall_backend.administrator.products.productOptions.erase(
    connection,
    {
      productId: product.id,
      productOptionId: productOption.id,
    },
  );

  // 5. (No product option listing endpoint available in SDK, so skip validation of retrieval)

  // 6. (Edge case) Confirm deleting again results in error (not found/404 or similar)
  await TestValidator.error("deleting non-existent option fails")(() =>
    api.functional.aimall_backend.administrator.products.productOptions.erase(
      connection,
      {
        productId: product.id,
        productOptionId: productOption.id,
      },
    ),
  );
}
