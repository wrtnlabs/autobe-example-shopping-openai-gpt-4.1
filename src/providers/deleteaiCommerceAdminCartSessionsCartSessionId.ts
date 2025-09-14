import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (erase) a cart session by cartSessionId from
 * ai_commerce_cart_sessions.
 *
 * This admin operation marks a cart session as deleted by removing the record
 * from the database. If soft deletion is not supported by the schema, hard
 * delete is performed. Only administrators may invoke this operation.
 *
 * @param props - Properties for cart session deletion
 * @param props.admin - Authenticated administrator payload
 * @param props.cartSessionId - Unique identifier for the cart session to be
 *   deleted
 * @returns Promise<void> - Resolves when the operation completes
 * @throws {Error} If the session is not found (invalid cartSessionId)
 */
export async function deleteaiCommerceAdminCartSessionsCartSessionId(props: {
  admin: AdminPayload;
  cartSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { cartSessionId } = props;
  // Ensure the session exists first
  const session = await MyGlobal.prisma.ai_commerce_cart_sessions.findUnique({
    where: { id: cartSessionId },
  });
  if (!session) {
    throw new Error("Cart session not found");
  }
  // As the schema does not support soft deletion or 'deleted_at', perform a hard delete
  await MyGlobal.prisma.ai_commerce_cart_sessions.delete({
    where: { id: cartSessionId },
  });
}
