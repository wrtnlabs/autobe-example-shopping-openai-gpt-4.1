import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { IPageIAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderRefund";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * List all refunds for a specific order with search and pagination from
 * ai_commerce_order_refunds.
 *
 * Retrieves a paginated, filtered list of refund records for a given orderId as
 * a seller, supporting advanced search, multiple filters, and ordering. Only
 * refunds for orders the authenticated seller owns are visible; access to
 * others is denied.
 *
 * @param props - Function arguments
 * @param props.seller - Authenticated seller (role: seller)
 * @param props.orderId - Order ID for which refunds should be listed (UUID)
 * @param props.body - Advanced filter, search, and pagination criteria
 *   (matching IAiCommerceOrderRefund.IRequest)
 * @returns A paginated list of order refunds matching the filter criteria for
 *   the seller's own order
 * @throws {Error} If seller does not own the target order
 */
export async function patchaiCommerceSellerOrdersOrderIdRefunds(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.IRequest;
}): Promise<IPageIAiCommerceOrderRefund> {
  const { seller, orderId, body } = props;

  // 1. Confirm seller owns the specified order by matching their id (buyer_id) with order items' seller_id
  const ownsOrder = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      order_id: orderId,
      seller_id: seller.id,
    },
    select: { id: true },
  });
  if (!ownsOrder) {
    throw new Error(
      "Unauthorized: You do not have access to refunds for this order.",
    );
  }

  // 2. Prepare filters from body for ai_commerce_order_refunds
  const status = body.status;
  const refund_code = body.refund_code;
  const actor_id = body.actor_id;
  const min_amount = body.min_amount;
  const max_amount = body.max_amount;
  const requested_after = body.requested_after;
  const requested_before = body.requested_before;
  const search = body.search;

  // Range for amount
  const amountRange =
    typeof min_amount === "number" || typeof max_amount === "number"
      ? {
          amount: {
            ...(typeof min_amount === "number" ? { gte: min_amount } : {}),
            ...(typeof max_amount === "number" ? { lte: max_amount } : {}),
          },
        }
      : {};

  // Range for requested_at
  const requestedAtRange =
    requested_after || requested_before
      ? {
          requested_at: {
            ...(requested_after ? { gte: requested_after } : {}),
            ...(requested_before ? { lte: requested_before } : {}),
          },
        }
      : {};

  // Search field
  const orSearch = search
    ? {
        OR: [
          { refund_code: { contains: search } },
          { reason: { contains: search } },
        ],
      }
    : {};

  // Full where
  const where = {
    order_id: orderId,
    ...(Array.isArray(status) && status.length > 0
      ? { status: { in: status } }
      : {}),
    ...(refund_code ? { refund_code } : {}),
    ...(actor_id ? { actor_id } : {}),
    ...amountRange,
    ...requestedAtRange,
    ...orSearch,
  };

  // 3. Pagination (defaults)
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // 4. Sorting (validate field; default to requested_at)
  const allowedSortFields = ["requested_at", "resolved_at", "amount"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "requested_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query total records matching criteria
  const total = await MyGlobal.prisma.ai_commerce_order_refunds.count({
    where,
  });

  // 6. Query refund records
  const rows = await MyGlobal.prisma.ai_commerce_order_refunds.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder },
    skip,
    take: limit,
  });

  // 7. Map to IAiCommerceOrderRefund[]
  const data = rows.map((x) => ({
    id: x.id,
    order_id: x.order_id,
    actor_id: x.actor_id,
    refund_code: x.refund_code,
    reason: x.reason ?? undefined,
    status: x.status,
    amount: x.amount,
    currency: x.currency,
    requested_at: toISOStringSafe(x.requested_at),
    resolved_at: x.resolved_at ? toISOStringSafe(x.resolved_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
