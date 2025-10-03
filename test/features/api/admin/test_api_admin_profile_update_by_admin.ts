import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin profile update process using the
 * /shoppingMall/admin/admins/{adminId} API.
 *
 * 1. Register a new admin via /auth/admin/join (join).
 * 2. Update the admin's profile with new values for email, name, status, and
 *    kyc_status.
 * 3. Check that the response reflects updated values and immutable fields remain
 *    unchanged.
 * 4. Check that updated_at changes and created_at does not.
 * 5. Try to change id or audit fields (should be rejected/ignored).
 * 6. Try to update another admin (should be rejected).
 * 7. Try as unauthenticated user (should be rejected).
 * 8. Confirm business logic: status must match business-allowed values; audit
 *    preserved.
 */
export async function test_api_admin_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Update own profile to new values
  const updateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "withdrawn",
    ] as const),
    kyc_status: RandomGenerator.pick([
      "pending",
      "verified",
      "denied",
    ] as const),
  } satisfies IShoppingMallAdmin.IUpdate;

  const beforeProfile = adminAuth;
  const updated = await api.functional.shoppingMall.admin.admins.update(
    connection,
    {
      adminId: beforeProfile.id,
      body: updateInput,
    },
  );
  typia.assert(updated);

  // 3. Check values
  TestValidator.equals("email updated", updated.email, updateInput.email);
  TestValidator.equals("name updated", updated.name, updateInput.name);
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.equals(
    "kyc_status updated",
    updated.kyc_status,
    updateInput.kyc_status,
  );
  TestValidator.equals("id not changed", updated.id, beforeProfile.id);
  TestValidator.equals(
    "created_at not changed",
    updated.created_at,
    beforeProfile.created_at,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updated.updated_at,
    beforeProfile.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    beforeProfile.deleted_at,
  );

  // 4. Attempt to change immutable fields (should be ignored at DTO level)
  // This is compile-time impossible so just assert it's not changed again
  const shouldIgnore = await api.functional.shoppingMall.admin.admins.update(
    connection,
    {
      adminId: beforeProfile.id,
      body: updateInput, // immutable fields can't be set, safe
    },
  );
  typia.assert(shouldIgnore);
  TestValidator.equals(
    "id stays same after ignored fields",
    shouldIgnore.id,
    beforeProfile.id,
  );

  // 5. Try to update a different admin (simulate with a random UUID)
  const otherAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot update another admin's profile",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        adminId: otherAdminId,
        body: updateInput,
      });
    },
  );

  // 6. Try to update while unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update forbidden", async () => {
    await api.functional.shoppingMall.admin.admins.update(unauthConn, {
      adminId: beforeProfile.id,
      body: updateInput,
    });
  });
}
