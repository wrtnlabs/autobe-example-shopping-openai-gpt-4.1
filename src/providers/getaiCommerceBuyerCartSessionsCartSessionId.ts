import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get cart session details by cartSessionId from ai_commerce_cart_sessions.
 *
 * Retrieves a cart session record as identified by cartSessionId, ensuring the
 * session belongs to the authenticated buyer. Only allows buyers to view their
 * own sessions. Returns all non-sensitive fields of the session. Throws if not
 * found or unauthorized.
 *
 * @param props - Function parameter
 * @param props.buyer - The BuyerPayload for the authenticated buyer (injected
 *   by @BuyerAuth).
 * @param props.cartSessionId - The cart session UUID being requested.
 * @returns Cart session record matching IAiCommerceCartSession.
 * @throws {Error} If session does not exist or is not owned by the buyer.
 */
export async function getaiCommerceBuyerCartSessionsCartSessionId(props: {
  buyer: BuyerPayload;
  cartSessionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartSession> {
  const { buyer, cartSessionId } = props;
  const session = await MyGlobal.prisma.ai_commerce_cart_sessions.findUnique({
    where: { id: cartSessionId },
    select: {
      id: true,
      buyer_id: true,
      cart_id: true,
      session_token: true,
      status: true,
      expires_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!session) throw new Error("Cart session not found");
  if (session.buyer_id == null || session.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: This cart session does not belong to you.");
  }
  return {
    id: session.id,
    ...(session.buyer_id !== null ? { buyer_id: session.buyer_id } : {}),
    cart_id: session.cart_id,
    session_token: session.session_token,
    status: session.status,
    expires_at:
      session.expires_at !== null && session.expires_at !== undefined
        ? toISOStringSafe(session.expires_at)
        : null,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    // Note: deleted_at is omitted as field does not exist in Prisma schema/output
  };
}
