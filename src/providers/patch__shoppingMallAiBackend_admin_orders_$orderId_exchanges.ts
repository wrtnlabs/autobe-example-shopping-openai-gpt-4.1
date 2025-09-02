import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";
import { IPageIShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderExchange";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated and filtered list of exchange requests for a specific
 * order.
 *
 * This operation allows system administrators, after-sales support, and sellers
 * to review, search, and filter all exchange requests for a specific order.
 * Supports pagination, filtering by status and request date range. Returns full
 * exchange record metadata, associated item, rationale, audit trail dates, and
 * business status for compliance dashboards and analytics.
 *
 * Authorization is enforced by the presence of props.admin.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user invoking this operation
 * @param props.orderId - UUID of the order for which exchange requests are
 *   listed
 * @param props.body - Optional filter and pagination parameters for this
 *   order's exchanges
 * @returns Paginated list of exchange requests for the provided order
 * @throws {Error} If Prisma query fails or database is unavailable
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_exchanges(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderExchange.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderExchange> {
  const { orderId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build date filter for requested_at if specified
  const requestedAtFilter =
    body.date_start !== undefined &&
    body.date_start !== null &&
    body.date_end !== undefined &&
    body.date_end !== null
      ? { requested_at: { gte: body.date_start, lte: body.date_end } }
      : body.date_start !== undefined && body.date_start !== null
        ? { requested_at: { gte: body.date_start } }
        : body.date_end !== undefined && body.date_end !== null
          ? { requested_at: { lte: body.date_end } }
          : {};

  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...requestedAtFilter,
  };

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.count({ where }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findMany({
      where,
      orderBy: { requested_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_order_id: row.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      row.shopping_mall_ai_backend_order_item_id,
    exchange_reason: row.exchange_reason,
    status: row.status,
    requested_at: toISOStringSafe(row.requested_at),
    processed_at: row.processed_at ? toISOStringSafe(row.processed_at) : null,
    completed_at: row.completed_at ? toISOStringSafe(row.completed_at) : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
