import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdInquiriesInquiryId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch inquiry by id + product + not deleted
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (!inquiry) {
    throw new HttpException("Inquiry not found or already deleted", 404);
  }

  // Step 2: Check seller owns this inquiry
  if (inquiry.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Only the inquiry's author may delete",
      403,
    );
  }

  // Step 3: Update inquiry (soft delete)
  await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: { id: props.inquiryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Optionally: In production, trigger audit/notification, but not required here.
}
