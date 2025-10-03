import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Authenticate a customer immediately after registration.
 *
 * This test verifies the ability to login as a customer right after
 * registering, confirms issuance of access/refresh tokens, and checks that
 * login is denied for invalid credentials or logically deleted/suspended
 * accounts. All access tokens and returned profile fields are format-verified.
 * The business workflow is as follows:
 *
 * 1. Create a random channel UUID (simulating a shopping mall channel/tenant)
 * 2. Register (join) a customer for the channel with unique email, password, name,
 *    phone (all using format constraints)
 * 3. Attempt to login using exact email/password, validate the authorized customer
 *    response (typia.assert)
 * 4. Attempt to login with wrong password, expect an error (TestValidator.error)
 * 5. (Edge) Attempt login after "soft-deleting" by imitating deletion (if the
 *    deleted_at prop is modifiable/API supports, otherwise skip)
 * 6. Optionally test login denial if "status" can be updated to "suspended" (if
 *    API supports, skip otherwise) All properties in response must match DTO
 *    and tokens must have proper format/time validity.
 */
export async function test_api_customer_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Prepare channel (channel_id), email, password, etc
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();

  // Step 2: Register customer (join)
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email,
    password,
    name,
    phone,
  } satisfies IShoppingMallCustomer.IJoin;
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinRes);
  TestValidator.equals("join.email matches input", joinRes.email, email);
  TestValidator.equals("join.name matches input", joinRes.name, name);
  TestValidator.equals(
    "join.channel_id matches input",
    joinRes.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals("join.status is active", joinRes.status, "active");
  TestValidator.predicate(
    "authorization token present on join",
    typeof joinRes.token.access === "string" && joinRes.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present on join",
    typeof joinRes.token.refresh === "string" &&
      joinRes.token.refresh.length > 0,
  );
  typia.assert<IAuthorizationToken>(joinRes.token);

  // Step 3: Login with correct credentials
  const loginBody = {
    shopping_mall_channel_id: channelId,
    email,
    password,
  } satisfies IShoppingMallCustomer.ILogin;
  const loginRes = await api.functional.auth.customer.login(connection, {
    body: loginBody,
  });
  typia.assert(loginRes);
  TestValidator.equals("login.email matches input", loginRes.email, email);
  TestValidator.equals("login.name matches input", loginRes.name, name);
  TestValidator.equals(
    "login.channel_id matches input",
    loginRes.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals("login.status is active", loginRes.status, "active");
  TestValidator.predicate(
    "authorization token present on login",
    typeof loginRes.token.access === "string" &&
      loginRes.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present on login",
    typeof loginRes.token.refresh === "string" &&
      loginRes.token.refresh.length > 0,
  );
  typia.assert<IAuthorizationToken>(loginRes.token);

  // Step 4: Attempt login with wrong password
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          shopping_mall_channel_id: channelId,
          email,
          password: password + "X", // guaranteed not to match
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );

  // Step 5: (Edge) Attempt login with deleted/suspended status -- not testable via API without admin, so skipped here
}
