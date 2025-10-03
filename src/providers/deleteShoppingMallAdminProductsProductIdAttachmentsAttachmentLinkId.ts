import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdAttachmentsAttachmentLinkId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attachmentLinkId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch and verify the link exists for given productId and attachmentLinkId
  const link =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findFirst({
      where: {
        id: props.attachmentLinkId,
        shopping_mall_product_id: props.productId,
      },
    });
  if (!link) {
    throw new HttpException("Attachment link for this product not found", 404);
  }

  // Step 2: Delete the join link (hard delete)
  await MyGlobal.prisma.shopping_mall_product_attachment_links.delete({
    where: { id: props.attachmentLinkId },
  });

  // (Optional downstream audit trail/snapshot) -- not required by direct logic here
}
