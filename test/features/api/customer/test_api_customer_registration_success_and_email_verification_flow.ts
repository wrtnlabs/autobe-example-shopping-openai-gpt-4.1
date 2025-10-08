import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test the full customer registration process including unique email, password
 * requirements, profile fields, address attachment, and business validations
 * (duplicate email).
 *
 * 1. Generate a unique customer registration request body with valid address
 *    fields.
 * 2. Call api.functional.auth.customer.join and assert the response is a valid
 *    IShoppingMallCustomer.IAuthorized.
 * 3. Validate the returned profile fields (id, email, full_name, phone, status,
 *    email_verified, timestamps, token).
 * 4. Confirm email_verified is false and status is pending or
 *    pending_verification.
 * 5. Assert JWT token structure exists.
 * 6. Attempt to register a customer again with the same email to check for
 *    business error (rejection on duplicate email).
 */
export async function test_api_customer_registration_success_and_email_verification_flow(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique customer registration request body
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "A!$"; // satisfy strong password
  const full_name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const address = {
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 4 }),
    address_line2: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinBody = {
    email,
    password,
    full_name,
    phone,
    address,
  } satisfies IShoppingMallCustomer.IJoin;

  // Step 2: Register the customer
  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Step 3: Validate core profile properties
  TestValidator.equals("email matches submitted", authorized.email, email);
  TestValidator.equals(
    "full_name matches submitted",
    authorized.full_name,
    full_name,
  );
  TestValidator.equals("phone matches submitted", authorized.phone, phone);
  TestValidator.predicate(
    "status is pending or pending_verification",
    authorized.status === "pending" ||
      authorized.status === "pending_verification",
  );
  TestValidator.equals(
    "email_verified is false by default",
    authorized.email_verified,
    false,
  );
  TestValidator.predicate(
    "customer id is uuid",
    typeof authorized.id === "string" && authorized.id.length >= 36,
  );
  TestValidator.predicate(
    "created_at is nonempty",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is nonempty",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );
  typia.assert(authorized.token);
  TestValidator.predicate(
    "access token is defined",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is defined",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Step 4: Attempt duplicate registration (should fail)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    },
  );
}
