import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Test prevention of duplicate sort_order within the same FAQ category.
 *
 * This test attempts to create two FAQ entries in the same category with
 * identical sort_order values. The first creation should succeed; the second
 * should fail with a uniqueness or validation error. This ensures that
 * (category, sort_order) acts as a unique constraint and preserves FAQ ordering
 * logic for UI and admin operations.
 *
 * Test steps:
 *
 * 1. Insert an FAQ entry with specific category and sort_order values.
 * 2. Attempt to insert another FAQ entry with the same category and identical
 *    sort_order value.
 * 3. Expect the second creation to be rejected by the API, typically with a
 *    conflict or validation error indicating the uniqueness constraint.
 *
 * Also validate that the initial FAQ is correctly inserted and assert type
 * safety on the resulting object.
 */
export async function test_api_aimall_backend_administrator_faqs_test_create_faq_with_duplicate_sort_order_in_category(
  connection: api.IConnection,
) {
  // 1. Prepare a category and sort_order for both entries
  const category = "category-" + RandomGenerator.alphaNumeric(8);
  const sort_order = typia.random<number & tags.Type<"int32">>();

  // 2. Create first FAQ entry
  const faq1 = await api.functional.aimall_backend.administrator.faqs.create(
    connection,
    {
      body: {
        question: "What is the test question 1?",
        answer: "This is an FAQ answer for uniqueness testing.",
        category,
        sort_order,
        visible: true,
      } satisfies IAimallBackendFaq.ICreate,
    },
  );
  typia.assert(faq1);
  TestValidator.equals("category matches")(faq1.category)(category);
  TestValidator.equals("sort_order matches")(faq1.sort_order)(sort_order);

  // 3. Attempt to create second FAQ entry with the same category and sort_order
  await TestValidator.error("Duplicate (category, sort_order) should fail")(
    () =>
      api.functional.aimall_backend.administrator.faqs.create(connection, {
        body: {
          question: "What is the test question 2?",
          answer: "This is another answer attempting duplicate sort_order.",
          category,
          sort_order,
          visible: true,
        } satisfies IAimallBackendFaq.ICreate,
      }),
  );
}
