import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import { EOrderRefundStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderRefundStatus";
import { IPageIShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderRefund";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a paginated list of refund records for the authenticated customer's
 * order.
 *
 * Allows a customer to view all refund requests and completed refunds for an
 * order they own, with support for filtering by status, pagination, and
 * ordering by most recent request. Ensures strict authorization so customers
 * can access only their own orders. All refund records are returned in
 * compliance with audit and soft-delete (deleted_at) rules.
 *
 * @param props - The request context and parameters
 * @param props.customer - Authenticated customer payload (holds the user's
 *   UUID)
 * @param props.orderId - The order's unique identifier (UUID)
 * @param props.body - Search, filter, and pagination request parameters
 * @returns Paginated page of refund records for the order, with audit fields
 *   and all status/progress information
 * @throws {Error} When the order does not exist or does not belong to the
 *   authenticated customer
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_refunds(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: import("../api/structures/IShoppingMallAiBackendOrderRefund").IShoppingMallAiBackendOrderRefund.IRequest;
}): Promise<
  import("../api/structures/IPageIShoppingMallAiBackendOrderRefund").IPageIShoppingMallAiBackendOrderRefund
> {
  const { customer, orderId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // 1. Authorization: Ensure the order belongs to this customer
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    },
  );
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error(
      "Unauthorized: Order does not belong to authenticated customer",
    );
  }

  // 2. Filters: status (if present), soft delete, linkage to this order only
  const whereCond = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };

  // 3. Query all refund records for this order, with pagination and sort
  const [refunds, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findMany({
      where: whereCond,
      orderBy: { requested_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.count({
      where: whereCond,
    }),
  ]);

  // 4. Map fields to DTO (convert all Date fields using toISOStringSafe, handle nullable fields safely)
  const result = refunds.map((r) => ({
    id: r.id,
    shopping_mall_ai_backend_order_id: r.shopping_mall_ai_backend_order_id,
    refund_reason: r.refund_reason,
    refund_type: r.refund_type,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    requested_at: toISOStringSafe(r.requested_at),
    processed_at: r.processed_at ? toISOStringSafe(r.processed_at) : null,
    completed_at: r.completed_at ? toISOStringSafe(r.completed_at) : null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
  }));

  // 5. Pagination calculation (number conversion to avoid type intersection errors)
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: result,
  };
}
