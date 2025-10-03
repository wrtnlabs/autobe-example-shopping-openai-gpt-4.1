import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerProductsProductIdInquiries(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInquiry.ICreate;
}): Promise<IShoppingMallProductInquiry> {
  // 1. Validate product exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Prepare timestamps (ISO datetime format)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 3. Insert inquiry
  const created = await MyGlobal.prisma.shopping_mall_product_inquiries.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_seller_id: null,
      title: props.body.title ?? null,
      body: props.body.body,
      is_private: props.body.is_private,
      answered: false,
      moderation_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Return API response, typing all fields carefully
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    title: created.title,
    body: created.body,
    is_private: created.is_private,
    answered: created.answered,
    moderation_status: created.moderation_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
