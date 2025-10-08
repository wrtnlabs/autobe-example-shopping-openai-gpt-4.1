import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminAuditLogsAdminAuditLogId(props: {
  admin: AdminPayload;
  adminAuditLogId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminActionLog.IUpdate;
}): Promise<IShoppingMallAdminActionLog> {
  // 1. Find the target log entry
  const log = await MyGlobal.prisma.shopping_mall_admin_action_logs.findUnique({
    where: { id: props.adminAuditLogId },
  });
  if (!log) {
    throw new HttpException("Admin audit log not found", 404);
  }

  // 2. Validate presence of at least one updatable field
  const updatableFields = ["action_type", "action_reason", "details_json"];
  const hasUpdatable = updatableFields.some(
    (field) =>
      props.body[field as keyof IShoppingMallAdminActionLog.IUpdate] !==
      undefined,
  );
  if (!hasUpdatable) {
    throw new HttpException("No updatable fields provided", 400);
  }

  // 3. If details_json present, must be valid JSON string
  if (props.body.details_json !== undefined) {
    try {
      JSON.parse(props.body.details_json ?? "null");
    } catch (err) {
      throw new HttpException("details_json must be a valid JSON string", 400);
    }
  }

  // 4. Perform the update using Prisma
  const updated = await MyGlobal.prisma.shopping_mall_admin_action_logs.update({
    where: { id: props.adminAuditLogId },
    data: {
      action_type: props.body.action_type ?? undefined,
      action_reason: props.body.action_reason ?? undefined,
      details_json: props.body.details_json ?? undefined,
    },
  });

  // 5. Return the full updated log, mapping nullable/optional fields according to DTO
  return {
    id: updated.id,
    shopping_mall_admin_id: updated.shopping_mall_admin_id,
    affected_customer_id:
      updated.affected_customer_id === null
        ? undefined
        : updated.affected_customer_id,
    affected_seller_id:
      updated.affected_seller_id === null
        ? undefined
        : updated.affected_seller_id,
    affected_product_id:
      updated.affected_product_id === null
        ? undefined
        : updated.affected_product_id,
    affected_order_id:
      updated.affected_order_id === null
        ? undefined
        : updated.affected_order_id,
    affected_review_id:
      updated.affected_review_id === null
        ? undefined
        : updated.affected_review_id,
    action_type: updated.action_type,
    action_reason: updated.action_reason,
    domain: updated.domain,
    details_json:
      updated.details_json === null ? undefined : updated.details_json,
    created_at: toISOStringSafe(updated.created_at),
  };
}
