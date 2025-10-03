import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderSnapshot> {
  const { orderId, body } = props;

  // Default pagination
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? Math.min(body.limit, 100) : 20;
  const skip = (page - 1) * limit;

  // Compose where criteria
  const where: Record<string, unknown> = {
    shopping_mall_order_id: orderId,
    ...(body.order_snapshot_id !== undefined && {
      id: body.order_snapshot_id,
    }),
    ...(body.created_at_start !== undefined || body.created_at_end !== undefined
      ? {
          created_at: {
            ...(body.created_at_start !== undefined && {
              gte: body.created_at_start,
            }),
            ...(body.created_at_end !== undefined && {
              lte: body.created_at_end,
            }),
          },
        }
      : {}),
  };

  // Query concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_snapshots.count({ where }),
  ]);

  // Map to DTO output
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_order_id: row.shopping_mall_order_id,
      snapshot_data: row.snapshot_data,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
