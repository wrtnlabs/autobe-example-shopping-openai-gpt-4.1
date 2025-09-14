import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartExpiration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a specific cart expiration/recovery
 * event.
 *
 * This operation fetches the full details of a single cart expiration or
 * recovery record identified by cartExpirationId from the
 * ai_commerce_cart_expirations table. Only authenticated admin users can access
 * this endpoint. Returns all event type, cart, actor, business context, and
 * timestamp information. Throws a descriptive error if the specified event does
 * not exist. Optional fields are normalized to undefined.
 *
 * @param props - Object containing required parameters
 * @param props.admin - The authenticated administrator performing the operation
 *   (authorization required)
 * @param props.cartExpirationId - Unique identifier of the cart expiration or
 *   recovery event
 * @returns IAiCommerceCartExpiration record with all details for
 *   audit/compliance/context
 * @throws {Error} If no matching event exists
 */
export async function getaiCommerceAdminCartExpirationsCartExpirationId(props: {
  admin: AdminPayload;
  cartExpirationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartExpiration> {
  const { cartExpirationId } = props;
  const record = await MyGlobal.prisma.ai_commerce_cart_expirations.findUnique({
    where: { id: cartExpirationId },
  });
  if (!record) throw new Error("Cart expiration or recovery event not found");
  return {
    id: record.id,
    cart_id: record.cart_id,
    actor_id: record.actor_id === null ? undefined : record.actor_id,
    event_type: record.event_type,
    details: record.details === null ? undefined : record.details,
    created_at: toISOStringSafe(record.created_at),
  };
}
