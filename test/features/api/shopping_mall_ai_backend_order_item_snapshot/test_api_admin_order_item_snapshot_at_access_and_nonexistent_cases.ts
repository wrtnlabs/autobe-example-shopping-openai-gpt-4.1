import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItemSnapshot";

export async function test_api_admin_order_item_snapshot_at_access_and_nonexistent_cases(
  connection: api.IConnection,
) {
  /**
   * This E2E test validates retrieval and access control for admin order item
   * snapshot detail.
   *
   * Steps:
   *
   * 1. Register a new admin and authenticate to obtain admin privileges.
   * 2. Simulate existence of an order and item snapshot, as scenario prerequisites
   *    (here, use typia.random to mock realistic UUIDs and snapshot data).
   * 3. Attempt to fetch an existing order item snapshot with correct admin
   *    privileges, validating type and data structure.
   * 4. Attempt to fetch a non-existent itemSnapshotId, and verify error (business
   *    logic or 404).
   * 5. Attempt using an invalid orderId/UUID, expect error condition.
   * 6. Remove admin authentication token from connection and try again to confirm
   *    unauthorized access is denied.
   *
   * Test flow includes both positive retrieval and negative
   * authorization/existence edge cases.
   */
  // 1. Admin registration and authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Backend expects hash, so use random for test
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin username matches input",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches input",
    adminJoin.admin.email,
    adminEmail,
  );
  // 2. Generate valid snapshot and order IDs for positive test case
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemSnapshot = typia.random<IShoppingMallAiBackendOrderItemSnapshot>();
  // 3. Simulate existing snapshot fetch with admin (positive scenario)
  const positiveOutput =
    await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.at(
      connection,
      {
        orderId: orderId,
        itemSnapshotId: itemSnapshot.id,
      },
    );
  typia.assert(positiveOutput);
  TestValidator.equals(
    "itemSnapshot id matches",
    positiveOutput.id,
    itemSnapshot.id,
  );
  // 4. Try to fetch non-existent itemSnapshotId under valid orderId
  await TestValidator.error(
    "fetching non-existent itemSnapshotId returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.at(
        connection,
        {
          orderId,
          itemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Try to fetch with invalid orderId (unrelated UUID)
  await TestValidator.error(
    "fetching with invalid orderId returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemSnapshotId: itemSnapshot.id,
        },
      );
    },
  );
  // 6. Remove admin authentication, attempt as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch is denied", async () => {
    await api.functional.shoppingMallAiBackend.admin.orders.itemSnapshots.at(
      unauthConn,
      {
        orderId,
        itemSnapshotId: itemSnapshot.id,
      },
    );
  });
}
