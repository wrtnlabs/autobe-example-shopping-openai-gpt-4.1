import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationJob";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminNotificationJobsNotificationJobId(props: {
  admin: AdminPayload;
  notificationJobId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationJob.IUpdate;
}): Promise<IShoppingMallNotificationJob> {
  const { notificationJobId, admin, body } = props;

  // 1. Load the job and validate it exists, not deleted.
  const job = await MyGlobal.prisma.shopping_mall_notification_jobs.findUnique({
    where: { id: notificationJobId },
  });
  if (!job || job.deleted_at) {
    throw new HttpException(
      "Notification job not found or already deleted.",
      404,
    );
  }
  // 2. Block update if job is finalized (status 'success' or 'failed')
  if (job.job_status === "success" || job.job_status === "failed") {
    throw new HttpException(
      "Cannot update a finalized notification job (success or failed).",
      409,
    );
  }
  // 3. Prepare update object for mutable fields
  const now = toISOStringSafe(new Date());
  const update: {
    job_status: string;
    target_json?: string;
    config_json?: string;
    result_json?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    job_status: body.job_status,
    updated_at: now,
    ...(body.target_json !== undefined &&
      body.target_json !== null && { target_json: body.target_json }),
    ...(body.config_json !== undefined &&
      body.config_json !== null && { config_json: body.config_json }),
    ...(body.result_json !== undefined &&
      body.result_json !== null && { result_json: body.result_json }),
    // schedule_config_json is only in API type, not DB field; skip
  };
  const updated = await MyGlobal.prisma.shopping_mall_notification_jobs.update({
    where: { id: notificationJobId },
    data: update,
  });
  // 4. Compose output, converting date fields as needed (no type assertions)
  return {
    id: updated.id,
    shopping_mall_admin_id:
      updated.shopping_mall_admin_id === null
        ? undefined
        : updated.shopping_mall_admin_id,
    job_type: updated.job_type,
    job_status: updated.job_status,
    target_json: updated.target_json,
    config_json: updated.config_json === null ? undefined : updated.config_json,
    result_json: updated.result_json === null ? undefined : updated.result_json,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
