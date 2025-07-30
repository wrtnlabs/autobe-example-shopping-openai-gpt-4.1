import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Test updating a category's name to a duplicate among its siblings.
 *
 * This test verifies that the API enforces the uniqueness of category names
 * among siblings (categories sharing the same parent_id), not only during
 * creation but also when updating an existing category's name. The test:
 *
 * 1. Creates a parent category (P) using the admin endpoint.
 * 2. Under parent P, creates two child categories: C1 (name: "Foo") and C2 (name:
 *    "Bar").
 * 3. Attempts to update C2's name to "Foo" using the seller endpoint, which would
 *    conflict with sibling C1.
 * 4. Expects the operation to fail with a conflict or duplicate error (422/409),
 *    proving uniqueness constraints are enforced on update.
 *
 * Steps:
 *
 * - Create parent category (P)
 * - Create child category C1 (name: "Foo", parent: P)
 * - Create child category C2 (name: "Bar", parent: P)
 * - Try updating C2's name to "Foo" via the seller update endpoint
 * - Assert that the API throws an error (TestValidator.error)
 */
export async function test_api_aimall_backend_seller_categories_test_update_category_with_duplicate_name_among_siblings_seller(
  connection: api.IConnection,
) {
  // 1. Create parent category P
  const parent =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "Parent Category",
          parent_id: null,
          depth: 1,
        },
      },
    );
  typia.assert(parent);

  // 2. Create child category C1 under P (name: "Foo")
  const c1 =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "Foo",
          parent_id: parent.id,
          depth: parent.depth + 1,
        },
      },
    );
  typia.assert(c1);

  // 3. Create child category C2 under P (name: "Bar")
  const c2 =
    await api.functional.aimall_backend.administrator.categories.create(
      connection,
      {
        body: {
          name: "Bar",
          parent_id: parent.id,
          depth: parent.depth + 1,
        },
      },
    );
  typia.assert(c2);

  // 4. Try updating C2's name to "Foo" (same as C1) -- should be rejected
  await TestValidator.error("duplicate category name among siblings")(
    async () => {
      await api.functional.aimall_backend.seller.categories.update(connection, {
        categoryId: c2.id,
        body: {
          name: "Foo",
        },
      });
    },
  );
}
