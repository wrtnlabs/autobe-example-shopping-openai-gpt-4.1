import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const { orderId, body } = props;

  // Pagination params with defaults
  const currentPage = body.page ?? 1;
  const pageLimit = body.limit ?? 20;
  const offset = (currentPage - 1) * pageLimit;

  // Filtering conditions
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.shipment_code !== undefined && {
      shipment_code: body.shipment_code,
    }),
    ...(body.shopping_mall_seller_id !== undefined && {
      shopping_mall_seller_id: body.shopping_mall_seller_id,
    }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Fetch paginated data & total count
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: pageLimit,
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);

  // Map to summary DTO
  const data = rows.map((row) => ({
    id: row.id,
    order_id: row.shopping_mall_order_id,
    seller_id: row.shopping_mall_seller_id,
    shipment_code: row.shipment_code,
    external_tracking_number: row.external_tracking_number ?? undefined,
    status: row.status,
    carrier: row.carrier ?? undefined,
    requested_at: row.requested_at
      ? toISOStringSafe(row.requested_at)
      : undefined,
    shipped_at: row.shipped_at ? toISOStringSafe(row.shipped_at) : undefined,
    delivered_at: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // Pagination info
  const pagination = {
    current: currentPage,
    limit: pageLimit,
    records: count,
    pages: Math.ceil(count / pageLimit),
  };

  return { pagination, data };
}
