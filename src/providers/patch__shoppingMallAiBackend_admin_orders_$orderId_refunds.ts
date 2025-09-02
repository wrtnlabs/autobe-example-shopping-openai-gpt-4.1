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
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of refund records for a specific order.
 *
 * Allows admins or compliance staff to view all refunds associated with a
 * particular order for audit, compliance, and customer service. The refund
 * records include complete audit and financial fields, and support pagination,
 * filtering, and sorting. Soft-deleted refunds are excluded.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (validated via controller
 *   decorator)
 * @param props.orderId - Unique identifier of the order to look up refunds for
 * @param props.body - Filter and pagination criteria
 * @returns Paginated list of refund records for the order
 * @throws {Error} When the order does not exist, or database/query errors
 */
export async function patch__shoppingMallAiBackend_admin_orders_$orderId_refunds(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderRefund.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderRefund> {
  const { orderId, body } = props;

  // 1. Check that the order exists
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
  if (!order) {
    throw new Error("Order not found");
  }

  // 2. Prepare query conditions (status is optional, filter refunds for this order, not soft-deleted)
  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
  };

  // 3. Pagination (defaults)
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  const skip = (page - 1) * limit;

  // 4. Query refund list and total count
  const [refunds, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.count({ where }),
  ]);

  // 5. Map refund fields with correct date conversions and nullability
  const data = refunds.map((refund) => ({
    id: refund.id,
    shopping_mall_ai_backend_order_id: refund.shopping_mall_ai_backend_order_id,
    refund_reason: refund.refund_reason,
    refund_type: refund.refund_type,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    requested_at: toISOStringSafe(refund.requested_at),
    processed_at: refund.processed_at
      ? toISOStringSafe(refund.processed_at)
      : null,
    completed_at: refund.completed_at
      ? toISOStringSafe(refund.completed_at)
      : null,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at: refund.deleted_at ? toISOStringSafe(refund.deleted_at) : null,
  }));

  // 6. Compose and return paginated result
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
