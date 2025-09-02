import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";

/**
 * Validate successful retrieval of a customer account's full profile by an
 * admin user.
 *
 * This test ensures that an authenticated admin can access the complete
 * customer details via the GET
 * /shoppingMallAiBackend/admin/customers/{customerId} endpoint. The flow
 * involves registering an admin (with unique details), using the received
 * credentials (and auto-set Authorization header), then attempting to fetch
 * a customer's detail (simulated with a random UUID). The response is
 * checked to contain all documented fields for
 * IShoppingMallAiBackendCustomer, and typia.assert is used to strongly
 * validate types. Error scenarios (not found, forbidden, withdrawn) are NOT
 * tested in this function, which only verifies the success path.
 */
export async function test_api_customer_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and establish authorization context
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // Simulated hashed password, NOT plain
  const adminName: string = RandomGenerator.name(2);
  const adminPhone: string | null = RandomGenerator.mobile();

  const adminAuthResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuthResponse);

  // 2. Prepare/simulate a customerId to test (in practice, customer must exist)
  const customerId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve customer details as authenticated admin
  const customer =
    await api.functional.shoppingMallAiBackend.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(customer);

  // 4. Property and type checks for business/DTO expectations
  TestValidator.predicate(
    "customer ID format is uuid",
    typeof customer.id === "string" && /[0-9a-fA-F\-]{36}/.test(customer.id),
  );
  TestValidator.predicate(
    "customer email is string",
    typeof customer.email === "string",
  );
  TestValidator.predicate(
    "customer phone_number is string",
    typeof customer.phone_number === "string",
  );
  TestValidator.predicate(
    "customer name is string",
    typeof customer.name === "string",
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof customer.is_active === "boolean",
  );
  TestValidator.predicate(
    "is_verified is boolean",
    typeof customer.is_verified === "boolean",
  );
  TestValidator.predicate(
    "created_at is string",
    typeof customer.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof customer.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or string or undefined",
    customer.deleted_at === null ||
      typeof customer.deleted_at === "string" ||
      typeof customer.deleted_at === "undefined",
  );
  TestValidator.predicate(
    "last_login_at is null or string or undefined",
    customer.last_login_at === null ||
      typeof customer.last_login_at === "string" ||
      typeof customer.last_login_at === "undefined",
  );
}
