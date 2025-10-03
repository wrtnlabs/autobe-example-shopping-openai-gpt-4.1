import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerProductsProductIdInquiriesInquiryId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch inquiry (must exist and not be deleted, match productId)
  const inquiry =
    await MyGlobal.prisma.shopping_mall_product_inquiries.findFirst({
      where: {
        id: props.inquiryId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!inquiry) {
    throw new HttpException(
      "Product inquiry not found or already deleted",
      404,
    );
  }
  // 2. Check authorization (customer must be inquiry author)
  if (inquiry.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: only the inquiry author may delete this product inquiry",
      403,
    );
  }
  // 3. Soft delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_product_inquiries.update({
    where: {
      id: inquiry.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
