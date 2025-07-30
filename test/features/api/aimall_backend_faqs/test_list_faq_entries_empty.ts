import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendFaq";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate retrieving the FAQ list when there are no FAQ entries in the
 * database.
 *
 * This test confirms the correct behavior of the FAQ list endpoint in a state
 * where the database is empty of FAQ entries:
 *
 * 1. Calls the FAQ list API endpoint with an empty database.
 * 2. Asserts the API response matches the IPageIAimallBackendFaq type.
 * 3. Confirms that the `data` field in the response is an empty array.
 * 4. Validates the presence and correctness of all pagination metadata fields
 *    (`current`, `limit`, `records`, `pages`) with values that logically
 *    represent an empty result set (e.g., `records` is 0, `pages` is 0 or 1).
 * 5. Ensures no schema or business logic violations occur in the empty result
 *    case.
 */
export async function test_api_aimall_backend_faqs_test_list_faq_entries_empty(
  connection: api.IConnection,
) {
  // 1. Call the FAQ list endpoint
  const output = await api.functional.aimall_backend.faqs.index(connection);
  typia.assert(output);

  // 2. Validate that data array is empty
  TestValidator.equals("no FAQ data present")(output.data.length)(0);

  // 3. Validate that pagination object exists and fields are valid
  TestValidator.predicate("pagination object present")(!!output.pagination);
  TestValidator.equals("no records should be present")(
    output.pagination.records,
  )(0);
  // Depending on system, pages may be 0 or 1 for empty state
  TestValidator.predicate("pages field is 0 or 1 for empty")(
    output.pagination.pages === 0 || output.pagination.pages === 1,
  );
  TestValidator.predicate("current page is a positive integer")(
    output.pagination.current >= 1,
  );
  TestValidator.predicate("limit is a positive integer")(
    output.pagination.limit > 0,
  );
}
