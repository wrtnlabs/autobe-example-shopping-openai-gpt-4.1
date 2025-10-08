import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that a platform admin can successfully soft-delete a notification
 * job by ID, and cannot delete the same job twice.
 *
 * 1. Register a new admin (random unique email/password/full_name)
 * 2. Assume the existence of a notification job to delete (using a random uuid as
 *    placeholder)
 * 3. Call the soft-delete endpoint as admin with the notification job ID
 * 4. Assert API call completes successfully (void return, no error)
 * 5. Attempt to soft-delete the same job again and assert error is thrown
 * 6. (Entity-level verification omitted: notification job querying/fields not in
 *    scope)
 */
export async function test_api_notification_job_soft_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin (random email/password/full_name)
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use a valid, random notification job ID (uuid)
  const notificationJobId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to soft-delete the notification job as admin
  await api.functional.shoppingMall.admin.notificationJobs.erase(connection, {
    notificationJobId,
  });

  // 4. No error means success (void response), nothing to assert from output

  // 5. Attempt to delete again -- business logic should error
  await TestValidator.error(
    "cannot soft-delete an already deleted or non-existent notification job",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.erase(
        connection,
        { notificationJobId },
      );
    },
  );
}
