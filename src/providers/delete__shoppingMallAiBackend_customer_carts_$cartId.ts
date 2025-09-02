import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft delete (logical deletion) a shopping cart by marking deleted_at for
 * compliance retention
 *
 * This endpoint allows the authenticated customer (cart owner) to mark their
 * shopping cart as logically deleted by setting the 'deleted_at' timestamp. The
 * cart remains available in the system for evidence and compliance, but cannot
 * be used for future commerce events. Items and coupons remain for audit
 * purposes. Only the customer who owns the cart can perform this action (admins
 * or other users are not authorized for this endpoint).
 *
 * @param props - Request properties
 * @param props.customer - CustomerPayload identifying the authenticated cart
 *   owner
 * @param props.cartId - Unique identifier (UUID) of the cart to delete
 * @returns Void
 * @throws {Error} If the cart is not found, already deleted, or not owned by
 *   the customer
 */
export async function delete__shoppingMallAiBackend_customer_carts_$cartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, cartId } = props;
  // 1. Find cart by id and not already deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new Error("Cart not found or already deleted");
  }
  // 2. Ownership check: cart must belong to the customer
  if (cart.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Unauthorized: Only the owner can delete this cart");
  }
  // 3. Soft delete by updating deleted_at to current time
  await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
