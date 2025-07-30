import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";
import type { IPageIAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendFaq";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate FAQ search returns empty results and correct pagination metadata for
 * non-matching filters.
 *
 * Ensures the advanced FAQ search endpoint correctly returns empty results and
 * appropriate pagination when no FAQs match the provided filter, covering both
 * the non-existent category scenario and the visible=true filter when all
 * inserted FAQs are invisible.
 *
 * Steps:
 *
 * 1. Create an FAQ entry with category "general" and visible set to false
 *    (admin-only/hidden).
 * 2. Search for FAQs using a category filter that does not exist
 *    ("nonexistent-category").
 *
 *    - Confirm that data is empty and pagination reports zero records/pages.
 * 3. Search for FAQs using visible=true (publicly visible only), when all entries
 *    are invisible.
 *
 *    - Confirm that data is empty and pagination reports zero records/pages.
 *
 * This test verifies both edge cases and robustness of the FAQ search endpoint
 * for empty result handling.
 */
export async function test_api_aimall_backend_faqs_test_search_faqs_with_no_results(
  connection: api.IConnection,
) {
  // 1. Create an FAQ with category="general" and visible=false
  const createdFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "How to use the feature?",
        answer: "This is how you use it...",
        category: "general",
        sort_order: 1,
        visible: false,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(createdFaq);

  // 2. Search FAQs for a non-existent category
  const categoryResult = await api.functional.aimall_backend.faqs.search(
    connection,
    {
      body: {
        category: "nonexistent-category",
      } satisfies IAimallBackendFaq.IRequest,
    },
  );
  typia.assert(categoryResult);
  TestValidator.equals("empty result for nonexistent category")(
    categoryResult.data.length,
  )(0);
  TestValidator.equals("zero records for nonexistent category")(
    categoryResult.pagination.records,
  )(0);
  TestValidator.equals("zero pages for nonexistent category")(
    categoryResult.pagination.pages,
  )(0);

  // 3. Search FAQs for visible=true when all are invisible
  const visibleResult = await api.functional.aimall_backend.faqs.search(
    connection,
    {
      body: {
        visible: true,
      } satisfies IAimallBackendFaq.IRequest,
    },
  );
  typia.assert(visibleResult);
  TestValidator.equals("empty result for visible=true when all invisible")(
    visibleResult.data.length,
  )(0);
  TestValidator.equals("zero records for visible=true when all invisible")(
    visibleResult.pagination.records,
  )(0);
  TestValidator.equals("zero pages for visible=true when all invisible")(
    visibleResult.pagination.pages,
  )(0);
}
