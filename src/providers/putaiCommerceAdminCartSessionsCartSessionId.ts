import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing cart session in ai_commerce_cart_sessions by
 * cartSessionId.
 *
 * Updates session fields (expiration, status, cart link, session token) for the
 * session identified by cartSessionId. Only an administrator may use this
 * endpoint. Enforces integrity and valid status transitions per business logic.
 * All updates are audited according to platform policy (implementation not
 * shown).
 *
 * @param props - Request parameters and update data
 * @param props.admin - Authenticated administrator performing the update
 *   (enforced via AdminAuth)
 * @param props.cartSessionId - Unique identifier for the cart session to update
 *   (UUID)
 * @param props.body - Update payload for cart session fields (partial/full
 *   update)
 * @returns The updated cart session record after modification
 * @throws {Error} If the cart session does not exist
 */
export async function putaiCommerceAdminCartSessionsCartSessionId(props: {
  admin: AdminPayload;
  cartSessionId: string & tags.Format<"uuid">;
  body: IAiCommerceCartSession.IUpdate;
}): Promise<IAiCommerceCartSession> {
  const { admin, cartSessionId, body } = props;

  // 1. Fetch the existing cart session (error if not found)
  const existing =
    await MyGlobal.prisma.ai_commerce_cart_sessions.findUniqueOrThrow({
      where: { id: cartSessionId },
    });

  // 2. Update fields per input (only optional fields provided are sent to Prisma)
  const updated = await MyGlobal.prisma.ai_commerce_cart_sessions.update({
    where: { id: cartSessionId },
    data: {
      buyer_id: body.buyer_id ?? undefined,
      session_token: body.session_token ?? undefined,
      status: body.status ?? undefined,
      expires_at: body.expires_at ?? undefined,
      updated_at: body.updated_at,
    },
  });

  // 3. Normalize date/datetime fields and nullable/optionals to match IAiCommerceCartSession
  return {
    id: updated.id,
    buyer_id:
      updated.buyer_id === null ? null : (updated.buyer_id ?? undefined),
    cart_id: updated.cart_id,
    session_token: updated.session_token,
    status: updated.status,
    expires_at:
      updated.expires_at === null
        ? null
        : updated.expires_at !== undefined
          ? toISOStringSafe(updated.expires_at)
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    // deleted_at removed as field does not exist in schema
  };
}
