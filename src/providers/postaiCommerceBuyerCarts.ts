import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new shopping cart (ai_commerce_carts) for buyer or guest session.
 *
 * This operation creates a new shopping cart and associates it with the
 * authenticated buyer. It fills required and optional fields, using sensible
 * defaults (status = 'active', total_quantity = 0), records timestamps, and
 * ensures cart metadata is correct. Guest/anonymous scenarios and cart merging
 * are handled separately in upstream flows; this function handles only the cart
 * creation in ai_commerce_carts, enforcing buyer ownership, immutable
 * structure, and type safety.
 *
 * @param props - Object containing the authenticated buyer and the cart
 *   creation input
 * @param props.buyer - The authenticated buyer making the cart request
 * @param props.body - Cart creation input (optional fields: store_id, status,
 *   total_quantity)
 * @returns The newly created shopping cart as IAiCommerceCart
 * @throws {Error} If any database error or conflict occurs
 */
export async function postaiCommerceBuyerCarts(props: {
  buyer: BuyerPayload;
  body: IAiCommerceCart.ICreate;
}): Promise<IAiCommerceCart> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      buyer_id: props.buyer.id,
      store_id: props.body.store_id ?? undefined,
      status: props.body.status ?? "active",
      total_quantity: props.body.total_quantity ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    buyer_id: created.buyer_id ?? undefined,
    store_id: created.store_id ?? undefined,
    status: created.status,
    total_quantity: created.total_quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
