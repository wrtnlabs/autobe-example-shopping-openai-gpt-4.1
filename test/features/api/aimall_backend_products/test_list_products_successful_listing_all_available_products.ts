import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * E2E test for public product listing endpoint GET /aimall-backend/products.
 *
 * This test verifies:
 *
 * 1. Public (unauthenticated) access to the product catalog endpoint succeeds with
 *    no authentication.
 * 2. Returned results are paginated as per IPageIAimallBackendProduct schema,
 *    including the pagination metadata.
 * 3. Every product record contains the required detail/summary fields: id,
 *    category_id, seller_id, title, description, main_thumbnail_uri, status,
 *    created_at, updated_at.
 * 4. All returned products are NOT in 'deleted' status (i.e., status !==
 *    'deleted'), and only published/available entries are shown. ('active' and
 *    'out_of_stock' are valid public statuses.)
 * 5. The endpoint enforces product visibility: no unpublished, deleted, or
 *    non-catalog entries are exposed.
 * 6. Handles empty product result as valid.
 */
export async function test_api_aimall_backend_products_test_list_products_successful_listing_all_available_products(
  connection: api.IConnection,
) {
  // 1. Request public product listing with no authentication
  const output = await api.functional.aimall_backend.products.index(connection);
  typia.assert(output);

  // 2. Pagination metadata validation
  TestValidator.predicate("pagination exists")(!!output.pagination);
  TestValidator.predicate("pagination current page positive")(
    output.pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive")(
    output.pagination.limit > 0,
  );
  TestValidator.predicate("pagination records non-negative")(
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages positive")(
    output.pagination.pages > 0,
  );

  // 3. Product array structure and field validation
  if (!Array.isArray(output.data)) {
    throw new Error("The output.data property must be an array of products");
  }
  for (const product of output.data) {
    // Every required field present and not null/undefined
    TestValidator.predicate("product id present and uuid")(
      typeof product.id === "string" && product.id.length > 0,
    );
    TestValidator.predicate("product category_id is uuid")(
      typeof product.category_id === "string" && product.category_id.length > 0,
    );
    TestValidator.predicate("product seller_id is uuid")(
      typeof product.seller_id === "string" && product.seller_id.length > 0,
    );
    TestValidator.predicate("product title present")(
      typeof product.title === "string" && product.title.length > 0,
    );
    TestValidator.predicate("status property present")(
      typeof product.status === "string" && product.status.length > 0,
    );
    TestValidator.predicate("created_at present")(
      typeof product.created_at === "string" && product.created_at.length > 0,
    );
    TestValidator.predicate("updated_at present")(
      typeof product.updated_at === "string" && product.updated_at.length > 0,
    );
    // description and main_thumbnail_uri optional but if present must be string
    if (product.description !== undefined && product.description !== null) {
      TestValidator.predicate("description is string")(
        typeof product.description === "string",
      );
    }
    if (
      product.main_thumbnail_uri !== undefined &&
      product.main_thumbnail_uri !== null
    ) {
      TestValidator.predicate("main_thumbnail_uri is string")(
        typeof product.main_thumbnail_uri === "string",
      );
    }
    // Product must NOT be deleted
    TestValidator.notEquals("product is not deleted")(product.status)(
      "deleted",
    );
    // Only public statuses ('active','out_of_stock') should be present
    TestValidator.predicate("publicly visible status")(
      product.status === "active" || product.status === "out_of_stock",
    );
  }
  // 4. Handles empty product set as a valid result
  TestValidator.predicate("data array exists and is array")(
    Array.isArray(output.data),
  );
}
