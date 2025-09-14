import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new cart session in ai_commerce_cart_sessions.
 *
 * Creates and persists a new cart session, tied to either an authenticated
 * buyer or as an anonymous/guest session. Populates ai_commerce_cart_sessions
 * with unique session token and links to the relevant cart. Ensures
 * session_token and cart_id adhere to uniqueness constraints. Buyers can create
 * sessions for their own cart; admins may perform this for testing or
 * recovery.
 *
 * Admin authorization is enforced. Only buyer accounts or guest carts may be
 * created (schema does not allow seller/admin sessions).
 *
 * @param props - The request properties
 * @param props.admin - The authenticated admin user creating the session
 * @param props.body - Request body (IAiCommerceCartSession.ICreate) containing
 *   buyer_id (nullable), cart_id, session_token, status, created_at,
 *   updated_at, and optional expires_at
 * @returns The newly persisted cart session
 * @throws {Error} Throws on duplicate session_token/cart_id (unique constraint
 *   violation) or other database errors
 */
export async function postaiCommerceAdminCartSessions(props: {
  admin: AdminPayload;
  body: IAiCommerceCartSession.ICreate;
}): Promise<IAiCommerceCartSession> {
  const entity = await MyGlobal.prisma.ai_commerce_cart_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      buyer_id:
        props.body.buyer_id !== undefined && props.body.buyer_id !== null
          ? props.body.buyer_id
          : null,
      cart_id: props.body.cart_id,
      session_token: props.body.session_token,
      status: props.body.status,
      expires_at:
        props.body.expires_at !== undefined && props.body.expires_at !== null
          ? props.body.expires_at
          : null,
      created_at: props.body.created_at,
      updated_at: props.body.updated_at,
    },
  });
  return {
    id: entity.id,
    buyer_id: entity.buyer_id ?? undefined,
    cart_id: entity.cart_id,
    session_token: entity.session_token,
    status: entity.status,
    expires_at: entity.expires_at ?? undefined,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
    deleted_at: undefined,
  };
}
