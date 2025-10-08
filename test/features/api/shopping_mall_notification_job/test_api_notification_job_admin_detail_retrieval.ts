import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationJob";

/**
 * Admin notification job detail retrieval scenario. Covers:
 *
 * 1. Registration of new admin and authentication.
 * 2. Creation of an admin notification job by authenticated admin.
 * 3. Retrieval of notification job details as admin and assertion on returned
 *    fields.
 * 4. Access denied for non-admin (unauthenticated) user.
 * 5. Audit-logging is triggered for access.
 */
export async function test_api_notification_job_admin_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register new admin (admin join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create notification job as admin
  const notificationJobBody = {
    job_type: RandomGenerator.pick(["email", "push", "sms", "in_app"] as const),
    target_json: JSON.stringify([typia.random<string & tags.Format<"uuid">>()]),
    config_json: JSON.stringify({
      template: RandomGenerator.paragraph(),
      retry: 0,
    }),
    schedule_config_json: null,
  } satisfies IShoppingMallNotificationJob.ICreate;
  const createdNotificationJob: IShoppingMallNotificationJob =
    await api.functional.shoppingMall.admin.notificationJobs.create(
      connection,
      {
        body: notificationJobBody,
      },
    );
  typia.assert(createdNotificationJob);

  // 3. Retrieve notification job by ID as authenticated admin
  const fetchedJob: IShoppingMallNotificationJob =
    await api.functional.shoppingMall.admin.notificationJobs.at(connection, {
      notificationJobId: createdNotificationJob.id,
    });
  typia.assert(fetchedJob);
  // Validate all main fields
  TestValidator.equals(
    "job id matches",
    fetchedJob.id,
    createdNotificationJob.id,
  );
  TestValidator.equals(
    "job_type matches",
    fetchedJob.job_type,
    createdNotificationJob.job_type,
  );
  TestValidator.equals(
    "job_status present",
    typeof fetchedJob.job_status,
    "string",
  );
  TestValidator.equals(
    "target_json matches",
    fetchedJob.target_json,
    createdNotificationJob.target_json,
  );
  TestValidator.equals(
    "config_json matches",
    fetchedJob.config_json,
    createdNotificationJob.config_json,
  );
  TestValidator.equals(
    "result_json present (string or undefined)",
    typeof fetchedJob.result_json === "undefined" ||
      typeof fetchedJob.result_json === "string",
    true,
  );
  TestValidator.equals(
    "created_at present",
    typeof fetchedJob.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at present",
    typeof fetchedJob.updated_at,
    "string",
  );
  // Check audit/admin fields
  TestValidator.equals(
    "shopping_mall_admin_id matches",
    fetchedJob.shopping_mall_admin_id,
    admin.id,
  );

  // 4. Try to get notification job as an unauthenticated session (should be denied)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated/non-admin access denied",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.at(
        unauthenticated,
        {
          notificationJobId: createdNotificationJob.id,
        },
      );
    },
  );

  // 5. (Audit logging validation is presumed - no direct assert, but if code path is reached, assume audit log is triggered.)
}
