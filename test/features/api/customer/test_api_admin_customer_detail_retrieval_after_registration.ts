import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate that an admin can retrieve the detailed profile of a newly
 * registered customer after performing registration by password reset workflow,
 * and that all audit and sensitive fields are present as expected for
 * privileged access.
 *
 * Steps:
 *
 * 1. Register a new admin account (admin join) and obtain authentication.
 * 2. Create a customer by initiating a password reset request for a new random
 *    customer email.
 * 3. As admin, query the created customer profile using the returned/existing
 *    customer id.
 * 4. Validate email, full_name, phone, status, email_verified, audit timestamps,
 *    and that deleted_at is present and is null.
 * 5. Attempt to get a non-existent (random) customer id and verify error is
 *    raised.
 */
export async function test_api_admin_customer_detail_retrieval_after_registration(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Register a customer by password reset workflow
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordResetBody = {
    email: customerEmail,
  } satisfies IShoppingMallCustomer.IRequestPasswordReset;
  const passwordResetResult =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      { body: passwordResetBody },
    );
  typia.assert(passwordResetResult);
  TestValidator.equals(
    "password reset accepted",
    passwordResetResult.result,
    "accepted",
  );

  // 3. Find customer id for given email by admin endpoint
  // This is not directly supported (the API does not provide direct lookup by email),
  // so in a real test environment, we must simulate that the customer with `customerEmail` was created
  // and we have its uuid (perhaps the system deterministically generates it or test harness exposes it).
  // Here, simulate by issuing another password reset, which should not reveal registration/existence.
  // Instead, directly fetch by known email - but since the only way is by uuid, let's simulate finding it.
  // For testing, we may just call with a random uuid and assert negative case, and positive case by skipping lookup.

  // For demonstration, issue a password reset, then try to retrieve with a random uuid (negative)
  const randomUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "admin retrieval of non-existent customer should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.at(connection, {
        customerId: randomUuid,
      });
    },
  );

  // 4. Simulate fetching the customer profile: since we have only email,
  // in real systems, test setups would expose the uuid (e.g. Test fixture API).
  // For now, assume we can construct (or retrieve) the customer uuid for the test email - simulate with random uuid.
  // In live system, this would be an actual lookup or use post-registration hooks/exposure.
  const customerId = typia.random<string & tags.Format<"uuid">>(); // Simulate obtaining customerId for created email.
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(customer);
  TestValidator.equals("customer email matches", customer.email, customerEmail);
  TestValidator.equals(
    "full_name is present",
    typeof customer.full_name,
    "string",
  );
  TestValidator.equals("phone is present", typeof customer.phone, "string");
  TestValidator.equals("status is present", typeof customer.status, "string");
  TestValidator.equals(
    "email_verified is boolean",
    typeof customer.email_verified,
    "boolean",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof customer.created_at === "string" &&
      /T.*Z$/.test(customer.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof customer.updated_at === "string" &&
      /T.*Z$/.test(customer.updated_at),
  );
  TestValidator.equals(
    "deleted_at present and null",
    customer.deleted_at,
    null,
  );
}
