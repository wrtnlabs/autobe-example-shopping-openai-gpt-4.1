import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new payment entry for a specific order.
 *
 * This operation validates the order’s eligibility for payment (not
 * cancelled/finalized), ensures it belongs to the authenticated customer, and
 * prevents duplicate active ('pending') payments for the same order and payment
 * method. All dates are handled as strict ISO strings. The payment is created
 * in 'pending' status and returned with proper type restrictions.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer for whom the payment is
 *   being created
 * @param props.orderId - The UUID of the order to create the payment for
 * @param props.body - Payment creation payload, including payment_method,
 *   amount, currency, and external_reference (if provided)
 * @returns The created payment record with all fields formatted appropriately
 * @throws {Error} If the order does not exist or is not owned by the customer
 * @throws {Error} If the order's status prevents creation of a new payment
 * @throws {Error} If a duplicate pending payment for this order/method already
 *   exists
 */
export async function post__shoppingMallAiBackend_customer_orders_$orderId_payments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderPayment.ICreate;
}): Promise<IShoppingMallAiBackendOrderPayment> {
  const { customer, orderId, body } = props;

  // 1. Validate order existence and ownership
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        deleted_at: null,
      },
      select: {
        id: true,
        // Ownership field (must exist):
        shopping_mall_ai_backend_customer_id: true,
        status: true,
      },
    },
  );
  if (!order) throw new Error("Order not found.");
  if (
    !("shopping_mall_ai_backend_customer_id" in order) ||
    order.shopping_mall_ai_backend_customer_id !== customer.id
  ) {
    throw new Error("Order does not belong to this customer.");
  }
  // Validate order status (business logic: prevent payment for cancelled/finalized orders)
  if (
    ["cancelled", "closed", "refunded"].includes(
      (order.status || "").toLowerCase(),
    )
  ) {
    throw new Error("Order is not eligible for payment.");
  }

  // 2. Check for duplicate pending payment with same method
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findFirst({
      where: {
        shopping_mall_ai_backend_order_id: orderId,
        payment_method: body.payment_method,
        status: "pending",
        deleted_at: null,
      },
    });
  if (duplicate) throw new Error("Duplicate payment attempt detected.");

  // 3. Insert payment (all date-times are branded ISO string)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_order_id: orderId,
        payment_method: body.payment_method,
        amount: body.amount,
        currency: body.currency,
        status: "pending",
        external_reference: body.external_reference ?? null,
        requested_at: now,
        created_at: now,
        updated_at: now,
      },
    });

  // 4. Map db response (dates → ISO string, nullable handled)
  return {
    id: created.id,
    shopping_mall_ai_backend_order_id:
      created.shopping_mall_ai_backend_order_id,
    payment_method: created.payment_method,
    amount: created.amount,
    currency: created.currency,
    status: created.status,
    external_reference: created.external_reference,
    requested_at: toISOStringSafe(created.requested_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : null,
    failed_at: created.failed_at ? toISOStringSafe(created.failed_at) : null,
    cancelled_at: created.cancelled_at
      ? toISOStringSafe(created.cancelled_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
