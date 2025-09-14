import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { IPageIAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search of status history (ai_commerce_order_status_history) for a
 * specific order.
 *
 * Retrieves a paginated list of all status transition events for the given
 * order, supporting filtering, searching, and sorting. Only authorized admins
 * may view the full status trail. This endpoint uses the
 * ai_commerce_order_status_history table and supports pagination for audit and
 * compliance scenarios.
 *
 * @param props - Function props
 * @param props.admin - The authenticated administrator performing the query
 * @param props.orderId - The order ID whose status history is to be listed
 * @param props.body - Filtering, sorting, and pagination instructions
 * @returns Paginated list of order status history records matching the criteria
 * @throws {Error} If the orderId is invalid or the admin is unauthorized
 */
export async function patchaiCommerceAdminOrdersOrderIdStatusHistory(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderStatusHistory.IRequest;
}): Promise<IPageIAiCommerceOrderStatusHistory> {
  const { admin, orderId, body } = props;
  // Pagination defaults and normalization
  const page = body.page !== undefined ? Number(body.page) : 0;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;

  // WHERE clause with correct null/undefined and range merge for changed_at
  const changedAtRange =
    body.changed_at_from !== undefined || body.changed_at_to !== undefined
      ? {
          changed_at: {
            ...(body.changed_at_from !== undefined && {
              gte: body.changed_at_from,
            }),
            ...(body.changed_at_to !== undefined && {
              lte: body.changed_at_to,
            }),
          },
        }
      : {};

  const where = {
    order_id: orderId,
    ...(body.actor_id !== undefined && { actor_id: body.actor_id }),
    ...(body.old_status !== undefined && { old_status: body.old_status }),
    ...(body.new_status !== undefined && { new_status: body.new_status }),
    ...changedAtRange,
  };

  // Sorting
  const sortBy = body.sort_by !== undefined ? body.sort_by : "changed_at";
  const sortDirection =
    body.sort_direction !== undefined ? body.sort_direction : "desc";

  // Retrieve paginated results and total
  const [items, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_status_history.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_order_status_history.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data: items.map((item) => {
      return {
        id: item.id,
        order_id: item.order_id,
        actor_id: item.actor_id,
        old_status: item.old_status,
        new_status: item.new_status,
        old_business_status:
          item.old_business_status !== null
            ? item.old_business_status
            : undefined,
        new_business_status:
          item.new_business_status !== null
            ? item.new_business_status
            : undefined,
        note: item.note !== null ? item.note : undefined,
        changed_at: toISOStringSafe(item.changed_at),
      };
    }),
  };
}
