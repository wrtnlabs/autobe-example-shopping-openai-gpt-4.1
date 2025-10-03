import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller login business logic:
 *
 * 1. Register seller (join)
 * 2. Test login with correct password → should succeed and issue tokens
 * 3. Test login with incorrect password → should be rejected (error)
 *
 * Note: Soft-delete login validation is omitted here as there is no public API
 * for soft-deleting a seller within E2E scope.
 */
export async function test_api_seller_login_success_and_failure_flows(
  connection: api.IConnection,
) {
  // 1. Register seller
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();
  const profileName = RandomGenerator.name(2);
  const phone = RandomGenerator.mobile();

  const joinBody = {
    email,
    password,
    name,
    phone,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: profileName,
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(sellerAuthorized);
  TestValidator.equals(
    "newly joined profile_name matches",
    sellerAuthorized.profile_name,
    profileName,
  );
  TestValidator.equals(
    "correct channel assigned",
    sellerAuthorized.shopping_mall_section_id,
    sectionId,
  );

  // 2. Login with correct password (should succeed and issue token)
  const loginBody = {
    email,
    password,
    shopping_mall_channel_id: channelId,
  } satisfies IShoppingMallSeller.ILogin;
  const loginRes = await api.functional.auth.seller.login(connection, {
    body: loginBody,
  });
  typia.assert(loginRes);
  TestValidator.equals(
    "login profile name matches joined profile name",
    loginRes.profile_name,
    profileName,
  );
  TestValidator.equals(
    "login shopping_mall_section_id matches join",
    loginRes.shopping_mall_section_id,
    sectionId,
  );
  TestValidator.equals(
    "customer id matches after login",
    loginRes.shopping_mall_customer_id,
    sellerAuthorized.shopping_mall_customer_id,
  );
  TestValidator.notEquals(
    "token.access must not be empty",
    loginRes.token.access,
    "",
  );

  // 3. Login with wrong password (should throw error)
  const wrongPasswordBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    shopping_mall_channel_id: channelId,
  } satisfies IShoppingMallSeller.ILogin;
  await TestValidator.error(
    "should fail login with incorrect password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: wrongPasswordBody,
      });
    },
  );
}
