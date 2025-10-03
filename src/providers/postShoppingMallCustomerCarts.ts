import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  if (props.customer.id !== props.body.shopping_mall_customer_id) {
    throw new HttpException(
      "You cannot create carts for another customer.",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_carts.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      shopping_mall_channel_id: props.body.shopping_mall_channel_id,
      shopping_mall_section_id: props.body.shopping_mall_section_id,
      source: props.body.source,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_channel_id: created.shopping_mall_channel_id,
    shopping_mall_section_id: created.shopping_mall_section_id,
    source: created.source,
    status: created.status,
    expires_at:
      created.expires_at !== null ? toISOStringSafe(created.expires_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
