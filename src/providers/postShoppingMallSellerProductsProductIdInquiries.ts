import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdInquiries(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInquiry.ICreate;
}): Promise<IShoppingMallProductInquiry> {
  // 1. Validate product existence and ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (product === null) {
    throw new HttpException(
      "Product not found or seller does not own product",
      404,
    );
  }

  // 2. Create inquiry
  const now = toISOStringSafe(new Date());
  const inquiry = await MyGlobal.prisma.shopping_mall_product_inquiries.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_customer_id: null,
      shopping_mall_seller_id: props.seller.id,
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

  return {
    id: inquiry.id,
    shopping_mall_product_id: inquiry.shopping_mall_product_id,
    shopping_mall_customer_id: inquiry.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: inquiry.shopping_mall_seller_id ?? undefined,
    title: inquiry.title ?? undefined,
    body: inquiry.body,
    is_private: inquiry.is_private,
    answered: inquiry.answered,
    moderation_status: inquiry.moderation_status,
    created_at: toISOStringSafe(inquiry.created_at),
    updated_at: toISOStringSafe(inquiry.updated_at),
    deleted_at: inquiry.deleted_at
      ? toISOStringSafe(inquiry.deleted_at)
      : undefined,
  };
}
