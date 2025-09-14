import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update an existing cart session in ai_commerce_cart_sessions by
 * cartSessionId.
 *
 * Updates session fields (expiration, status, cart link, session token) for
 * session identified by cartSessionId. Only the buyer who owns the session may
 * update. Updates must adhere to business rules and not permit unauthorized
 * user cross-session updates. All updates are audited.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.buyer - The authenticated buyer making the request
 * @param props.cartSessionId - Unique identifier for the cart session to update
 *   (UUID)
 * @param props.body - Partial/full update input for the cart session
 *   (IAiCommerceCartSession.IUpdate)
 * @returns Updated cart session record after modification
 * @throws {Error} If session not found, not owned by buyer, or already deleted
 */
export async function putaiCommerceBuyerCartSessionsCartSessionId(props: {
  buyer: BuyerPayload;
  cartSessionId: string & tags.Format<"uuid">;
  body: IAiCommerceCartSession.IUpdate;
}): Promise<IAiCommerceCartSession> {
  const { buyer, cartSessionId, body } = props;

  // 1. Fetch the session by ID and ensure it belongs to the authenticated buyer and isn't deleted
  const session = await MyGlobal.prisma.ai_commerce_cart_sessions.findUnique({
    where: { id: cartSessionId },
  });
  if (
    !session ||
    session.deleted_at !== null ||
    session.buyer_id !== buyer.id
  ) {
    throw new Error(
      "Unauthorized: Cart session not found, deleted, or not owned by this buyer",
    );
  }

  // 2. Prepare update data (only fields present in the body), handling all nullable/optional structure explicitly
  const updateData = {
    ...(body.buyer_id !== undefined && { buyer_id: body.buyer_id }),
    ...(body.session_token !== undefined && {
      session_token: body.session_token,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.expires_at !== undefined && { expires_at: body.expires_at }),
    updated_at: body.updated_at,
  };

  const updated = await MyGlobal.prisma.ai_commerce_cart_sessions.update({
    where: { id: cartSessionId },
    data: updateData,
  });

  // 3. Map updated row to IAiCommerceCartSession
  return {
    id: updated.id,
    buyer_id: updated.buyer_id ?? undefined,
    cart_id: updated.cart_id,
    session_token: updated.session_token,
    status: updated.status,
    expires_at: updated.expires_at === null ? undefined : updated.expires_at,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at === null ? undefined : updated.deleted_at,
  } satisfies IAiCommerceCartSession;
}
