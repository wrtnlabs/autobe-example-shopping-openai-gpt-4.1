import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (logical deletion) a shopping cart by marking deleted_at for
 * compliance retention
 *
 * This endpoint allows an admin to mark a shopping cart as logically deleted by
 * setting its deleted_at timestamp. The cart is retained for audit and
 * compliance but becomes unavailable for new commerce events. Associated items
 * or coupon usages are not affected by this operation. If the cart is already
 * deleted or does not exist, an error will be thrown. This operation is
 * restricted to admins with elevated permissions.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.cartId - The UUID of the shopping cart to be soft deleted
 * @returns Void
 * @throws {Error} If the cart does not exist
 * @throws {Error} If the cart has already been deleted
 */
export async function delete__shoppingMallAiBackend_admin_carts_$cartId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { cartId } = props;
  // Find the cart by ID, select only id and deleted_at for efficiency
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findUnique({
    where: { id: cartId },
    select: { id: true, deleted_at: true },
  });
  if (!cart) {
    throw new Error("Cart not found");
  }
  if (cart.deleted_at !== null) {
    throw new Error("Cart is already deleted");
  }
  // Soft delete by setting deleted_at to the current timestamp (ISO string)
  await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
