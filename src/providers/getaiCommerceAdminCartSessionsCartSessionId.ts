import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get cart session details by cartSessionId from ai_commerce_cart_sessions.
 *
 * Retrieves a specific cart session record using its unique UUID. Returns full
 * session details including buyer reference, cart association, session token,
 * status, expiration, and all audit timestamps. This endpoint is used for admin
 * audit, troubleshooting, compliance review, and persistent cart workflows.
 * Only administrators can use this endpoint and may access all sessions, with
 * all fields included.
 *
 * @param props - Properties for retrieving the cart session
 * @param props.admin - The authenticated admin making this request
 * @param props.cartSessionId - Unique cart session UUID to be retrieved
 * @returns IAiCommerceCartSession object representing the session record
 * @throws {Error} If the session does not exist for the specified ID
 */
export async function getaiCommerceAdminCartSessionsCartSessionId(props: {
  admin: AdminPayload;
  cartSessionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartSession> {
  const row = await MyGlobal.prisma.ai_commerce_cart_sessions.findUniqueOrThrow(
    {
      where: { id: props.cartSessionId },
    },
  );
  return {
    id: row.id,
    buyer_id: row.buyer_id === null ? undefined : row.buyer_id,
    cart_id: row.cart_id,
    session_token: row.session_token,
    status: row.status,
    expires_at:
      row.expires_at === null ? undefined : toISOStringSafe(row.expires_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
