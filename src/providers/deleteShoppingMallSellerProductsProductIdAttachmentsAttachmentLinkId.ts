import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdAttachmentsAttachmentLinkId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attachmentLinkId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the attachment link with provided id and product association
  const link =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findUnique({
      where: { id: props.attachmentLinkId },
    });
  if (!link) {
    throw new HttpException("Attachment link not found", 404);
  }
  if (link.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Attachment link does not belong to the specified product",
      404,
    );
  }

  // Fetch the product to verify seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  await MyGlobal.prisma.shopping_mall_product_attachment_links.delete({
    where: { id: props.attachmentLinkId },
  });

  // Audit log (if required for compliance)
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "product_attachment_link",
      entity_id: props.attachmentLinkId,
      event_type: "delete",
      actor_id: props.seller.id,
      event_result: "success",
      event_time: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
