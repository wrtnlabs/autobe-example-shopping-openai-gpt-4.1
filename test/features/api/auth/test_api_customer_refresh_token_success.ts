import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
) {
  /**
   * Test successful refresh of an authenticated customer's access token.
   *
   * This test simulates the real-world authentication flow for a shopping mall
   * customer:
   *
   * 1. Register a new customer with unique credentials
   * 2. After registration completes, extract the refresh token from the original
   *    login response
   * 3. Use the refresh token at the /auth/customer/refresh endpoint to request new
   *    tokens
   * 4. Assert that a new token set is issued and the session/state is maintained
   * 5. Validate that the new tokens are properly structured, and the customer
   *    entity in the response remains consistent
   *
   * This test ensures that:
   *
   * - Token refresh endpoint works for a valid session
   * - Session continuity and customer authentication state is correct
   * - The returned IAuthorizationToken structure is valid and contains new values
   * - Customer data in the response is valid and has not changed (other than
   *   potentially updated last_login_at)
   */

  // 1. Register a new customer
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const joinResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(joinResult);
  // Extract original refresh token and customer data
  const originalToken: IAuthorizationToken = joinResult.token;
  typia.assert(originalToken);
  const customer: IShoppingMallAiBackendCustomer = joinResult.customer;
  typia.assert(customer);
  TestValidator.equals(
    "registered customer email matches input",
    customer.email,
    customerJoinInput.email,
  );
  TestValidator.equals(
    "customer is active post-registration",
    customer.is_active,
    true,
  );
  TestValidator.equals(
    "customer is verified post-registration",
    customer.is_verified,
    true,
  );

  // 2. Submit refresh token to obtain new auth tokens
  const refreshRequest: IShoppingMallAiBackendCustomer.IRefresh = {
    refresh_token: originalToken.refresh,
  };
  const refreshResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshResult);
  // Extract new token and customer data from refresh response
  const newToken: IAuthorizationToken = refreshResult.token;
  typia.assert(newToken);
  const refreshedCustomer: IShoppingMallAiBackendCustomer =
    refreshResult.customer;
  typia.assert(refreshedCustomer);

  // 3. Validate: new access/refresh token values differ from original
  TestValidator.notEquals(
    "access token value is updated after refresh",
    newToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token value is updated after refresh",
    newToken.refresh,
    originalToken.refresh,
  );

  // 4. Validate: tokens are properly timestamped and valid
  TestValidator.predicate(
    "access token expiration is in ISO8601 format",
    typeof newToken.expired_at === "string" &&
      !isNaN(Date.parse(newToken.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expiration is in ISO8601 format",
    typeof newToken.refreshable_until === "string" &&
      !isNaN(Date.parse(newToken.refreshable_until)),
  );

  // 5. Validate: refreshed customer entity consistency
  TestValidator.equals(
    "refreshed customer id remains the same",
    refreshedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "refreshed customer email remains the same",
    refreshedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "refreshed customer phone_number remains the same",
    refreshedCustomer.phone_number,
    customer.phone_number,
  );
  TestValidator.equals(
    "refreshed customer name remains the same",
    refreshedCustomer.name,
    customer.name,
  );
  TestValidator.equals(
    "refreshed customer nickname remains the same",
    refreshedCustomer.nickname,
    customer.nickname,
  );
  TestValidator.equals(
    "refreshed customer is active",
    refreshedCustomer.is_active,
    true,
  );
  TestValidator.equals(
    "refreshed customer is verified",
    refreshedCustomer.is_verified,
    true,
  );
  TestValidator.equals(
    "refreshed customer created_at matches joined customer",
    refreshedCustomer.created_at,
    customer.created_at,
  );

  // last_login_at should be string (ISO timestamp), null, or undefined; assert ISO string if present
  if (
    refreshedCustomer.last_login_at !== undefined &&
    refreshedCustomer.last_login_at !== null
  ) {
    TestValidator.predicate(
      "refreshed customer last_login_at is valid ISO8601 string",
      typeof refreshedCustomer.last_login_at === "string" &&
        !isNaN(Date.parse(refreshedCustomer.last_login_at)),
    );
  }

  // deleted_at should be null or undefined
  TestValidator.predicate(
    "refreshed customer deleted_at is null or undefined",
    refreshedCustomer.deleted_at === null ||
      refreshedCustomer.deleted_at === undefined,
  );

  // updated_at should be a string (ISO timestamp) and present
  TestValidator.predicate(
    "refreshed customer updated_at is valid ISO8601 string",
    typeof refreshedCustomer.updated_at === "string" &&
      !isNaN(Date.parse(refreshedCustomer.updated_at)),
  );
}
