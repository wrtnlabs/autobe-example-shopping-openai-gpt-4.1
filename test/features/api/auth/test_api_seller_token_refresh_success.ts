import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful seller token refresh.
   *
   * Steps:
   *
   * 1. Register a new seller with unique business credentials (email,
   *    business_registration_number, name).
   * 2. Validate registration returns an access/refresh token and seller profile.
   * 3. Log in as the seller to simulate independent authentication and retrieve
   *    current JWT pair.
   * 4. Use the "refresh" endpoint with the valid refresh token to request new
   *    tokens.
   * 5. Assert the new tokens are returned with valid expiration fields.
   * 6. Assert seller profile is consistent across join, login, and refresh flows.
   */

  // 1. Register new seller (dependency)
  const email = typia.random<string & tags.Format<"email">>();
  const business_registration_number = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const registration = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      business_registration_number,
      name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(registration);
  TestValidator.predicate(
    "registration returns access token",
    Boolean(registration.token.access),
  );
  TestValidator.predicate(
    "registration returns refresh token",
    Boolean(registration.token.refresh),
  );
  TestValidator.predicate(
    "registration seller profile id is uuid",
    typeof registration.seller.id === "string" &&
      /[0-9a-fA-F-]{36}/.test(registration.seller.id),
  );
  TestValidator.equals(
    "seller registration email matches input",
    registration.seller.email,
    email,
  );
  TestValidator.equals(
    "seller registration business_registration_number matches",
    registration.seller.business_registration_number,
    business_registration_number,
  );
  TestValidator.predicate(
    "seller registration is_active is boolean",
    typeof registration.seller.is_active === "boolean",
  );
  TestValidator.predicate(
    "seller registration is_verified is boolean",
    typeof registration.seller.is_verified === "boolean",
  );

  // 2. Log in as that seller to get current valid tokens
  const login = await api.functional.auth.seller.login(connection, {
    body: {
      email,
      password: "test-password1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendSeller.ILogin,
  });
  typia.assert(login);
  TestValidator.equals(
    "login returns same seller.id as registration",
    login.seller.id,
    registration.seller.id,
  );
  TestValidator.equals(
    "login returns same seller email as registration",
    login.seller.email,
    registration.seller.email,
  );
  TestValidator.equals(
    "login returns same business_registration_number as registration",
    login.seller.business_registration_number,
    registration.seller.business_registration_number,
  );

  // 3. Use refresh endpoint with valid refresh token
  const refresh = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: login.token.refresh,
    } satisfies IShoppingMallAiBackendSeller.IRefresh,
  });
  typia.assert(refresh);

  // 4. Assert that a new token pair is returned (not equal to old token)
  TestValidator.notEquals(
    "refresh should issue new access token",
    login.token.access,
    refresh.token.access,
  );
  TestValidator.notEquals(
    "refresh should issue new refresh token",
    login.token.refresh,
    refresh.token.refresh,
  );

  // 5. Assert that expiration fields are ISO date strings
  TestValidator.predicate(
    "access token expired_at field is ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+/.test(refresh.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token refreshable_until field is ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+/.test(
      refresh.token.refreshable_until,
    ),
  );

  // 6. Assert seller profile remains accurate and unchanged
  TestValidator.equals(
    "refreshed seller id matches original",
    refresh.seller.id,
    registration.seller.id,
  );
  TestValidator.equals(
    "refreshed seller email matches original",
    refresh.seller.email,
    email,
  );
  TestValidator.equals(
    "refreshed seller business_registration_number matches original",
    refresh.seller.business_registration_number,
    business_registration_number,
  );
  TestValidator.equals(
    "refreshed seller name matches original",
    refresh.seller.name,
    name,
  );
  TestValidator.equals(
    "refreshed seller is_active matches original",
    refresh.seller.is_active,
    registration.seller.is_active,
  );
  TestValidator.equals(
    "refreshed seller is_verified matches original",
    refresh.seller.is_verified,
    registration.seller.is_verified,
  );
  TestValidator.equals(
    "refreshed seller created_at matches original",
    refresh.seller.created_at,
    registration.seller.created_at,
  );
  TestValidator.equals(
    "refreshed seller updated_at should be at least original",
    refresh.seller.updated_at >= registration.seller.updated_at,
    true,
  );
  TestValidator.equals(
    "refreshed seller deleted_at matches original",
    refresh.seller.deleted_at,
    registration.seller.deleted_at,
  );
}
