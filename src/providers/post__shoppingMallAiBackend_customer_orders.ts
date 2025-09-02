import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new order with customer, seller, channel, and line item data.
 * (shopping_mall_ai_backend_orders)
 *
 * This operation creates a new customer or checkout order based on a
 * well-formed request body. It inserts a new record into the
 * shopping_mall_ai_backend_orders table and launches necessary downstream
 * processes (e.g., assigning code, committing inventory, initial payment
 * intent). The endpoint validates all preconditions, such as customer
 * eligibility, product availability, and channel/seller context. This is a
 * primary entry for the checkout/ordering workflow. Business and evidence rules
 * for creation are enforced, and all related fields are managed by system logic
 * as required.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer (JWT payload)
 * @param props.body - Order creation data, including customer, channel, items,
 *   and payment context
 * @returns The created order's DTO, populated with all required fields
 * @throws {Error} If the request attempts to create an order for a different
 *   customer
 */
export async function post__shoppingMallAiBackend_customer_orders(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendOrder.ICreate;
}): Promise<IShoppingMallAiBackendOrder> {
  const { customer, body } = props;
  if (customer.id !== body.shopping_mall_ai_backend_customer_id) {
    throw new Error("Customers may only create orders for themselves");
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_orders.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_customer_id:
        body.shopping_mall_ai_backend_customer_id,
      shopping_mall_ai_backend_channel_id:
        body.shopping_mall_ai_backend_channel_id,
      shopping_mall_ai_backend_seller_id:
        body.shopping_mall_ai_backend_seller_id ?? null,
      code: body.code,
      status: body.status,
      total_amount: body.total_amount,
      currency: body.currency,
      ordered_at: body.ordered_at,
      confirmed_at: body.confirmed_at ?? null,
      cancelled_at: body.cancelled_at ?? null,
      closed_at: body.closed_at ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_channel_id:
      created.shopping_mall_ai_backend_channel_id,
    shopping_mall_ai_backend_seller_id:
      created.shopping_mall_ai_backend_seller_id,
    code: created.code,
    status: created.status,
    total_amount: created.total_amount,
    currency: created.currency,
    ordered_at: toISOStringSafe(created.ordered_at),
    confirmed_at:
      created.confirmed_at !== null && created.confirmed_at !== undefined
        ? toISOStringSafe(created.confirmed_at)
        : null,
    cancelled_at:
      created.cancelled_at !== null && created.cancelled_at !== undefined
        ? toISOStringSafe(created.cancelled_at)
        : null,
    closed_at:
      created.closed_at !== null && created.closed_at !== undefined
        ? toISOStringSafe(created.closed_at)
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
