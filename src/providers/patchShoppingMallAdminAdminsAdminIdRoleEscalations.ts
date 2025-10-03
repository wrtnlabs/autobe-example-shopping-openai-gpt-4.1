import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleEscalation";
import { IPageIShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleEscalation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminsAdminIdRoleEscalations(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminRoleEscalation.IRequest;
}): Promise<IPageIShoppingMallAdminRoleEscalation.ISummary> {
  // 1. Ensure admin exists, active, and not deleted
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.adminId,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!admin) throw new HttpException("Admin not found", 404);

  // 2. Calculate pagination/limit
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where condition
  const where = {
    shopping_mall_admin_id: props.adminId,
    deleted_at: null,
    ...(props.body.escalation_type !== undefined &&
      props.body.escalation_type !== null && {
        escalation_type: props.body.escalation_type,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.requestor_id !== undefined &&
      props.body.requestor_id !== null && {
        requestor_id: props.body.requestor_id,
      }),
    ...(props.body.reviewed_by_id !== undefined &&
      props.body.reviewed_by_id !== null && {
        reviewed_by_id: props.body.reviewed_by_id,
      }),
    ...((props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null) ||
    (props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null)
      ? {
          created_at: {
            ...(props.body.created_at_start !== undefined &&
              props.body.created_at_start !== null && {
                gte: props.body.created_at_start,
              }),
            ...(props.body.created_at_end !== undefined &&
              props.body.created_at_end !== null && {
                lte: props.body.created_at_end,
              }),
          },
        }
      : {}),
  };

  // 4. OrderBy
  const sortField =
    props.body.sort_by &&
    ["created_at", "status", "escalation_type"].includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder =
    props.body.sort_order === "asc" || props.body.sort_order === "desc"
      ? props.body.sort_order
      : "desc";

  // 5. Query (findMany, count in parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_role_escalations.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        escalation_type: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admin_role_escalations.count({
      where,
    }),
  ]);

  // 6. Map results
  const data = rows.map((r) => ({
    id: r.id,
    shopping_mall_admin_id: r.shopping_mall_admin_id,
    escalation_type: r.escalation_type,
    status: r.status,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  // 7. Pagination
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
