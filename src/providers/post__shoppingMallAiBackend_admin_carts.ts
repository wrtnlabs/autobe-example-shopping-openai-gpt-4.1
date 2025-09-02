import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new shopping cart for a customer or guest session.
 *
 * Add a new shopping cart to the ShoppingMallAiBackend system for a customer or
 * guest session. This is called, for example, on guest checkout or the start of
 * a customer session. All IDs and date-times are strictly formatted, and no
 * native Date type or type assertion is used anywhere. All business logic for
 * uniqueness is enforced by the database layer.
 *
 * @param props - Properties including:
 *
 *   - Admin: AdminPayload (authorization - admin role required)
 *   - Body: IShoppingMallAiBackendCart.ICreate (cart metadata for creation)
 *
 * @returns The newly created shopping cart object including all fields
 * @throws {Error} If cart_token is not unique or DB constraint violation occurs
 */
export async function post__shoppingMallAiBackend_admin_carts(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCart.ICreate;
}): Promise<IShoppingMallAiBackendCart> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_customer_id:
        props.body.shopping_mall_ai_backend_customer_id ?? null,
      shopping_mall_ai_backend_customer_session_id:
        props.body.shopping_mall_ai_backend_customer_session_id ?? null,
      cart_token: props.body.cart_token,
      status: props.body.status,
      expires_at:
        props.body.expires_at !== undefined && props.body.expires_at !== null
          ? toISOStringSafe(props.body.expires_at)
          : null,
      last_merged_at:
        props.body.last_merged_at !== undefined &&
        props.body.last_merged_at !== null
          ? toISOStringSafe(props.body.last_merged_at)
          : null,
      note: props.body.note ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      created.shopping_mall_ai_backend_customer_session_id,
    cart_token: created.cart_token,
    status: created.status,
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    last_merged_at: created.last_merged_at
      ? toISOStringSafe(created.last_merged_at)
      : null,
    note: created.note,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
