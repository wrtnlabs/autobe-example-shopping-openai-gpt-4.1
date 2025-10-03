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

export async function getShoppingMallSellerProductsProductIdInquiriesInquiryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductInquiry> {
  // Ownership: the seller must own the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!inquiry) {
    throw new HttpException("Inquiry not found", 404);
  }

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
