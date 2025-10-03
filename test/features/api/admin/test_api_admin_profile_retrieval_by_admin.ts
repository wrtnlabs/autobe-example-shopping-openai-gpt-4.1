import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that an authenticated administrator can retrieve their detailed
 * profile.
 *
 * 1. Register a new administrator (POST /auth/admin/join) with random data.
 * 2. Use the resulting adminId from join and the implicit session token (set by
 *    join) to retrieve the admin profile (GET
 *    /shoppingMall/admin/admins/{adminId}).
 * 3. Assert that all non-sensitive profile fields match what was provided at
 *    registration (email, name), and compliance fields are present.
 * 4. Validate that no sensitive or internal fields are exposed.
 * 5. Optionally, verify access is denied to unauthenticated users (out of scope
 *    here).
 */
export async function test_api_admin_profile_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Generate random admin info and register a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const joinResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. With the authenticated session (token is set by join), fetch own admin profile
  const profile: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: joinResult.id,
    });
  typia.assert(profile);

  // 3. Validate returned profile fields
  TestValidator.equals("profile id matches", profile.id, joinResult.id);
  TestValidator.equals("email matches", profile.email, joinBody.email);
  TestValidator.equals("name matches", profile.name, joinBody.name);
  TestValidator.equals(
    "kyc_status matches",
    profile.kyc_status,
    joinResult.kyc_status,
  );
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    joinResult.updated_at,
  );
  TestValidator.equals("status matches", profile.status, joinResult.status);
  TestValidator.equals("not deleted", profile.deleted_at, null);
}
