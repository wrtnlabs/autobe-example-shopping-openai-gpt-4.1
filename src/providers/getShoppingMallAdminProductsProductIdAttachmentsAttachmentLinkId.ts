import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdAttachmentsAttachmentLinkId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attachmentLinkId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttachmentLink> {
  // 1. Check product exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or deleted", 404);
  }

  // 2. Check attachment link exists, is for this product
  const link =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findFirst({
      where: {
        id: props.attachmentLinkId,
        shopping_mall_product_id: props.productId,
      },
      include: {
        product: true,
        attachment: true,
      },
    });
  if (!link) {
    throw new HttpException("Attachment link not found for product", 404);
  }

  // 3. Compose embedded product & attachment (if any)
  const embeddedProduct = link.product
    ? {
        id: link.product.id,
        shopping_mall_seller_id: link.product.shopping_mall_seller_id,
        shopping_mall_channel_id: link.product.shopping_mall_channel_id,
        shopping_mall_section_id: link.product.shopping_mall_section_id,
        shopping_mall_category_id: link.product.shopping_mall_category_id,
        code: link.product.code,
        name: link.product.name,
        status: link.product.status,
        business_status: link.product.business_status,
        created_at: toISOStringSafe(link.product.created_at),
        updated_at: toISOStringSafe(link.product.updated_at),
        deleted_at:
          link.product.deleted_at === null
            ? undefined
            : toISOStringSafe(link.product.deleted_at),
      }
    : undefined;
  const embeddedAttachment = link.attachment
    ? {
        id: link.attachment.id,
        filename: link.attachment.filename,
        file_extension: link.attachment.file_extension,
        mime_type: link.attachment.mime_type,
        size_bytes: link.attachment.size_bytes,
        server_url: link.attachment.server_url,
        public_accessible: link.attachment.public_accessible,
        permission_scope:
          typeof link.attachment.permission_scope === "string"
            ? link.attachment.permission_scope
            : undefined,
        logical_source:
          typeof link.attachment.logical_source === "string"
            ? link.attachment.logical_source
            : undefined,
        hash_md5: link.attachment.hash_md5,
        description:
          typeof link.attachment.description === "string"
            ? link.attachment.description
            : undefined,
        created_at: toISOStringSafe(link.attachment.created_at),
        updated_at: toISOStringSafe(link.attachment.updated_at),
        deleted_at:
          link.attachment.deleted_at === null
            ? undefined
            : toISOStringSafe(link.attachment.deleted_at),
      }
    : undefined;

  // 4. Return DTO
  return {
    id: link.id,
    shopping_mall_product_id: link.shopping_mall_product_id,
    attachment_id: link.attachment_id,
    purpose: link.purpose,
    position: link.position,
    product: embeddedProduct,
    attachment: embeddedAttachment,
  };
}
