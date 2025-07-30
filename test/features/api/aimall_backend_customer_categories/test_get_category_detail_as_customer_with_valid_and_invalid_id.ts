import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate category detail retrieval for a customer (success and failure).
 *
 * This test ensures that a customer can fetch product category details for a
 * valid category, and that the API responds correctly to invalid or nonexistent
 * IDs.
 *
 * 1. As a seller, create a new product category using the POST endpoint to obtain
 *    a valid category UUID. (Dependency)
 * 2. As a customer, fetch this category's details by GETting
 *    /aimall-backend/customer/categories/{categoryId} and verify all atomic
 *    fields on the response (id, parent_id, name, depth) are present and equal
 *    to what was created.
 * 3. Attempt to fetch a category with: a. a malformed (non-UUID) categoryId →
 *    should return a validation error. b. a syntactically
 *    valid-but-random/nonexistent categoryId → should return 404 error.
 * 4. Validate permissions/visibility: customer should only be able to get allowed
 *    categories (if business rules limited; with current API, just test that
 *    known and unknown access are enforced as shown above).
 */
export async function test_api_aimall_backend_customer_categories_test_get_category_detail_as_customer_with_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Create a category as seller
  const createdCategory =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        depth: 1,
        parent_id: null,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(createdCategory);

  // 2. Fetch detail as customer for valid ID
  const fetchedCategory =
    await api.functional.aimall_backend.customer.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(fetchedCategory);
  TestValidator.equals("category.id")(fetchedCategory.id)(createdCategory.id);
  TestValidator.equals("category.name")(fetchedCategory.name)(
    createdCategory.name,
  );
  TestValidator.equals("category.depth")(fetchedCategory.depth)(
    createdCategory.depth,
  );
  // parent_id may be omitted or null (for root)
  TestValidator.equals("category.parent_id")(fetchedCategory.parent_id ?? null)(
    createdCategory.parent_id ?? null,
  );

  // 3a. Error: malformed ID (non-UUID)
  await TestValidator.error("malformed categoryId throws validation error")(
    async () => {
      await api.functional.aimall_backend.customer.categories.at(connection, {
        categoryId: "not-a-uuid" as string & tags.Format<"uuid">,
      });
    },
  );

  // 3b. Error: valid-but-nonexistent UUID
  await TestValidator.error("nonexistent categoryId returns 404")(async () => {
    await api.functional.aimall_backend.customer.categories.at(connection, {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
