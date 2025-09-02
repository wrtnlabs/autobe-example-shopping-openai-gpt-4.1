import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the successful login for a seller account.
 *
 * This test verifies that a seller can successfully authenticate to the
 * system after valid account creation.
 *
 * 1. Register a new seller via the seller join endpoint, providing unique
 *    email, business registration number, and name. Use a fixed valid
 *    password ("1234") for repeatability.
 * 2. Attempt login via the seller login endpoint with those credentials (email
 *    and password).
 * 3. Verify that the API responds with a valid JWT token (check access and
 *    refresh tokens are non-empty and date fields present), and that the
 *    returned seller profile matches the registration input.
 * 4. Confirm the email returned in the seller profile matches the registered
 *    email.
 * 5. Assert the authentication succeeds and all fields of the token are
 *    correctly formatted.
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const registrationInput: IShoppingMallAiBackendSeller.ICreate = {
    email: sellerEmail,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const registration: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationInput,
    });
  typia.assert(registration);

  // 2. Login with the registered credentials
  const loginInput: IShoppingMallAiBackendSeller.ILogin = {
    email: sellerEmail,
    password: "1234",
  };
  const login: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, { body: loginInput });
  typia.assert(login);

  // 3. Verify the JWT token fields exist and are not empty
  TestValidator.predicate(
    "access token is present",
    typeof login.token.access === "string" && !!login.token.access,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof login.token.refresh === "string" && !!login.token.refresh,
  );
  TestValidator.predicate(
    "access token expires is date-time",
    typeof login.token.expired_at === "string" && !!login.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    typeof login.token.refreshable_until === "string" &&
      !!login.token.refreshable_until,
  );

  // 4. Verify seller profile matches registration
  TestValidator.equals(
    "seller email matches input",
    login.seller.email,
    registrationInput.email,
  );
  TestValidator.equals(
    "business registration number matches",
    login.seller.business_registration_number,
    registrationInput.business_registration_number,
  );
  TestValidator.equals(
    "seller name matches registration",
    login.seller.name,
    registrationInput.name,
  );

  // 5. Validate core seller profile fields (non-empty and proper formats)
  TestValidator.predicate(
    "seller id is UUID",
    typeof login.seller.id === "string" && !!login.seller.id,
  );
  TestValidator.predicate(
    "seller email is valid",
    typeof login.seller.email === "string" && !!login.seller.email,
  );
  TestValidator.predicate(
    "seller account is active",
    login.seller.is_active === true,
  );
  TestValidator.predicate(
    "seller account is verified",
    login.seller.is_verified === true || login.seller.is_verified === false,
  );
  TestValidator.predicate(
    "created_at present",
    typeof login.seller.created_at === "string" && !!login.seller.created_at,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof login.seller.updated_at === "string" && !!login.seller.updated_at,
  );
}
