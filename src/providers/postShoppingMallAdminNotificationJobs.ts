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

export async function postShoppingMallAdminNotificationJobs(props: {
  admin: AdminPayload;
  body: IShoppingMallNotificationJob.ICreate;
}): Promise<IShoppingMallNotificationJob> {
  // Validate schedule_config_json if present (not stored but must be valid and not in past)
  if (
    props.body.schedule_config_json !== undefined &&
    props.body.schedule_config_json !== null
  ) {
    let schedule: unknown;
    try {
      schedule = JSON.parse(props.body.schedule_config_json);
    } catch {
      throw new HttpException("Malformed schedule_config_json JSON", 400);
    }
    if (
      typeof schedule === "object" &&
      schedule !== null &&
      Object.prototype.hasOwnProperty.call(schedule, "send_at") &&
      typeof (schedule as { send_at?: unknown }).send_at === "string"
    ) {
      if (
        Date.parse((schedule as { send_at: string }).send_at) <
        Date.now() - 1000
      ) {
        throw new HttpException(
          "Cannot schedule notification job in the past",
          400,
        );
      }
    }
  }

  // Validate target_json (must always be valid JSON array/object)
  try {
    JSON.parse(props.body.target_json);
  } catch {
    throw new HttpException("Malformed target_json JSON", 400);
  }

  // Validate config_json if present/non-null
  if (props.body.config_json !== undefined && props.body.config_json !== null) {
    try {
      JSON.parse(props.body.config_json);
    } catch {
      throw new HttpException("Malformed config_json JSON", 400);
    }
  }

  // Duplicate job detection (same job_type + target + config + status in pending/running)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_notification_jobs.findFirst({
      where: {
        job_type: props.body.job_type,
        target_json: props.body.target_json,
        config_json:
          props.body.config_json !== undefined &&
          props.body.config_json !== null
            ? props.body.config_json
            : null,
        job_status: { in: ["pending", "running"] },
      },
    });
  if (duplicate !== null) {
    throw new HttpException(
      "A notification job with the same type, target, and config is already scheduled or running.",
      409,
    );
  }

  // Construct the data for creation and set all value types functionally
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_notification_jobs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      job_type: props.body.job_type,
      job_status: "pending",
      target_json: props.body.target_json,
      config_json:
        props.body.config_json !== undefined && props.body.config_json !== null
          ? props.body.config_json
          : null,
      result_json: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Queue audit log for traceability
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      action_type: "create_notification_job",
      action_reason: "Notification job creation by admin",
      domain: "notification_job",
      affected_customer_id: null,
      affected_seller_id: null,
      affected_product_id: null,
      affected_order_id: null,
      affected_review_id: null,
      details_json: JSON.stringify({ job_id: created.id }),
      created_at: now,
    },
  });
  // Return the created notification job with proper type forms
  return {
    id: created.id,
    shopping_mall_admin_id: created.shopping_mall_admin_id ?? undefined,
    job_type: created.job_type,
    job_status: created.job_status,
    target_json: created.target_json,
    config_json: created.config_json ?? undefined,
    result_json: created.result_json ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
