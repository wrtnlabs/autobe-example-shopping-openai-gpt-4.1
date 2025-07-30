import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";

/**
 * Validate business logic and permission errors when creating a category as a
 * seller.
 *
 * This test verifies that the category creation API correctly enforces:
 *
 * - Business logic input validation (e.g., name length, depth values)
 * - RBAC/permission checks (reject unauthorized creation)
 * - Schema (UUID) format for parent_id
 *
 * TypeScript compilation error scenarios (omission of required fields, null or
 * wrong types) are omitted per E2E test system instructions.
 *
 * Steps:
 *
 * 1. Attempt category creation with a very long or unusual 'name' (should fail
 *    input validation if backend restricts length/charset).
 * 2. Attempt category creation with negative or zero 'depth' (should fail business
 *    logic if enforced).
 * 3. Attempt category creation as an unauthorized/anonymous user (should fail
 *    RBAC).
 * 4. Attempt category creation with a badly formatted 'parent_id' (should fail
 *    schema validation if not strictly typed in DTO).
 *
 * All failed attempts should result in error responses (runtime errors, not
 * type errors).
 */
export async function test_api_aimall_backend_seller_categories_test_create_category_as_seller_with_invalid_data_and_permission(
  connection: api.IConnection,
) {
  // 1. Name too long
  await TestValidator.error("name too long should return error")(async () => {
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "A".repeat(300),
        depth: 1,
      },
    });
  });

  // 2. Name with unusual/invalid chars
  await TestValidator.error("name with invalid chars should return error")(
    async () => {
      await api.functional.aimall_backend.seller.categories.create(connection, {
        body: {
          name: "Invalid!@#Name$%",
          depth: 1,
        },
      });
    },
  );

  // 3. Negative depth (should fail business logic)
  await TestValidator.error("negative depth should return error")(async () => {
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "ValidName",
        depth: -2,
      },
    });
  });

  // 4. Zero depth (not allowed by business logic)
  await TestValidator.error("zero depth should return error")(async () => {
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "ValidName",
        depth: 0,
      },
    });
  });

  // 5. Anonymous/unauthenticated access (simulate no auth header)
  const anonConnection = { ...connection, headers: {} } as api.IConnection;
  await TestValidator.error("anonymous user should not create category")(
    async () => {
      await api.functional.aimall_backend.seller.categories.create(
        anonConnection,
        {
          body: {
            name: "ValidName",
            depth: 1,
          },
        },
      );
    },
  );

  // 6. Invalid parent_id (format, if not strictly typed in DTO)
  await TestValidator.error("invalid parent_id UUID should return error")(
    async () => {
      await api.functional.aimall_backend.seller.categories.create(connection, {
        body: {
          parent_id: "not-a-uuid" as any,
          name: "ValidName",
          depth: 1,
        } as any, // Required to simulate if local TS type allows only uuid
      });
    },
  );
}
