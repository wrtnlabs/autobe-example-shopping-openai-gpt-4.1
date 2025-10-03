import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdInquiriesInquiryId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductInquiry> {
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
    shopping_mall_customer_id:
      inquiry.shopping_mall_customer_id === null
        ? undefined
        : inquiry.shopping_mall_customer_id,
    shopping_mall_seller_id:
      inquiry.shopping_mall_seller_id === null
        ? undefined
        : inquiry.shopping_mall_seller_id,
    title: inquiry.title === null ? undefined : inquiry.title,
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
