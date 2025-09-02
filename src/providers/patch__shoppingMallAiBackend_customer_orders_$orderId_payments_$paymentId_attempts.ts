import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";
import { IPageIShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPaymentAttempt";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and list payment attempts for an order payment.
 *
 * Retrieve a paginated, filtered, and searchable list of all payment attempts
 * for a specific payment attached to an order. Filtering by attempt state,
 * provider, date range, sorting, and pagination are supported. Only attempts
 * for the order/payment owned by the authenticated customer are returned.
 * Throws forbidden or not found if access or relation is invalid.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.orderId - UUID of the order
 * @param props.paymentId - UUID of the payment (attached to the order)
 * @param props.body - Search and filter parameters for payment attempt listing
 * @returns Paginated and filtered list of payment attempt history for the
 *   order's payment
 * @throws {Error} When the order/payment is not found or not owned by the
 *   customer
 * @throws {Error} When access is forbidden (order does not belong to customer)
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_payments_$paymentId_attempts(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderPaymentAttempt.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderPaymentAttempt> {
  const { customer, orderId, paymentId, body } = props;

  // 1. Verify the order exists and belongs to the customer
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: Order does not belong to customer");
  }

  // 2. Verify the payment exists and is attached to the order
  const payment =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findUnique({
      where: { id: paymentId },
      select: { id: true, shopping_mall_ai_backend_order_id: true },
    });
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Forbidden: Payment does not belong to provided order");
  }

  // 3. Build where filter for attempts
  const requestedAt: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.from !== undefined) {
    requestedAt.gte = body.from;
  }
  if (body.to !== undefined) {
    requestedAt.lte = body.to;
  }

  const where = {
    shopping_mall_ai_backend_order_payment_id: paymentId,
    ...(body.attempt_state !== undefined &&
      body.attempt_state !== null && { attempt_state: body.attempt_state }),
    ...(body.provider_code !== undefined &&
      body.provider_code !== null && { provider_code: body.provider_code }),
    ...(Object.keys(requestedAt).length > 0 && { requested_at: requestedAt }),
  };

  // 4. Pagination basics
  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;

  // 5. Sorting logic
  const orderBy =
    body.sort !== undefined &&
    typeof body.sort === "string" &&
    body.sort === "requested_at"
      ? { requested_at: "desc" as const }
      : { requested_at: "desc" as const };

  // 6. Run queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_payment_attempts.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_payment_attempts.count({
      where,
    }),
  ]);

  // 7. Map attempts to response DTO
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_order_payment_id:
      row.shopping_mall_ai_backend_order_payment_id,
    attempt_state: row.attempt_state,
    error_message: row.error_message !== undefined ? row.error_message : null,
    provider_code: row.provider_code !== undefined ? row.provider_code : null,
    requested_at: toISOStringSafe(row.requested_at),
    completed_at:
      row.completed_at !== undefined && row.completed_at !== null
        ? toISOStringSafe(row.completed_at)
        : null,
    created_at: toISOStringSafe(row.created_at),
  }));

  // 8. Compose pagination output
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
