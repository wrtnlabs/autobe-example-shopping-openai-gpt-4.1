import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new cart session in ai_commerce_cart_sessions.
 *
 * Creates and persists a new cart session. The session is tied to either the
 * authenticated buyer, or can be a guest (no buyer_id). Populates
 * ai_commerce_cart_sessions with a unique session token and links to the
 * correct cart. Handles required associations, creation/update timestamps, and
 * optional expiration. Sellers and admins are not allowed to use this
 * endpoint.
 *
 * @param props - Request properties
 * @param props.buyer - Authenticated BuyerPayload (must be of type 'buyer').
 *   Only buyers can access this endpoint.
 * @param props.body - Creation fields for the cart session (ICreate DTO)
 * @returns Persisted cart session entity (IAiCommerceCartSession)
 * @throws {Error} When uniqueness constraints for session_token or cart_id are
 *   violated (business error handled at API layer)
 */
export async function postaiCommerceBuyerCartSessions(props: {
  buyer: BuyerPayload;
  body: IAiCommerceCartSession.ICreate;
}): Promise<IAiCommerceCartSession> {
  const { body } = props;

  const created = await MyGlobal.prisma.ai_commerce_cart_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      buyer_id: body.buyer_id ?? undefined,
      cart_id: body.cart_id,
      session_token: body.session_token,
      status: body.status,
      expires_at: body.expires_at ?? undefined,
      created_at: body.created_at,
      updated_at: body.updated_at,
    },
  });
  return {
    id: created.id,
    buyer_id: created.buyer_id ?? undefined,
    cart_id: created.cart_id,
    session_token: created.session_token,
    status: created.status,
    expires_at: created.expires_at ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
