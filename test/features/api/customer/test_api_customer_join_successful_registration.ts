import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_join_successful_registration(
  connection: api.IConnection,
) {
  /**
   * Test successful customer registration for the shopping mall.
   *
   * This test verifies that POST /auth/customer/join creates a new customer,
   * issues authentication tokens, and returns the correct onboarded customer
   * entity. This endpoint does not require authentication for registration.
   *
   * Workflow:
   *
   * 1. Generate unique, valid input values for all required and optional fields
   * 2. Call the registration endpoint with those values
   * 3. Assert the response has both token and customer entities of correct
   *    structure
   * 4. Check the new customer is active, not verified, and has no login history
   * 5. Validate the API does not expose sensitive info (e.g., password) in the
   *    response
   */
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const phone_number: string = RandomGenerator.mobile();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const name: string = RandomGenerator.name();
  const nickname: string = RandomGenerator.name(1);

  const input = {
    email,
    phone_number,
    password,
    name,
    nickname,
  } satisfies IShoppingMallAiBackendCustomer.IJoin;

  const output = await api.functional.auth.customer.join(connection, {
    body: input,
  });
  typia.assert(output);
  const { token, customer } = output;
  typia.assert(token);
  typia.assert(customer);

  // Token validations
  TestValidator.predicate(
    "access token must be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be a valid string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be a valid string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // Customer validations
  TestValidator.predicate(
    "customer id should be non-empty string",
    typeof customer.id === "string" && customer.id.length > 0,
  );
  TestValidator.equals(
    "customer email matches input",
    customer.email,
    input.email,
  );
  TestValidator.equals(
    "phone number matches input",
    customer.phone_number,
    input.phone_number,
  );
  TestValidator.equals(
    "customer name matches input",
    customer.name,
    input.name,
  );
  TestValidator.equals(
    "customer nickname matches input",
    customer.nickname,
    input.nickname,
  );
  TestValidator.predicate(
    "customer is_active is true",
    customer.is_active === true,
  );
  TestValidator.predicate(
    "customer is_verified is boolean",
    typeof customer.is_verified === "boolean",
  );
  TestValidator.predicate(
    "customer is_verified is false at join",
    customer.is_verified === false,
  );
  TestValidator.equals(
    "customer last_login_at is null",
    customer.last_login_at,
    null,
  );
  TestValidator.predicate(
    "created_at is a valid string",
    typeof customer.created_at === "string" && customer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid string",
    typeof customer.updated_at === "string" && customer.updated_at.length > 0,
  );
  TestValidator.equals(
    "customer deleted_at is null at registration",
    customer.deleted_at,
    null,
  );
}
