import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that an admin can soft delete a return request for an order
 * item.
 *
 * This test confirms that a properly authenticated admin can execute a soft
 * delete (logical removal) of a return request for a given order item via
 * the designated admin compliance endpoint. The operation updates the
 * corresponding record's deleted_at field but does not physically erase the
 * resource, preserving evidence for compliance and audit trail integrity
 * according to business policy. No response body is returned on success.
 *
 * Test Steps:
 *
 * 1. Register a new admin account using the admin join operation (POST
 *    /auth/admin/join), providing unique test credentials to obtain
 *    authentication tokens in the connection context.
 * 2. Generate realistic (but random) UUIDs for orderId and returnId to serve
 *    as path parameters for the target erase endpoint. (NOTE: Since there
 *    is no actual return creation API exposed in the current SDK, these
 *    will be random and existence isn't validated functionally.)
 * 3. Use the authenticated admin session to perform the erase operation
 *    (DELETE
 *    /shoppingMallAiBackend/admin/orders/{orderId}/returns/{returnId}) with
 *    those path parameters.
 * 4. Verify that the erase call returns no content, indicating successful soft
 *    delete per compliance semantics. Additional verification such as
 *    checking for updated deleted_at or audit logs, while crucial in a full
 *    stack test, cannot be done directly (no read endpoints or return
 *    values in provided SDK/domain). Therefore, this test limits itself to
 *    asserting that the operation completes without error and returns void
 *    for now.
 */
export async function test_api_order_return_delete_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain tokens and authentication context
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@autobetest.com`;
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);

  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        phone_number: null,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Generate realistic random UUIDs for orderId and returnId
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const returnId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Soft delete the return request as the authenticated admin
  const output: void =
    await api.functional.shoppingMallAiBackend.admin.orders.returns.erase(
      connection,
      {
        orderId,
        returnId,
      },
    );

  // 4. Verify that the call succeeds and returns undefined/void.
  // Note: In a fully integrated stack test, additional E2E checks for deleted_at updates or audit log entries would be essential,
  // but such verifications are not possible with the present SDK surface or API contract.
  TestValidator.equals(
    "erase should return undefined on success",
    output,
    undefined,
  );
}
