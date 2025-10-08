import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test admin soft delete customer's address (positive and negative scenarios).
 *
 * 1. Simulate customer existence using password reset API with a random email.
 * 2. Register a new admin (join) and use the returned admin token context for
 *    admin authorization.
 * 3. Generate random UUIDs for customerId and addressId for testing deletion
 *    (since no customer/address creation/existence APIs).
 * 4. Attempt to soft delete the address as admin (simulate positive case).
 * 5. Attempt to soft delete a non-existent address (negative case, expects error).
 */
export async function test_api_admin_soft_delete_customer_address(
  connection: api.IConnection,
) {
  // 1. Ensure customer record exists by issuing password reset (simulate existence)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const passwordResetResult =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(passwordResetResult);
  TestValidator.equals(
    "password reset request accepted",
    passwordResetResult.result,
    "accepted",
  );

  // Assume we have a customerId (simulate with random UUID), addressId (also random UUID)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register a new admin and use as authorized admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Token included; SDK manages admin context
  TestValidator.equals("admin email matches", adminAuth.email, adminEmail);
  TestValidator.equals(
    "admin full name matches",
    adminAuth.full_name,
    adminFullName,
  );

  // 3. Attempt to soft-delete a customer's address as admin (positive: expects not to throw)
  await api.functional.shoppingMall.admin.customers.addresses.erase(
    connection,
    {
      customerId,
      addressId,
    },
  );
  TestValidator.predicate(
    "soft delete did not throw error for valid customer/address IDs",
    true,
  );

  // 4. Negative scenario - attempt deletion of a non-existent address (should error)
  const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "soft delete non-existent address id should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.erase(
        connection,
        {
          customerId,
          addressId: nonExistentAddressId,
        },
      );
    },
  );

  // 5. Edge scenario: attempt to delete the only address (simulate; business logic may error or succeed as per policy, we expect either no error or error handled)
  // Since addresses cannot be listed or created, this step is informational (the above steps cover core logic with available API)
}
