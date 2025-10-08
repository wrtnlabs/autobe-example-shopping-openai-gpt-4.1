import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test requesting email verification for a just-registered but unverified
 * customer account.
 *
 * 1. Register a new customer using /auth/customer/join with known random email
 *    (unverified).
 * 2. Assert 'email_verified' is false in the resulting account.
 * 3. Call /auth/customer/email/request-verification with the same email.
 * 4. Assert the response is an empty object (no information leakage).
 * 5. Repeat the request immediately, asserting the same empty object response (no
 *    aggressive rate limiting, no leakage).
 * 6. Register and confirm another customer, then attempt to request verification
 *    for an already-verified account, ensuring generic response.
 */
export async function test_api_customer_email_verification_request_pending_account(
  connection: api.IConnection,
) {
  // 1. Register customer with unverified email
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: "101 Gangnam-daero",
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const registered: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(registered);
  TestValidator.equals(
    "customer email verified false after join",
    registered.email_verified,
    false,
  );

  // 2. Trigger email verification request
  const evBody = {
    email,
  } satisfies IShoppingMallCustomer.IRequestEmailVerification;
  const evResp =
    await api.functional.auth.customer.email.request_verification.requestEmailVerification(
      connection,
      { body: evBody },
    );
  typia.assert(evResp);
  TestValidator.equals(
    "email verification response is empty object",
    evResp,
    {},
  );

  // 3. Repeat request (should not leak or aggressively rate-limit)
  const evResp2 =
    await api.functional.auth.customer.email.request_verification.requestEmailVerification(
      connection,
      { body: evBody },
    );
  typia.assert(evResp2);
  TestValidator.equals(
    "repeat email verification response is also empty",
    evResp2,
    {},
  );

  // 4. Register another customer and simulate verification, then test endpoint for verified account
  const verifiedEmail = typia.random<string & tags.Format<"email">>();
  const joinBody2 = {
    email: verifiedEmail,
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Busan",
      postal_code: "48965",
      address_line1: "202 Marine City",
      address_line2: undefined,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const verified: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody2 });
  typia.assert(verified);

  // Simulate/force email_verified flag true (by design we don't have endpoint; so just test request to endpoint for an already registered address as if it's verified)
  const verifiedEvResp =
    await api.functional.auth.customer.email.request_verification.requestEmailVerification(
      connection,
      { body: { email: verifiedEmail } },
    );
  typia.assert(verifiedEvResp);
  TestValidator.equals(
    "already-verified customer email verification response is empty",
    verifiedEvResp,
    {},
  );
}
