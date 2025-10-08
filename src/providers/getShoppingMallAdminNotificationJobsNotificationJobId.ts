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

export async function getShoppingMallAdminNotificationJobsNotificationJobId(props: {
  admin: AdminPayload;
  notificationJobId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationJob> {
  const job = await MyGlobal.prisma.shopping_mall_notification_jobs.findFirst({
    where: {
      id: props.notificationJobId,
      deleted_at: null,
    },
  });
  if (!job) {
    await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_admin_id: props.admin.id,
        action_type: "read_failed",
        action_reason: "Tried to read nonexistent or deleted notification job",
        domain: "notification_job",
        affected_product_id: null,
        affected_customer_id: null,
        affected_seller_id: null,
        affected_order_id: null,
        affected_review_id: null,
        details_json: JSON.stringify({
          notificationJobId: props.notificationJobId,
        }),
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Notification job not found", 404);
  }
  return {
    id: job.id,
    shopping_mall_admin_id: job.shopping_mall_admin_id ?? undefined,
    job_type: job.job_type,
    job_status: job.job_status,
    target_json: job.target_json,
    config_json: job.config_json ?? undefined,
    result_json: job.result_json ?? undefined,
    created_at: toISOStringSafe(job.created_at),
    updated_at: toISOStringSafe(job.updated_at),
    deleted_at: job.deleted_at ? toISOStringSafe(job.deleted_at) : undefined,
  };
}
