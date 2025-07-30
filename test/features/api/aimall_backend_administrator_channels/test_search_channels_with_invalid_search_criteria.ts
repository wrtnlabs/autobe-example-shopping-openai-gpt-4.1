import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IPageIAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the behavior of the channel search API with invalid or empty search
 * criteria.
 *
 * This test verifies that the advanced channel search for administrators
 * (`PATCH /aimall-backend/administrator/channels`) strictly enforces request
 * validation, returning precise validation errors for:
 *
 * - Missing/empty request bodies,
 * - Out-of-range values for pagination fields,
 * - Invalid enum/string field values.
 *
 * Ensures that the API does not perform a search and the errors point out the
 * problematic fields.
 *
 * Steps:
 *
 * 1. Attempt to search channels with an empty request body; expect validation
 *    error.
 * 2. Search with page=0 (should fail: page must be >=1); expect validation error
 *    for 'page'.
 * 3. Search with a negative limit (should fail: limit must be >=1); expect
 *    validation error for 'limit'.
 * 4. Search with invalid 'sort_by' value (not an allowed enum); expect field
 *    validation error.
 * 5. Search with invalid 'sort_order' value (not 'asc' or 'desc'); expect field
 *    validation error.
 */
export async function test_api_aimall_backend_administrator_channels_test_search_channels_with_invalid_search_criteria(
  connection: api.IConnection,
) {
  // 1. Empty request body - expect body structure violation
  await TestValidator.error("empty search criteria must fail")(async () => {
    await api.functional.aimall_backend.administrator.channels.search(
      connection,
      // Intentionally providing empty object (invalid per DTO requirements)
      { body: {} as any },
    );
  });

  // 2. Invalid 'page' value: 0 (should be >= 1)
  await TestValidator.error("page=0 triggers validation error")(async () => {
    await api.functional.aimall_backend.administrator.channels.search(
      connection,
      {
        body: {
          page: 0,
          limit: 10,
        } as any,
      },
    );
  });

  // 3. Invalid 'limit' value: -10 (should be >= 1)
  await TestValidator.error("negative limit triggers validation error")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.search(
        connection,
        {
          body: {
            page: 1,
            limit: -10,
          } as any,
        },
      );
    },
  );

  // 4. Invalid 'sort_by' value (not allowed enum)
  await TestValidator.error("invalid sort_by value triggers validation error")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.search(
        connection,
        {
          body: {
            sort_by: "invalid_field",
          } as any,
        },
      );
    },
  );

  // 5. Invalid 'sort_order' value (not allowed enum)
  await TestValidator.error("invalid sort_order triggers validation error")(
    async () => {
      await api.functional.aimall_backend.administrator.channels.search(
        connection,
        {
          body: {
            sort_order: "upward",
          } as any,
        },
      );
    },
  );
}
