import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful soft-deletion of an order item exchange by an
 * admin.
 *
 * This test covers the privileged flow where an admin:
 *
 * 1. Registers a new admin account and receives authorization
 * 2. Attempts to soft-delete a specific exchange by its ID for a given order
 *
 * Due to SDK and scenario constraints, the order and exchange records are
 * presumed to exist, and their UUIDs are generated syntactically for type
 * safety. After invoking the delete endpoint, the function verifies
 * successful completion via correct API call and lack of errors. The
 * ability to check that the exchange 'deleted_at' timestamp is set, or that
 * action is logged/audited, is out of scope due to missing SDK endpoints.
 *
 * This function thus ensures the endpoint is structurally correct and
 * accessible by an authenticated admin, in alignment with compliance and
 * auditability business requirements.
 */
export async function test_api_order_exchange_delete_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account and authenticate
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name().replace(/\s+/g, "_"),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@autobe-test.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuth);
  // Admin authorization is now present in connection.headers for future calls

  // Step 2: Prepare order and exchange UUIDs (valid, syntactic values)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const exchangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // In a real workflow, these would correspond to extant records; here they enable type-safe endpoint invocation

  // Step 3: Perform the soft deletion of the exchange as the admin
  await api.functional.shoppingMallAiBackend.admin.orders.exchanges.erase(
    connection,
    {
      orderId,
      exchangeId,
    },
  );
  // Completion without error indicates soft-delete endpoint is functional for admin
  // Direct verification of deleted_at or audit logs is not feasible within scope
}
