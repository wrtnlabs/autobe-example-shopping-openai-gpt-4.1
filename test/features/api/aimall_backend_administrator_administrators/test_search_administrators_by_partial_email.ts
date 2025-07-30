import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IPageIAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates partial email search for administrator accounts.
 *
 * This test ensures that the administrator search endpoint correctly supports
 * partial (substring) matching on the email field.
 *
 * Business context: An admin dashboard may require searching for other
 * administrator accounts by providing only part of an email as a query. This
 * test ensures such functionality is robust, only includes relevant accounts,
 * and prevents false positives.
 *
 * Test Steps:
 *
 * 1. Create multiple administrator accounts with varied email addresses (some
 *    overlapping substring, others not).
 * 2. Select a substring from one created email as the search filter.
 * 3. Search administrator accounts with the filter substring in the email field.
 * 4. Ensure every search result contains the substring in its email, and all
 *    results belong to created accounts.
 * 5. Edge Case: Search with a substring that matches no created emails; verify
 *    that an empty result is returned.
 */
export async function test_api_aimall_backend_administrator_administrators_test_search_administrators_by_partial_email(
  connection: api.IConnection,
) {
  // 1. Create multiple administrator accounts with controlled emails
  const emails = [
    "filter_test_admin@domain.com", // Should match substring search
    "another_admin@other.com",
    "user_test_case@aimall.com",
    "irrelevant@nomatch.com", // Should not match the test substring below
  ];
  const permission_id = typia.random<string & tags.Format<"uuid">>();
  const createdAdmins: IAimallBackendAdministrator[] = [];
  for (const email of emails) {
    const admin =
      await api.functional.aimall_backend.administrator.administrators.create(
        connection,
        {
          body: {
            permission_id,
            email,
            name: RandomGenerator.name(),
            status: "active",
          } satisfies IAimallBackendAdministrator.ICreate,
        },
      );
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // 2. Choose a filter substring that should only match one admin
  const filterSubstring = "test_admin";

  // 3. Search for administrators containing the substring in email
  const searchResult =
    await api.functional.aimall_backend.administrator.administrators.search(
      connection,
      {
        body: {
          email: filterSubstring,
        } satisfies IAimallBackendAdministrator.IRequest,
      },
    );
  typia.assert(searchResult);

  // 4. Validate every search result contains the substring and was created above
  for (const admin of searchResult.data) {
    TestValidator.predicate("email contains substring")(
      admin.email.includes(filterSubstring),
    );
    const isCreated = createdAdmins.some((ca) => ca.id === admin.id);
    TestValidator.predicate("admin is among created")(isCreated);
  }

  // 5. Edge Case: search with a non-matching substring
  const nonsenseSubstring = "xyznotfound";
  const negativeResult =
    await api.functional.aimall_backend.administrator.administrators.search(
      connection,
      {
        body: {
          email: nonsenseSubstring,
        } satisfies IAimallBackendAdministrator.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals("should be empty array for no matches")(
    negativeResult.data,
  )([]);
}
