import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  // Step 1: Check for existing wishlist for this customer
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (existing) {
    throw new HttpException("A wishlist already exists for this customer", 409);
  }

  // Step 2: Create new wishlist with generated id and timestamps
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 3: Return response matching IShoppingMallWishlist
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
