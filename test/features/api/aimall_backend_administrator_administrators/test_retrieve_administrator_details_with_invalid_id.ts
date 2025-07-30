import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate error handling for administrator details retrieval with invalid
 * administratorId.
 *
 * This test checks that the API correctly rejects requests for administrator
 * details with invalid (malformed or non-existent) administratorId path
 * parameter values.
 *
 * - Ensures input validation enforces UUID format for administratorId and rejects
 *   malformed values.
 * - Ensures no administrator details or sensitive data are leaked on error.
 * - Expects robust error production (validation error for malformed, 404 not
 *   found for well-formed random UUID).
 *
 * Steps:
 *
 * 1. Attempt with a clearly invalid administratorId (e.g., "not-a-uuid"),
 *    expecting a validation error.
 * 2. Attempt with a well-formed but non-existent UUID, expecting a 404 not found
 *    error.
 * 3. Ensure no data leakage in either scenario.
 */
export async function test_api_aimall_backend_administrator_administrators_test_retrieve_administrator_details_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Malformed administratorId: should trigger validation error
  await TestValidator.error("malformed UUID triggers validation error")(
    async () => {
      await api.functional.aimall_backend.administrator.administrators.at(
        connection,
        {
          administratorId: "not-a-uuid" as any, // intentionally invalid type
        },
      );
    },
  );

  // 2. Well-formed but non-existent UUID: should trigger 404 not found
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent UUID triggers 404")(async () => {
    await api.functional.aimall_backend.administrator.administrators.at(
      connection,
      {
        administratorId: randomUuid,
      },
    );
  });
}
