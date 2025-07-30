import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate creation of a product option (e.g., 'Color: Red') for a product as
 * an administrator.
 *
 * This test covers the full workflow needed so that a product option can be
 * created and confirmed:
 *
 * 1. Create a new product using administrator privileges (as required parent for a
 *    product option).
 * 2. Use the POST endpoint to create a product option for the product just
 *    created, with realistic name/value fields.
 * 3. Check that the returned product option is attached to the correct product,
 *    and all fields (id, product_id, name, value) are set and match inputs or
 *    expectations.
 *
 * Business context: All product options must be uniquely associated to
 * (product_id, name, value), and the administrator is allowed to create these
 * for any product for catalog management.
 *
 * Implementation Steps:
 *
 * - Create test data for both product and product option according to provided
 *   DTO requirements (using typia.random for uuids/text).
 * - Validate the output of both endpoints with typia.assert and targeted property
 *   checks.
 * - (If listing endpoint were available) Verify created option is present in
 *   product options list for the product (but skip as the endpoint is not
 *   listed).
 *
 * This test asserts both DTO/response conformance and functional correctness of
 * the option attachment logic.
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_admin_create_product_option_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new product as administrator
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productTitle = "E2E Option Test Product";
  const productStatus = "active";
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: categoryId,
    seller_id: sellerId,
    title: productTitle,
    status: productStatus,
    description: "A product created for option creation test.",
    main_thumbnail_uri: "https://cdn.test.local/product_thumb.jpg",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);
  TestValidator.equals("category match")(product.category_id)(categoryId);
  TestValidator.equals("seller match")(product.seller_id)(sellerId);
  TestValidator.equals("title match")(product.title)(productTitle);
  TestValidator.equals("status match")(product.status)(productStatus);

  // 2. Create an option for the product
  const optionName = "Color";
  const optionValue = "Red";
  const optionInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: optionName,
    value: optionValue,
  };
  const option =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);
  TestValidator.equals("option attached to product")(option.product_id)(
    product.id,
  );
  TestValidator.equals("option name")(option.name)(optionName);
  TestValidator.equals("option value")(option.value)(optionValue);
}
