import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test the workflow for initiating a customer password reset.
 *
 * 1. Register a new customer account, using a random email, password, name, phone,
 *    and address.
 * 2. Request a password reset for that exact customer email (should result in
 *    generic 'accepted').
 * 3. Request a password reset for a different, not-registered random email (should
 *    also result in 'accepted').
 * 4. Validate that both requests return the same generic response, with no
 *    indication of whether the email is registered.
 */
export async function test_api_customer_password_reset_request_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const newCustomerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<100> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<100>>();
  const fullName: string & tags.MinLength<2> & tags.MaxLength<100> =
    RandomGenerator.name();
  const phone: string & tags.MinLength<8> & tags.MaxLength<20> =
    RandomGenerator.mobile();
  const address: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: newCustomerEmail,
      password,
      full_name: fullName,
      phone,
      address,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  TestValidator.equals(
    "registered email match",
    customer.email,
    newCustomerEmail,
  );

  // 2. Password reset request for registered email
  const resetResponseExisting =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: newCustomerEmail,
        } satisfies IShoppingMallCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponseExisting);
  TestValidator.equals(
    "reset request for registered email is accepted",
    resetResponseExisting.result,
    "accepted",
  );

  // 3. Password reset request for unregistered email
  let unregisteredEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // ensure it's different
  while (unregisteredEmail === newCustomerEmail) {
    unregisteredEmail = typia.random<string & tags.Format<"email">>();
  }
  const resetResponseUnregistered =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies IShoppingMallCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponseUnregistered);
  TestValidator.equals(
    "reset request for unregistered email is accepted",
    resetResponseUnregistered.result,
    "accepted",
  );

  // 4. Response shape and value equality check
  TestValidator.equals(
    "reset responses for registered and unregistered email must be identically shaped and equal",
    resetResponseExisting,
    resetResponseUnregistered,
  );
}
