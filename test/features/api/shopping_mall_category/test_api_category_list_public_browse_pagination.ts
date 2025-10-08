import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test paginated and filtered public category browsing (via PATCH
 * /shoppingMall/categories).
 *
 * 1. Perform a normal paginated fetch with random limit/page settings (first page)
 * 2. Query by partial Korean name: fetch categories using substring of a real
 *    result's name_ko (case-insensitive partial match)
 * 3. Query by partial English name: fetch categories using substring of a real
 *    result's name_en
 * 4. Query by parent_id to confirm subcategory hierarchies
 * 5. Query with display_order filter and sort results ascending/descending
 * 6. Query with is_active set to false, expecting no active categories and only
 *    disabled ones (may be empty result if all active)
 * 7. Query with a nonsensical parent_id (random valid UUID but not used),
 *    expecting empty page
 * 8. Query with both partial name and parent_id, resulting in additional filtering
 * 9. Query with page set so high it's certain to exceed the dataset, expecting an
 *    empty results page
 * 10. Query very deep hierarchy: fetch children of an already nested subcategory
 *     (if hierarchy exists)
 *
 * Validate: correctness of data structure, pagination info, all IDs are valid
 * UUIDs, empty results for unreachable filters (parent_id, page overflow),
 * response typing using typia.assert.
 */
export async function test_api_category_list_public_browse_pagination(
  connection: api.IConnection,
) {
  // 1. Normal paginated fetch
  const fetchPage = 1;
  const fetchLimit = 10;
  const page: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: fetchPage,
        limit: fetchLimit,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page is 1",
    page.pagination.current === fetchPage,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page.pagination.limit === fetchLimit,
  );
  // At least some categories should exist for meaningful testing

  // 2. Query by partial Korean name
  if (page.data.length > 0) {
    const koreanName = page.data[0].name_ko;
    const koPartial =
      koreanName.length > 2
        ? koreanName.substring(1, Math.min(4, koreanName.length))
        : koreanName;
    const koResult: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          name_ko: koPartial,
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(koResult);
    for (const cat of koResult.data)
      TestValidator.predicate(
        "category name_ko contains partial",
        cat.name_ko.includes(koPartial),
      );
  }

  // 3. Query by partial English name
  if (page.data.length > 0) {
    const englishName = page.data[0].name_en;
    const enPartial =
      englishName.length > 2
        ? englishName.substring(0, Math.min(4, englishName.length))
        : englishName;
    const enResult: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          name_en: enPartial,
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(enResult);
    for (const cat of enResult.data)
      TestValidator.predicate(
        "category name_en contains partial",
        cat.name_en.includes(enPartial),
      );
  }

  // 4. Query by parent_id (get children under a root category)
  const parentWithChildren = page.data.find((cat) =>
    page.data.some((maybeChild) => maybeChild.parent_id === cat.id),
  );
  if (parentWithChildren) {
    const children: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          parent_id: parentWithChildren.id,
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(children);
    for (const child of children.data)
      TestValidator.equals(
        "child parent_id matches parent",
        child.parent_id,
        parentWithChildren.id,
      );
  }

  // 5. Query with display_order filtering & sort
  if (page.data.length > 0) {
    const displayOrder = page.data[0].display_order;
    const byDisplayOrder: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          display_order: displayOrder,
          sort: "display_order",
          order: "desc",
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(byDisplayOrder);
    if (byDisplayOrder.data.length > 0)
      for (const cat of byDisplayOrder.data)
        TestValidator.equals(
          "category display_order matches",
          cat.display_order,
          displayOrder,
        );
  }

  // 6. is_active=false (all inactive/disabled)
  const inactive: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        is_active: false,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(inactive);
  for (const cat of inactive.data)
    TestValidator.equals("category is inactive", cat.is_active, false);

  // 7. Nonsensical parent_id (random UUID that isn't used): expect 0 results
  const bogusParentId = typia.random<string & tags.Format<"uuid">>();
  const empty: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        parent_id: bogusParentId,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(empty);
  TestValidator.equals(
    "empty result page for bogus parent_id",
    empty.data.length,
    0,
  );

  // 8. Query with both partial name and parent_id (strong filter)
  if (parentWithChildren) {
    const subtreeCat = page.data.find(
      (cat) =>
        cat.parent_id === parentWithChildren.id && cat.name_ko.length >= 2,
    );
    if (subtreeCat) {
      const koPartialTwo = subtreeCat.name_ko.substring(0, 2);
      const strongFilterResult: IPageIShoppingMallCategory.ISummary =
        await api.functional.shoppingMall.categories.index(connection, {
          body: {
            name_ko: koPartialTwo,
            parent_id: parentWithChildren.id,
          } satisfies IShoppingMallCategory.IRequest,
        });
      typia.assert(strongFilterResult);
      for (const cat of strongFilterResult.data) {
        TestValidator.equals(
          "parent_id matches",
          cat.parent_id,
          parentWithChildren.id,
        );
        TestValidator.predicate(
          "name_ko includes partial",
          cat.name_ko.includes(koPartialTwo),
        );
      }
    }
  }

  // 9. Excessively high page number: expect empty result
  const overPage = page.pagination.pages + 100;
  const overflowPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: overPage,
        limit: fetchLimit,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(overflowPage);
  TestValidator.equals(
    "empty result for overflow page",
    overflowPage.data.length,
    0,
  );

  // 10. Deep hierarchy child query (if applicable)
  const deepChild = page.data.find((cat) => !!cat.parent_id);
  if (deepChild && deepChild.parent_id) {
    const deepChildren: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: {
          parent_id: deepChild.parent_id,
        } satisfies IShoppingMallCategory.IRequest,
      });
    typia.assert(deepChildren);
    for (const subcat of deepChildren.data)
      TestValidator.equals(
        "subcat parent_id matches",
        subcat.parent_id,
        deepChild.parent_id,
      );
  }
}
