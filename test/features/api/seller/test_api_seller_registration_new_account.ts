import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the complete new seller registration flow and uniqueness
 * enforcement.
 *
 * Business context: This test ensures that a new seller can register an account
 * providing all legally required details, and that duplicate seller
 * registrations (by email or business_registration_number) are rejected. It
 * verifies the backend never shows sensitive data (such as passwords), always
 * issues an authentication token on success, sets correct approval and
 * verification statuses, and enforces unique business constraints.
 *
 * Steps:
 *
 * 1. Register a new seller using all required fields (with random valid data for
 *    each field)
 * 2. Assert:
 *
 *    - Success response is received (with correct type)
 *    - JWT access token is included in response (in the token property)
 *    - Seller password is never present in response
 *    - Approval_status is set to 'pending'
 *    - Email_verified is false
 * 3. Attempt to register the same seller again with the same email: expect error
 *    due to unique constraint.
 * 4. Attempt to register another seller with the same
 *    business_registration_number: expect error due to unique constraint.
 */
export async function test_api_seller_registration_new_account(
  connection: api.IConnection,
) {
  // Step 1: Compose random but valid new seller registration body
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const businessRegistrationNumber = RandomGenerator.alphaNumeric(10);
  const kycDocumentUri = null; // optional
  const input = {
    email,
    password,
    business_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: kycDocumentUri,
    business_registration_number: businessRegistrationNumber,
  } satisfies IShoppingMallSeller.IJoin;

  // Step 2: Register seller & basic success checks
  const result: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: input,
    });
  typia.assert(result);
  TestValidator.equals("seller email matches input", result.email, email);
  TestValidator.notEquals(
    "seller password never exposed",
    (result as any).password,
    password,
  );
  TestValidator.predicate(
    "JWT token is returned",
    !!result.token &&
      typeof result.token.access === "string" &&
      0 < result.token.access.length,
  );
  TestValidator.equals(
    "approval status is pending",
    result.approval_status,
    "pending",
  );
  TestValidator.equals(
    "email_verification is false on join",
    result.email_verified,
    false,
  );

  // Step 3: Attempt to register again with duplicate email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.seller.join(connection, {
      body: {
        ...input,
        business_registration_number: RandomGenerator.alphaNumeric(11), // change reg. number so only email collides
      } satisfies IShoppingMallSeller.IJoin,
    });
  });

  // Step 4: Attempt to register again with duplicate business_registration_number
  await TestValidator.error(
    "duplicate business registration number should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          ...input,
          email: typia.random<string & tags.Format<"email">>(), // keep reg. number but try new email
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );
}
