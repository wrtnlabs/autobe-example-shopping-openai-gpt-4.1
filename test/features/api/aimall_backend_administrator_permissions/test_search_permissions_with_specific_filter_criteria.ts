import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";
import type { IPageIAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search and filtering of RBAC permission definitions in AIMall
 * Backend by administrator.
 *
 * This test validates searching with various criteria, including:
 *
 * - Filtering by exact code/name
 * - Partial matches in display_name
 * - Searching within certain creation date ranges
 *
 * Additionally, pagination fields are verified, as well as edge cases (like
 * zero results), and error handling for both invalid parameters and
 * unauthorized attempts.
 *
 * Steps:
 *
 * 1. Create several RBAC permission/role records with distinguishable name and
 *    display_name values.
 * 2. Search by exact code/name and verify correct result(s).
 * 3. Search by partial display_name and verify results include only expected
 *    matches.
 * 4. Search with a date range to verify proper filtering by created_at.
 * 5. Search with a combination of filters and validate the AND/OR behavior.
 * 6. Search with a filter that yields zero results and confirm response structure
 *    (empty data, correct pagination).
 * 7. Attempt search with invalid parameter (invalid page or limit, etc.) and
 *    expect error.
 * 8. (If possible) Attempt unauthorized access and expect error/denial (not
 *    technically possible in this test context).
 */
export async function test_api_aimall_backend_administrator_permissions_test_search_permissions_with_specific_filter_criteria(
  connection: api.IConnection,
) {
  // 1. Create several RBAC permissions with distinctive names, display_names, and descriptions
  const now = new Date();
  const permission1 =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      {
        body: {
          name: `test_role_${RandomGenerator.alphabets(8)}`,
          display_name: `Test Display Alpha ${RandomGenerator.alphabets(4)}`,
          description:
            "Alpha test role description " + RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(permission1);

  const permission2 =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      {
        body: {
          name: `test_role_${RandomGenerator.alphabets(8)}`,
          display_name: `Test Display Beta ${RandomGenerator.alphabets(4)}`,
          description:
            "Beta test role description " + RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(permission2);

  const permission3 =
    await api.functional.aimall_backend.administrator.permissions.create(
      connection,
      {
        body: {
          name: `other_role_${RandomGenerator.alphabets(8)}`,
          display_name: `Other Display Gamma ${RandomGenerator.alphabets(4)}`,
          description:
            "Gamma test role description " + RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(permission3);

  // 2. Search by exact code/name
  const result_by_name =
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          name: permission1.name,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result_by_name);
  TestValidator.predicate("result only contains permission1")(
    result_by_name.data.every((item) => item.name === permission1.name),
  );
  // Assert all result fields are present and correct id
  TestValidator.predicate("all fields present and id matches")(
    result_by_name.data.every(
      (item) =>
        ["id", "name", "display_name", "description", "created_at"].every(
          (field) => field in item,
        ) && item.id === permission1.id,
    ),
  );
  // Check pagination metadata
  TestValidator.predicate("pagination fields exist")(
    typeof result_by_name.pagination.current === "number" &&
      typeof result_by_name.pagination.limit === "number" &&
      typeof result_by_name.pagination.records === "number" &&
      typeof result_by_name.pagination.pages === "number",
  );

  // 3. Search by partial display_name (substring)
  const partial_display = permission2.display_name.substring(0, 13);
  const result_by_partial_display =
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          display_name: partial_display,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result_by_partial_display);
  TestValidator.predicate(
    "result includes at least permission2 for partial display match",
  )(
    result_by_partial_display.data.some(
      (item) => item.display_name === permission2.display_name,
    ),
  );

  // 4. Search by date range (should find all test records as they were just created)
  const created_at_from = new Date(now.getTime() - 1000 * 60 * 5).toISOString();
  const created_at_to = new Date(now.getTime() + 1000 * 60 * 5).toISOString();
  const result_by_date =
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          created_at_from,
          created_at_to,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result_by_date);
  TestValidator.predicate("all results are in date range")(
    result_by_date.data.every(
      (item) =>
        item.created_at >= created_at_from && item.created_at <= created_at_to,
    ),
  );
  // Also confirm at least one of our permissions is included
  TestValidator.predicate("test permissions included in range search")(
    result_by_date.data.some((item) =>
      [permission1.id, permission2.id, permission3.id].includes(item.id),
    ),
  );

  // 5. Combination filter: name + display_name
  const result_by_combo =
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          name: permission2.name,
          display_name: permission2.display_name,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result_by_combo);
  TestValidator.equals("result only matches filtered permission")(
    result_by_combo.data.length,
  )(1);
  TestValidator.equals("has expected permission")(result_by_combo.data[0].id)(
    permission2.id,
  );

  // 6. Negative test: search for non-existent name
  const result_none =
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          name: "non_existent_permission_code_xyz",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result_none);
  TestValidator.equals("zero results returns empty data array")(
    result_none.data.length,
  )(0);
  // Confirm pagination structure is still present
  TestValidator.predicate("zero results has pagination metadata")(
    typeof result_none.pagination === "object" &&
      typeof result_none.pagination.current === "number",
  );

  // 7. Error path: invalid pagination (page < 1)
  await TestValidator.error("invalid page value throws error")(async () => {
    await api.functional.aimall_backend.administrator.permissions.search(
      connection,
      {
        body: {
          page: 0, // page must >= 1 per IAimallBackendPermission.IRequest
          limit: 10,
        },
      },
    );
  });

  // 8. (Not possible here) Unauthorized access test would go here if session switching supported
  // This test is omitted because privilege switch/logout is not possible within the E2E environment.
}
