import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validates that the product catalog list endpoint only returns products that
 * are active/published, and excludes those marked as inactive or deleted.
 *
 * Business context: E-commerce platforms must not show buyers any draft,
 * unpublished, inactive, or deleted products for sale. This test enforces
 * product visibility rules by confirming the public product listing endpoint
 * hides such entries, even if they exist in the database.
 *
 * Process:
 *
 * 1. Create a product with status 'active' (published/listed)
 * 2. Create a second product with status 'deleted' (simulate soft deleted or
 *    disabled by admin)
 * 3. Call the product list endpoint as a public/unauthenticated user
 * 4. Assert that only the 'active' product appears in the result, and the
 *    'deleted' product (and by extension, any unpublished/inactive) does not.
 */
export async function test_api_aimall_backend_products_test_list_products_excludes_unpublished_and_deleted_products(
  connection: api.IConnection,
) {
  // 1. Create an 'active' (published) product
  const activeProductInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Active Test Product",
    description: "This product should be visible in listings.",
    status: "active",
  };
  const activeProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: activeProductInput,
    });
  typia.assert(activeProduct);

  // 2. Create a 'deleted' (hidden) product
  const deletedProductInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Deleted Test Product",
    description: "This product should be hidden.",
    status: "deleted",
  };
  const deletedProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: deletedProductInput,
    });
  typia.assert(deletedProduct);

  // 3. Fetch all products using the public API (does not require auth)
  const result = await api.functional.aimall_backend.products.index(connection);
  typia.assert(result);
  // 4. Validate the results - only the 'active' product should appear
  const ids = result.data.map((p) => p.id);
  TestValidator.predicate("only active product is listed")(
    ids.includes(activeProduct.id),
  );
  TestValidator.predicate("deleted product is NOT listed")(
    !ids.includes(deletedProduct.id),
  );

  // Optionally, validate that only products with 'active' status are returned
  TestValidator.predicate("all returned products are active")(
    result.data.every((p) => p.status === "active"),
  );
}
