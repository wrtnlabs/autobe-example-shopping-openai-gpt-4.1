import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import type { IPageIShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful search of product categories as admin.
 *
 * Covers:
 *
 * 1. Admin registration for authentication
 * 2. Unfiltered query (get all)
 * 3. Filter by category_name (substring search)
 * 4. Filter by parent_id
 * 5. Filter by is_active (true/false)
 * 6. Filter by category_code (substring search)
 * 7. Pagination checks (multiple pages, custom size)
 *
 * For each: verifies only non-deleted categories are returned, responses
 * match search/filter params, and pagination meta is correct.
 */
export async function test_api_admin_product_category_search_success(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(14);

  const adminCreate = {
    username: adminUsername,
    password_hash: adminPassword,
    name: RandomGenerator.name(),
    email: adminEmail,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const joinResult = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(joinResult);
  TestValidator.predicate(
    "admin join returns valid token",
    joinResult.token.access.length > 0,
  );
  TestValidator.equals(
    "admin join result profile for username",
    joinResult.admin.username,
    adminUsername,
  );

  // 2. Unfiltered query
  const allCategories =
    await api.functional.shoppingMallAiBackend.admin.productCategories.index(
      connection,
      { body: {} },
    );
  typia.assert(allCategories);
  TestValidator.predicate(
    "categories result is array",
    Array.isArray(allCategories.data),
  );
  TestValidator.predicate(
    "every category is object",
    allCategories.data.every((c) => typeof c === "object" && c !== null),
  );
  TestValidator.predicate(
    "all categories are non-deleted",
    allCategories.data.every(
      (c) => c.deleted_at === null || c.deleted_at === undefined,
    ),
  );

  // 3. Filter by category_name (substring search, using value from an actual record if available)
  let categoryNameForFilter = undefined;
  if (allCategories.data.length > 0) {
    const sampleCategory = allCategories.data[0];
    categoryNameForFilter = RandomGenerator.substring(
      sampleCategory.category_name,
    );
    if (!categoryNameForFilter.trim())
      categoryNameForFilter = sampleCategory.category_name;
    const nameFilterResult =
      await api.functional.shoppingMallAiBackend.admin.productCategories.index(
        connection,
        {
          body: { category_name: categoryNameForFilter },
        },
      );
    typia.assert(nameFilterResult);
    TestValidator.predicate(
      `all categories contain filter substring '${categoryNameForFilter}'`,
      nameFilterResult.data.every((c) =>
        c.category_name.includes(categoryNameForFilter!),
      ),
    );
  }

  // 4. Filter by parent_id (if any exist)
  const sampleParent = allCategories.data.find(
    (c) => c.parent_id !== null && c.parent_id !== undefined,
  );
  if (sampleParent) {
    const parentId = sampleParent.parent_id!;
    const parentFilterResult =
      await api.functional.shoppingMallAiBackend.admin.productCategories.index(
        connection,
        {
          body: { parent_id: parentId },
        },
      );
    typia.assert(parentFilterResult);
    TestValidator.predicate(
      `all categories have parent_id = '${parentId}'`,
      parentFilterResult.data.length === 0 ||
        parentFilterResult.data.every((c) => c.parent_id === parentId),
    );
  }

  // 5. Filter by is_active true/false using literal union
  for (const isActive of [true, false] as const) {
    const activeFilterResult =
      await api.functional.shoppingMallAiBackend.admin.productCategories.index(
        connection,
        {
          body: { is_active: isActive },
        },
      );
    typia.assert(activeFilterResult);
    TestValidator.predicate(
      `all categories have is_active = ${isActive}`,
      activeFilterResult.data.length === 0 ||
        activeFilterResult.data.every((c) => c.is_active === isActive),
    );
    TestValidator.predicate(
      "active filter excludes deleted categories",
      activeFilterResult.data.every(
        (c) => c.deleted_at === null || c.deleted_at === undefined,
      ),
    );
  }

  // 6. Filter by category_code substring match
  if (allCategories.data.length > 0) {
    const sampleCategory = allCategories.data[0];
    let codeSubstring = RandomGenerator.substring(sampleCategory.category_code);
    if (!codeSubstring.trim()) codeSubstring = sampleCategory.category_code;
    const codeFilterResult =
      await api.functional.shoppingMallAiBackend.admin.productCategories.index(
        connection,
        {
          body: { category_code: codeSubstring },
        },
      );
    typia.assert(codeFilterResult);
    TestValidator.predicate(
      `all categories' code contains substring '${codeSubstring}'`,
      codeFilterResult.data.every((c) =>
        c.category_code.includes(codeSubstring),
      ),
    );
  }

  // 7. Pagination check: page 1, page 2, fixed limit
  const pagLimit = 3;
  const paged1 =
    await api.functional.shoppingMallAiBackend.admin.productCategories.index(
      connection,
      { body: { limit: pagLimit, page: 1 } },
    );
  const paged2 =
    await api.functional.shoppingMallAiBackend.admin.productCategories.index(
      connection,
      { body: { limit: pagLimit, page: 2 } },
    );
  typia.assert(paged1);
  typia.assert(paged2);
  TestValidator.equals("pagination 1 is page 1", paged1.pagination.current, 1);
  TestValidator.equals("pagination 2 is page 2", paged2.pagination.current, 2);
  TestValidator.equals(
    "pagination limit returned matches limit param",
    paged1.pagination.limit,
    pagLimit,
  );
  TestValidator.predicate(
    "paged1 & paged2 <= limit",
    paged1.data.length <= pagLimit && paged2.data.length <= pagLimit,
  );
  TestValidator.equals(
    "pagination total records matches all",
    paged1.pagination.records,
    allCategories.pagination.records,
  );
  TestValidator.equals(
    "pagination total pages matches all",
    paged1.pagination.pages,
    allCategories.pagination.pages,
  );

  // Final: all listed must not be soft-deleted
  TestValidator.predicate(
    "all listed are not soft-deleted",
    allCategories.data.every(
      (c) => c.deleted_at === null || c.deleted_at === undefined,
    ),
  );
}
