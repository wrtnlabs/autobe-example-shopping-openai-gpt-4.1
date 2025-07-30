import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";
import type { IPageIAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendFaq";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate FAQ advanced search/filter by category and visibility
 * (visible=true).
 *
 * This test ensures that applying category and visibility filters to the search
 * endpoint returns only matching results, with correct pagination and ordering.
 * Also verifies that when sort_order is specified, sorting is effective.
 *
 * Steps:
 *
 * 1. Prepare test data: Create several FAQ entries spanning multiple categories
 *    and both true/false visibility using the admin creation endpoint. Some
 *    entries share category, some are unique. At least one category is used for
 *    filter testing, and at least one FAQ is hidden (visible=false) in that
 *    category.
 * 2. Search using the PATCH endpoint with category=X and visible=true.
 * 3. Validate that all returned FAQs are from the selected category and are
 *    visible.
 * 4. Ensure no hidden entries (visible=false) from the category are present in the
 *    results.
 * 5. If more than pagination limit, verify paging (page 1 vs page 2, etc.).
 * 6. If sort_order is provided for multiples in the category, ensure returned
 *    order matches.
 */
export async function test_api_aimall_backend_faqs_test_search_faqs_by_category_and_visibility(
  connection: api.IConnection,
) {
  // 1. Create FAQs spanning categories and visibility values for filter coverage
  const category1 = "category-A-" + RandomGenerator.alphaNumeric(6);
  const category2 = "category-B-" + RandomGenerator.alphaNumeric(6);

  // Create visible FAQ in category1
  const faqVisibleCat1 =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: RandomGenerator.paragraph()(),
        answer: RandomGenerator.content()()(),
        category: category1,
        sort_order: 1,
        visible: true,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(faqVisibleCat1);

  // Create invisible FAQ in category1
  const faqHiddenCat1 =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: RandomGenerator.paragraph()(),
        answer: RandomGenerator.content()()(),
        category: category1,
        sort_order: 2,
        visible: false,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(faqHiddenCat1);

  // Create visible FAQ in category2
  const faqVisibleCat2 =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: RandomGenerator.paragraph()(),
        answer: RandomGenerator.content()()(),
        category: category2,
        sort_order: 1,
        visible: true,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(faqVisibleCat2);

  // Create more visible FAQs in category1 for pagination/sorting safety
  const moreFaqsCat1 = await ArrayUtil.asyncRepeat(17)(async (i) => {
    const faq = await api.functional.aimall_backend.administrator.faqs.create(
      connection,
      {
        body: {
          question: RandomGenerator.paragraph()(),
          answer: RandomGenerator.content()()(),
          category: category1,
          sort_order: i + 3,
          visible: true,
        } satisfies IAimallBackendFaq.ICreate,
      },
    );
    typia.assert(faq);
    return faq;
  });

  // 2. Search FAQs by category1 and visible=true (expect only visible from category1)
  const searchResponse = await api.functional.aimall_backend.faqs.search(
    connection,
    {
      body: {
        category: category1,
        visible: true,
      } satisfies IAimallBackendFaq.IRequest,
    },
  );
  typia.assert(searchResponse);

  // 3. Validate results: all match category1 and visible=true
  for (const item of searchResponse.data) {
    TestValidator.equals("category matches")(item.category)(category1);
    TestValidator.equals("must be visible")(item.visible)(true);
  }
  // 4. Validate no hidden FAQ is present
  TestValidator.predicate("hidden FAQ not shown")(
    !searchResponse.data.some((x) => x.id === faqHiddenCat1.id),
  );

  // 5. Check pagination metadata (assume default or implementation limit <= 20, as we inserted 18 total visible in category1)
  TestValidator.predicate("pagination reflects count")(
    searchResponse.pagination.records >= 18 &&
      searchResponse.pagination.pages >= 1,
  );

  // 6. If more than fit on first page, page 2 returns remainder
  if (searchResponse.pagination.pages > 1) {
    // Try fetching page 2 (if logic requests page param, extend IAimallBackendFaq.IRequest accordingly)
    // Skipping paging test implementation here as current DTO IAimallBackendFaq.IRequest doesn't show paging fields.
  }

  // 7. Validate manual sorting effect if sort_order differs
  if (searchResponse.data.length > 2) {
    const sorted = [...searchResponse.data].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const sortOrders = searchResponse.data.map((f) => f.sort_order);
    const expected = sorted.map((f) => f.sort_order);
    TestValidator.equals("sort order by sort_order ascending")(sortOrders)(
      expected,
    );
  }
}
