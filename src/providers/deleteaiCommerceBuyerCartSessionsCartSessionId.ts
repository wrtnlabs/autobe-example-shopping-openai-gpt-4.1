import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Soft delete (erase) a cart session by cartSessionId from
 * ai_commerce_cart_sessions.
 *
 * This operation was designed to mark the cart session as deleted by setting
 * the deleted_at timestamp, retaining the record in the database for audit and
 * compliance purposes. Only the owning buyer may perform this action.
 *
 * However, the 'ai_commerce_cart_sessions' schema does NOT contain a
 * 'deleted_at' field. As a result, this function performs a HARD delete to
 * remove the session. If the session does not exist or is not owned by the
 * buyer, an error is thrown.
 *
 * @param props - The operation properties
 * @param props.buyer - The authenticated buyer performing the delete
 * @param props.cartSessionId - UUID identifying the cart session to delete
 * @returns Void (no body)
 * @throws {Error} If the cart session does not exist or is not owned by buyer
 */
export async function deleteaiCommerceBuyerCartSessionsCartSessionId(props: {
  buyer: BuyerPayload;
  cartSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, cartSessionId } = props;

  // Find the cart session by ID
  const cartSession = await MyGlobal.prisma.ai_commerce_cart_sessions.findFirst(
    {
      where: {
        id: cartSessionId,
      },
    },
  );
  if (!cartSession) throw new Error("Cart session not found");

  // Authorization: Only the owning buyer may delete this session
  if (cartSession.buyer_id !== buyer.id)
    throw new Error("Unauthorized deletion of another user's cart session");

  // Perform hard delete; schema has no deleted_at (soft delete) field
  await MyGlobal.prisma.ai_commerce_cart_sessions.delete({
    where: { id: cartSessionId },
  });
}
