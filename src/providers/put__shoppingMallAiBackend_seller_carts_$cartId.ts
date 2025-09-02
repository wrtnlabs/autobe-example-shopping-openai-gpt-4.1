import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update shopping cart metadata or status for a given cartId.
 *
 * This endpoint allows authenticated sellers to update metadata on shopping
 * carts such as status, note, or session binding, as needed for business flows
 * like cart merging or status progression. Only fields provided in the request
 * body will be changed. The updated_at field is always refreshed.
 *
 * Authorization is enforced: only authenticated sellers may access this
 * endpoint. Note that carts are not directly owned by sellers; thus, access
 * control is limited to seller authentication as per current schema and
 * policy.
 *
 * @param props - Request properties
 * @param props.seller - Seller authentication payload
 * @param props.cartId - UUID of the cart to update
 * @param props.body - Update fields for the cart (status, session/customer
 *   association, note, etc.)
 * @returns The updated cart with all business fields reflecting data changes
 *   and timestamps in ISO format.
 * @throws {Error} If cart does not exist, has been deleted, or update fails
 */
export async function put__shoppingMallAiBackend_seller_carts_$cartId(props: {
  seller: SellerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCart.IUpdate;
}): Promise<IShoppingMallAiBackendCart> {
  const { cartId, body } = props;

  // Fetch the cart, ensure not deleted.
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
  });
  if (!cart) throw new Error("Cart not found or has been deleted");

  // Always update only updatable fields and set updated_at to now. Do not modify immutable fields (id, created_at, deleted_at).
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_carts.update({
    where: { id: cartId },
    data: {
      shopping_mall_ai_backend_customer_id:
        body.shopping_mall_ai_backend_customer_id ?? undefined,
      shopping_mall_ai_backend_customer_session_id:
        body.shopping_mall_ai_backend_customer_session_id ?? undefined,
      cart_token: body.cart_token ?? undefined,
      status: body.status ?? undefined,
      expires_at: body.expires_at ?? undefined,
      last_merged_at: body.last_merged_at ?? undefined,
      note: body.note ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Map Prisma date fields and nullables to API contract output.
  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      updated.shopping_mall_ai_backend_customer_session_id,
    cart_token: updated.cart_token,
    status: updated.status,
    expires_at: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
    last_merged_at: updated.last_merged_at
      ? toISOStringSafe(updated.last_merged_at)
      : null,
    note: updated.note,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
