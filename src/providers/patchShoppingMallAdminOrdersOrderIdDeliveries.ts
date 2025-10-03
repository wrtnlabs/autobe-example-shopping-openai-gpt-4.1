import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { IPageIShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDelivery";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdDeliveries(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallDelivery.IRequest;
}): Promise<IPageIShoppingMallDelivery.ISummary> {
  const allowedSortFields = [
    "created_at",
    "recipient_name",
    "delivery_status",
    "confirmed_at",
  ];
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = allowedSortFields.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "created_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";
  // Build filter conditions
  const where = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.delivery_status !== undefined && {
      delivery_status: props.body.delivery_status,
    }),
    ...(props.body.shipment_id !== undefined && {
      shopping_mall_shipment_id: props.body.shipment_id,
    }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: { contains: props.body.recipient_name },
    }),
    ...(props.body.recipient_phone !== undefined && {
      recipient_phone: { contains: props.body.recipient_phone },
    }),
    ...(props.body.confirmed_at_from !== undefined ||
    props.body.confirmed_at_to !== undefined
      ? {
          confirmed_at: {
            ...(props.body.confirmed_at_from !== undefined && {
              gte: props.body.confirmed_at_from,
            }),
            ...(props.body.confirmed_at_to !== undefined && {
              lte: props.body.confirmed_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
  };

  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deliveries.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deliveries.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      order_id: row.shopping_mall_order_id,
      shipment_id: row.shopping_mall_shipment_id ?? null,
      recipient_name: row.recipient_name,
      recipient_phone: row.recipient_phone,
      address_snapshot: row.address_snapshot,
      delivery_message: row.delivery_message ?? null,
      delivery_status: row.delivery_status,
      confirmed_at: row.confirmed_at ? toISOStringSafe(row.confirmed_at) : null,
      delivery_attempts: row.delivery_attempts,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages: Math.ceil(count / limit),
    },
    data,
  };
}
