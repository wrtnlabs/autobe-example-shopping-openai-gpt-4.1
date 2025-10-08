import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationJob";

/**
 * E2E test for admin notification job creation and scheduling.
 *
 * Validates the admin's ability to register and schedule notification jobs,
 * including edge cases for duplication and invalid scheduling.
 *
 * Process:
 *
 * 1. Register admin (join)
 * 2. Create notification job with valid configuration (immediate delivery)
 * 3. Validate job is created with correct status and parameters
 * 4. Attempt to create a duplicate notification job for the same segment/time
 *    (should fail)
 * 5. Attempt to create with schedule_config_json in the past (should fail)
 */
export async function test_api_admin_notification_job_creation_and_scheduling(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. Create notification job (immediate delivery)
  // Simple target segment: notify a sample user UUIDs as emails
  const userIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const config = {
    template: "welcome_v1",
    subject: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const jobInputImmediate = {
    job_type: "email",
    target_json: JSON.stringify(userIds),
    config_json: JSON.stringify(config),
    schedule_config_json: null,
  } satisfies IShoppingMallNotificationJob.ICreate;

  const job = await api.functional.shoppingMall.admin.notificationJobs.create(
    connection,
    {
      body: jobInputImmediate,
    },
  );
  typia.assert(job);
  TestValidator.equals("job type is email", job.job_type, "email");
  TestValidator.equals(
    "job target matches",
    job.target_json,
    jobInputImmediate.target_json,
  );
  TestValidator.equals(
    "job config matches",
    job.config_json,
    jobInputImmediate.config_json,
  );
  TestValidator.equals(
    "job status initialized",
    ["pending", "running"].includes(job.job_status),
    true,
  );

  // 3. Duplicate creation with same target/time -- should fail
  await TestValidator.error(
    "duplicate notification job creation is rejected",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.create(
        connection,
        {
          body: jobInputImmediate,
        },
      );
    },
  );

  // 4. Invalid scheduling (in the past) -- should fail
  const pastSchedule = {
    send_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
  };
  const jobInputPast = {
    job_type: "email",
    target_json: JSON.stringify(userIds),
    config_json: JSON.stringify(config),
    schedule_config_json: JSON.stringify(pastSchedule),
  } satisfies IShoppingMallNotificationJob.ICreate;

  await TestValidator.error(
    "creating notification job with past schedule should fail",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.create(
        connection,
        {
          body: jobInputPast,
        },
      );
    },
  );

  // (5) Audit/admin log entry check would be ideal but requires cross-API, so left as a comment/future step.
}
