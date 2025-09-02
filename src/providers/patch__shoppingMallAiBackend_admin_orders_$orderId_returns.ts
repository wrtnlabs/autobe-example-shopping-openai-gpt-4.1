import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";
import { IPageIShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderReturn";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List returns (after-sales requests) for an order with filter and pagination.
 *
 * Retrieves a paginated list of all return requests associated with a
 * particular order. Supports filtering by status, requested_at range, and
 * paginates the result. Only returns records for the specified order.
 *
 * Authorization: Requires admin authentication. Throws if admin authentication
 * is not present.
 *
 * @param props - Request parameters
 * @param props.admin - The authenticated admin user making the request
 * @param props.orderId - UUID of the order to list returns for
 * @param props.body - Optional filter and pagination parameters (status, date
 *   range, etc)
 * @returns A paginated record collection of returns for the specified order,
 *   including all evidence attributes
 * @throws {Error} If admin authentication is missing
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_returns(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderReturn.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderReturn> {
  if (!props.admin) throw new Error("Admin authentication required");

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;

  // Compose the WHERE clause for Prisma: always constrain to orderId and only non-deleted.
  const where = {
    shopping_mall_ai_backend_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.date_start !== undefined || props.body.date_end !== undefined
      ? {
          requested_at: {
            ...(props.body.date_start !== undefined
              ? { gte: props.body.date_start }
              : {}),
            ...(props.body.date_end !== undefined
              ? { lte: props.body.date_end }
              : {}),
          },
        }
      : {}),
  };

  const [data, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_returns.findMany({
      where,
      orderBy: { requested_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_returns.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: Math.ceil(records / Number(limit)),
    },
    data: data.map((ret) => ({
      id: ret.id,
      shopping_mall_ai_backend_order_id: ret.shopping_mall_ai_backend_order_id,
      shopping_mall_ai_backend_order_item_id:
        ret.shopping_mall_ai_backend_order_item_id,
      return_reason: ret.return_reason,
      status: ret.status,
      requested_at: toISOStringSafe(ret.requested_at),
      processed_at: ret.processed_at ? toISOStringSafe(ret.processed_at) : null,
      completed_at: ret.completed_at ? toISOStringSafe(ret.completed_at) : null,
      created_at: toISOStringSafe(ret.created_at),
      updated_at: toISOStringSafe(ret.updated_at),
      deleted_at: ret.deleted_at ? toISOStringSafe(ret.deleted_at) : null,
    })),
  };
}
