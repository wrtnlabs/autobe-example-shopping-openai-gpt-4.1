import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import { IPageIShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEscalation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminEscalations(props: {
  admin: AdminPayload;
  body: IShoppingMallEscalation.IRequest;
}): Promise<IPageIShoppingMallEscalation.ISummary> {
  // Paging defaults
  const page = 1;
  const limit = 20;

  // Map filters
  const where = {
    deleted_at: null,
    ...(props.body.orderId && { shopping_mall_order_id: props.body.orderId }),
    ...(props.body.escalation_type && {
      escalation_type: props.body.escalation_type,
    }),
    // Map initiator filters
    ...(props.body.initiator_role === "customer" &&
      props.body.initiator_id && {
        initiator_customer_id: props.body.initiator_id,
      }),
    ...(props.body.initiator_role === "seller" &&
      props.body.initiator_id && {
        initiator_seller_id: props.body.initiator_id,
      }),
    // Optional description -> no actual field, but could be used in notes/comments in a more complex system
  };

  // Query escalations
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_escalations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        initiator_customer_id: true,
        initiator_seller_id: true,
        assigned_admin_id: true,
        escalation_type: true,
        escalation_status: true,
        resolution_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_escalations.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    initiator_customer_id: row.initiator_customer_id ?? undefined,
    initiator_seller_id: row.initiator_seller_id ?? undefined,
    assigned_admin_id: row.assigned_admin_id ?? undefined,
    escalation_type: row.escalation_type,
    escalation_status: row.escalation_status,
    resolution_type: row.resolution_type ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
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
