import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAppeal> {
  const record = await MyGlobal.prisma.shopping_mall_appeals.findUnique({
    where: {
      id: props.appealId,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new HttpException("Appeal not found", 404);
  }
  return {
    id: record.id,
    escalation_id: record.escalation_id,
    appellant_customer_id: record.appellant_customer_id ?? null,
    appellant_seller_id: record.appellant_seller_id ?? null,
    reviewing_admin_id: record.reviewing_admin_id ?? null,
    appeal_type: record.appeal_type,
    appeal_status: record.appeal_status,
    resolution_type: record.resolution_type ?? null,
    resolution_comment: record.resolution_comment ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
