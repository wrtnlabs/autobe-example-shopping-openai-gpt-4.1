import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate that an administrator can retrieve all channels.
 *
 * This test checks the endpoint that returns the complete list of platform
 * channels for admin use. It ensures:
 *
 * 1. The returned structure is a valid paginated channel list
 *    (IPageIAimallBackendChannel).
 * 2. The "pagination" and "data" keys are present and have correct types.
 * 3. Each entry in "data" is a fully normalized IAimallBackendChannel with only
 *    schema properties present (no denormalized or computed fields).
 * 4. Correct types for all primary fields: id (uuid), code (string), name
 *    (string), enabled (boolean), created_at/updated_at (ISO 8601).
 * 5. Pagination metadata properties are integers and conform to schema contract.
 * 6. No authentication or prerequisite setup is required for this test scenario.
 */
export async function test_api_aimall_backend_administrator_channels_index(
  connection: api.IConnection,
) {
  // 1. Retrieve all channels as administrator
  const result =
    await api.functional.aimall_backend.administrator.channels.index(
      connection,
    );
  typia.assert(result);

  // 2. Validate top-level structure: pagination and data present
  TestValidator.predicate("pagination object present")(!!result.pagination);
  TestValidator.predicate("channels data array present")(
    Array.isArray(result.data),
  );

  // 3. Check schema contract for every channel entity in result.data
  for (const channel of result.data) {
    // Primary fields must be present and typed correctly
    TestValidator.predicate("id is uuid")(
      typeof channel.id === "string" && /^[0-9a-fA-F-]{36}$/.test(channel.id),
    );
    TestValidator.predicate("code is string")(typeof channel.code === "string");
    TestValidator.predicate("name is string")(typeof channel.name === "string");
    TestValidator.predicate("enabled is boolean")(
      typeof channel.enabled === "boolean",
    );
    TestValidator.predicate("created_at is ISO 8601")(
      typeof channel.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          channel.created_at,
        ),
    );
    TestValidator.predicate("updated_at is ISO 8601")(
      typeof channel.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          channel.updated_at,
        ),
    );

    // Ensure no extra properties exist on channel object
    TestValidator.equals("no extra fields in channel object")(
      Object.keys(channel).sort(),
    )(["id", "code", "name", "enabled", "created_at", "updated_at"].sort());
  }

  // 4. Validate pagination metadata types
  TestValidator.predicate("pagination current is int")(
    Number.isInteger(result.pagination.current),
  );
  TestValidator.predicate("pagination limit is int")(
    Number.isInteger(result.pagination.limit),
  );
  TestValidator.predicate("pagination records is int")(
    Number.isInteger(result.pagination.records),
  );
  TestValidator.predicate("pagination pages is int")(
    Number.isInteger(result.pagination.pages),
  );
}
