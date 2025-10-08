import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import { IPageIShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAppeals(props: {
  admin: AdminPayload;
  body: IShoppingMallAppeal.IRequest;
}): Promise<IPageIShoppingMallAppeal> {
  const { admin, body } = props;

  // Only admins may perform this operation (auth decorator guarantees this, but explicit check for defense)
  if (admin.type !== "admin") {
    throw new HttpException("Forbidden: Only admins can access appeals.", 403);
  }

  // Pagination defaults
  const page = 1;
  const limit = 20;

  // Build Prisma "where" filter from allowed fields in IRequest only
  const where = {
    ...(body.escalation_id && { escalation_id: body.escalation_id }),
    ...(body.appeal_type && { appeal_type: body.appeal_type }),
    // No status, actor, or date range fields in IRequest, so cannot filter by these
  };

  // Query data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_appeals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_appeals.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    escalation_id: row.escalation_id,
    appellant_customer_id: row.appellant_customer_id ?? undefined,
    appellant_seller_id: row.appellant_seller_id ?? undefined,
    reviewing_admin_id: row.reviewing_admin_id ?? undefined,
    appeal_type: row.appeal_type,
    appeal_status: row.appeal_status,
    resolution_type: row.resolution_type ?? undefined,
    resolution_comment: row.resolution_comment ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
