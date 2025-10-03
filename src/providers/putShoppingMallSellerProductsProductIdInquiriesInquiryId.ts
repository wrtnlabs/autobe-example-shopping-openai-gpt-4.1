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

export async function putShoppingMallSellerProductsProductIdInquiriesInquiryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInquiry.IUpdate;
}): Promise<IShoppingMallProductInquiry> {
  // 1. Load the inquiry and check existence, matching product, not deleted
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findUnique({
      where: { id: props.inquiryId },
    });
  if (!inquiry) throw new HttpException("Product inquiry not found", 404);
  if (inquiry.deleted_at !== null)
    throw new HttpException("Inquiry has been deleted", 400);
  if (inquiry.shopping_mall_product_id !== props.productId)
    throw new HttpException("Inquiry does not belong to this product", 400);
  // 2. Authorization: seller must be author of this inquiry
  if (inquiry.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException(
      "Unauthorized: Only the author seller can update this inquiry",
      403,
    );

  // 3. Restrict allowed mutable fields (title, body, is_private); ignore answered/moderation_status (only admins can set)
  // Also, don't allow update if moderation_status is something like 'locked' or 'rejected'—simulate as if 'rejected' disables editing
  if (inquiry.moderation_status === "rejected")
    throw new HttpException(
      "This inquiry cannot be edited due to moderation status",
      400,
    );

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: {
      title: props.body.title ?? undefined,
      body: props.body.body,
      is_private: props.body.is_private ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    // seller is always author here, so set seller field, customer is undefined
    shopping_mall_customer_id: undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    title: updated.title ?? undefined,
    body: updated.body,
    is_private: updated.is_private,
    answered: updated.answered,
    moderation_status: updated.moderation_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
