import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCarts(props: {
  admin: AdminPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  const now = toISOStringSafe(new Date());

  // 1. Validate referenced customer exists and is not deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.body.shopping_mall_customer_id,
      deleted_at: null,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // 2. Validate referenced channel exists and is not deleted
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      id: props.body.shopping_mall_channel_id,
      deleted_at: null,
    },
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }
  // 3. Validate referenced section exists and is not deleted
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      id: props.body.shopping_mall_section_id,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }

  // 4. Create the cart
  const cart = await MyGlobal.prisma.shopping_mall_carts.create({
    data: {
      id: v4() /* string & tags.Format<'uuid'> implicit from v4() call, never assert with 'as' */,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      shopping_mall_channel_id: props.body.shopping_mall_channel_id,
      shopping_mall_section_id: props.body.shopping_mall_section_id,
      source: props.body.source,
      status: "active", // As per system default for new carts
      expires_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: cart.id,
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    source: cart.source,
    status: cart.status,
    expires_at:
      cart.expires_at === null ? null : toISOStringSafe(cart.expires_at),
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at:
      cart.deleted_at === null ? null : toISOStringSafe(cart.deleted_at),
  };
}
