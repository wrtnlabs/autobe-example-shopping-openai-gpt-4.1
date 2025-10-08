import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import { IPageIShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerServiceEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomerServiceEvents(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerServiceEvent.IRequest;
}): Promise<IPageIShoppingMallCustomerServiceEvent> {
  const { body } = props;

  // Pagination parameters (default: page=1, limit=20; max 100)
  const page =
    typeof (body as any).page === "number" &&
    Number.isFinite((body as any).page)
      ? (body as any).page
      : 1;
  const limit =
    typeof (body as any).limit === "number" &&
    Number.isFinite((body as any).limit)
      ? Math.min((body as any).limit, 100)
      : 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.order_history_id !== undefined && {
      order_history_id: body.order_history_id,
    }),
    ...(body.shopping_mall_escalation_id !== undefined && {
      shopping_mall_escalation_id: body.shopping_mall_escalation_id,
    }),
    ...(body.shopping_mall_appeal_id !== undefined && {
      shopping_mall_appeal_id: body.shopping_mall_appeal_id,
    }),
    ...(body.actor_customer_id !== undefined && {
      actor_customer_id: body.actor_customer_id,
    }),
    ...(body.actor_seller_id !== undefined && {
      actor_seller_id: body.actor_seller_id,
    }),
    ...(body.actor_admin_id !== undefined && {
      actor_admin_id: body.actor_admin_id,
    }),
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.event_status !== undefined && { event_status: body.event_status }),
    ...(body.event_comment !== undefined &&
      body.event_comment !== null && {
        event_comment: { contains: body.event_comment },
      }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_service_events.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_customer_service_events.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    order_history_id: row.order_history_id ?? undefined,
    shopping_mall_escalation_id: row.shopping_mall_escalation_id ?? undefined,
    shopping_mall_appeal_id: row.shopping_mall_appeal_id ?? undefined,
    actor_customer_id: row.actor_customer_id ?? undefined,
    actor_seller_id: row.actor_seller_id ?? undefined,
    actor_admin_id: row.actor_admin_id ?? undefined,
    event_type: row.event_type,
    event_status: row.event_status,
    event_comment: row.event_comment ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
