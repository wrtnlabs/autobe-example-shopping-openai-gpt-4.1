import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate schema enforcement and error handling when an administrator attempts
 * to update a seller with invalid data.
 *
 * This test ensures that the seller update endpoint rejects invalid
 * modifications (such as malformed email or missing required fields) and
 * responds with proper validation errors. After creating a seller as a
 * prerequisite, the admin attempts to update using various combinations of
 * invalid data to verify robust input validation and error feedback.
 *
 * Steps:
 *
 * 1. Register a valid seller entity (dependency setup)
 * 2. Attempt a seller update with an invalid email format (should fail with a
 *    schema validation error)
 * 3. Attempt a seller update missing a required field (should fail with a schema
 *    validation error)
 * 4. Optionally, confirm the original seller record remains unchanged after each
 *    failed update
 */
export async function test_api_aimall_backend_administrator_sellers_test_update_seller_with_invalid_data_validation_failure(
  connection: api.IConnection,
) {
  // Step 1: Register a valid seller for negative test cases
  const validSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "TestSeller Validation",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: "010-1234-5678",
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(validSeller);

  // Step 2: Attempt update with invalid email format
  await TestValidator.error("schema validation - invalid email")(async () => {
    await api.functional.aimall_backend.administrator.sellers.update(
      connection,
      {
        sellerId: validSeller.id,
        body: {
          business_name: validSeller.business_name,
          email: "not-an-email-format", // invalid email
          contact_phone: validSeller.contact_phone,
          status: validSeller.status,
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendSeller.IUpdate,
      },
    );
  });

  // Step 3: Attempt update missing a required field (e.g., business_name omitted by using empty string)
  await TestValidator.error("schema validation - missing required field")(
    async () => {
      // We must keep TypeScript typings valid, so simulate missing field by passing empty string (since omitting required fields would cause TypeScript error and is not allowed per coding convention)
      await api.functional.aimall_backend.administrator.sellers.update(
        connection,
        {
          sellerId: validSeller.id,
          body: {
            business_name: "", // Not truly omitted, but empty string to force failure at runtime
            email: validSeller.email,
            contact_phone: validSeller.contact_phone,
            status: validSeller.status,
            updated_at: new Date().toISOString(),
          } satisfies IAimallBackendSeller.IUpdate,
        },
      );
    },
  );
}
