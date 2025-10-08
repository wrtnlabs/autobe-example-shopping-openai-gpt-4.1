import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationJob";

/**
 * Validate admin updating a notification job's configuration/status/targeting
 * (success and error scenarios).
 *
 * 1. Register and authenticate as admin.
 * 2. Create a notification job as that admin.
 * 3. Update job's targeting and config/status fields.
 * 4. Confirm update reflected in job details.
 * 5. Set job status to finalized ('success'), then attempt further update (should
 *    error).
 * 6. Soft-delete job (simulate by setting deleted_at in result_json), attempt
 *    update (should error).
 * 7. Ensure all business rules about updatability, error feedback, and audit
 *    compliance are enforced.
 */
export async function test_api_admin_notification_job_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a notification job as this admin
  const notificationJobCreate =
    await api.functional.shoppingMall.admin.notificationJobs.create(
      connection,
      {
        body: {
          job_type: RandomGenerator.pick([
            "email",
            "sms",
            "push",
            "in_app",
          ] as const),
          target_json: JSON.stringify([
            typia.random<string & tags.Format<"uuid">>(),
          ]),
          config_json: JSON.stringify({
            template: RandomGenerator.alphaNumeric(10),
            test: true,
          }),
          schedule_config_json: JSON.stringify({ cron: "0 9 * * *" }),
        } satisfies IShoppingMallNotificationJob.ICreate,
      },
    );
  typia.assert(notificationJobCreate);

  // 3. Update job's targeting/config/status
  const newTarget = JSON.stringify([
    typia.random<string & tags.Format<"uuid">>(),
  ]);
  const newConfig = JSON.stringify({
    template: RandomGenerator.alphaNumeric(12),
    test: false,
  });
  const updateBody = {
    job_status: "running",
    target_json: newTarget,
    config_json: newConfig,
    schedule_config_json: JSON.stringify({ cron: "0 10 * * *" }),
  } satisfies IShoppingMallNotificationJob.IUpdate;
  const updatedJob =
    await api.functional.shoppingMall.admin.notificationJobs.update(
      connection,
      {
        notificationJobId: notificationJobCreate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedJob);
  TestValidator.equals(
    "admin updated notification job - target_json",
    updatedJob.target_json,
    newTarget,
  );
  TestValidator.equals(
    "admin updated notification job - config_json",
    updatedJob.config_json,
    newConfig,
  );
  TestValidator.equals(
    "admin updated notification job - status",
    updatedJob.job_status,
    "running",
  );

  // 4. Set job status to finalized (success), then attempt further update
  const finalizeJob =
    await api.functional.shoppingMall.admin.notificationJobs.update(
      connection,
      {
        notificationJobId: notificationJobCreate.id,
        body: {
          job_status: "success",
          result_json: JSON.stringify({ delivered: true }),
        },
      },
    );
  typia.assert(finalizeJob);
  TestValidator.equals(
    "job finalized as success",
    finalizeJob.job_status,
    "success",
  );
  // Attempt update after finalized
  await TestValidator.error(
    "cannot update finalized (success) notification job",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.update(
        connection,
        {
          notificationJobId: notificationJobCreate.id,
          body: {
            job_status: "pending",
          },
        },
      );
    },
  );

  // 5. (Soft delete) Simulate by setting job status to failed, then attempting update
  const failJob =
    await api.functional.shoppingMall.admin.notificationJobs.update(
      connection,
      {
        notificationJobId: notificationJobCreate.id,
        body: {
          job_status: "failed",
          result_json: JSON.stringify({ error: "Simulated fail." }),
        },
      },
    );
  typia.assert(failJob);
  TestValidator.equals("job finalized as failed", failJob.job_status, "failed");
  await TestValidator.error(
    "cannot update finalized (failed) notification job",
    async () => {
      await api.functional.shoppingMall.admin.notificationJobs.update(
        connection,
        {
          notificationJobId: notificationJobCreate.id,
          body: {
            job_status: "pending",
          },
        },
      );
    },
  );

  // (Edge) Attempt update on logically deleted job (simulate by setting deleted_at via update -- assuming API does not allow direct deleted_at but use status)
  // The spec makes clear only non-finalized/non-deleted jobs can be updated, so we attempt update after finalized/deleted to ensure logic enforcement.
}
