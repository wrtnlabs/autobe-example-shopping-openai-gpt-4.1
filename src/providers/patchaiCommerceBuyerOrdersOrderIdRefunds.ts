import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { IPageIAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderRefund";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * List all refunds for a specific order with search and pagination from
 * ai_commerce_order_refunds.
 *
 * Retrieves a paginated list of refund records for a specific order (orderId).
 * The buyer must be the owner of the order. Supports advanced search,
 * filtering, sort, and pagination. Ensures only the authorized buyer can view
 * refund details for their orders. Soft-deleted refunds (deleted_at != null)
 * are excluded. Result fields and date values are mapped strictly to DTO types
 * (no Date, no type assertions).
 *
 * @param props - The request properties
 * @param props.buyer - Authenticated buyer making the request
 * @param props.orderId - Order UUID whose refunds are being listed
 * @param props.body - Request body for filtering/querying (see DTO)
 * @returns A page of refund records matching the search/filter criteria for
 *   this order
 * @throws {Error} If the order does not exist or is not owned by the buyer
 */
export async function patchaiCommerceBuyerOrdersOrderIdRefunds(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.IRequest;
}): Promise<IPageIAiCommerceOrderRefund> {
  // Validate order ownership
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: props.orderId,
      buyer_id: props.buyer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new Error("Order not found or not owned by current buyer");
  }

  // Paging: clamp default and maximum
  const rawPage = props.body.page !== undefined ? props.body.page : 1;
  const rawLimit = props.body.limit !== undefined ? props.body.limit : 20;
  const maxLimit = 100;
  const page = Number(rawPage);
  let limit = Number(rawLimit);
  if (limit > maxLimit) limit = maxLimit;
  if (limit < 1) limit = 20;
  const skip = (page - 1) * limit;

  // Build where conditions for Prisma
  const where = {
    order_id: props.orderId,
    deleted_at: null,
    ...(props.body.status !== undefined && props.body.status.length > 0
      ? { status: { in: props.body.status } }
      : {}),
    ...(props.body.refund_code !== undefined &&
    props.body.refund_code.length > 0
      ? { refund_code: { contains: props.body.refund_code } }
      : {}),
    ...(props.body.actor_id !== undefined && props.body.actor_id !== null
      ? { actor_id: props.body.actor_id }
      : {}),
    ...(props.body.min_amount !== undefined
      ? { amount: { gte: props.body.min_amount } }
      : {}),
    ...(props.body.max_amount !== undefined
      ? {
          amount: {
            ...(props.body.min_amount !== undefined
              ? { gte: props.body.min_amount }
              : {}),
            lte: props.body.max_amount,
          },
        }
      : {}),
    // Requested_at window
    ...(props.body.requested_after !== undefined ||
    props.body.requested_before !== undefined
      ? {
          requested_at: {
            ...(props.body.requested_after !== undefined &&
            props.body.requested_after !== null
              ? { gte: props.body.requested_after }
              : {}),
            ...(props.body.requested_before !== undefined &&
            props.body.requested_before !== null
              ? { lte: props.body.requested_before }
              : {}),
          },
        }
      : {}),
  };
  // Add search: OR on refund_code/reason
  const hasSearch =
    props.body.search !== undefined && props.body.search.length > 0;
  if (hasSearch) {
    Object.assign(where, {
      OR: [
        { refund_code: { contains: props.body.search } },
        { reason: { contains: props.body.search } },
      ],
    });
  }

  // Sort options
  const allowedSort: Record<string, true> = {
    requested_at: true,
    resolved_at: true,
    updated_at: true,
    created_at: true,
    amount: true,
    status: true,
    refund_code: true,
  };
  const sortField =
    props.body.sort_by && allowedSort[props.body.sort_by]
      ? props.body.sort_by
      : "requested_at";
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  // Query total and data in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_order_refunds.count({ where }),
    MyGlobal.prisma.ai_commerce_order_refunds.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
    }),
  ]);

  // Map results to DTO
  const data = rows.map(
    (row): IAiCommerceOrderRefund => ({
      id: row.id,
      order_id: row.order_id,
      actor_id: row.actor_id,
      refund_code: row.refund_code,
      reason: row.reason ?? undefined,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      requested_at: toISOStringSafe(row.requested_at),
      resolved_at:
        row.resolved_at !== null && row.resolved_at !== undefined
          ? toISOStringSafe(row.resolved_at)
          : undefined,
    }),
  );

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
