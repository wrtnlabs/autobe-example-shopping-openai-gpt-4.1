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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdAttachmentsAttachmentLinkId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attachmentLinkId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttachmentLink> {
  // 1. Load the product and check ownership and existence
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized: Not your product", 403);
  }
  // 2. Check not discontinued
  // For stricter business logic, could check for status or business_status values other than 'active'/'approved', but spec says soft delete/discontinued blocked
  if (product.status === "discontinued" || product.deleted_at !== null) {
    throw new HttpException("Product is deleted or discontinued", 404);
  }
  // 3. Load the attachment link (with attachment relation)
  const link =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findFirst({
      where: {
        id: props.attachmentLinkId,
        shopping_mall_product_id: props.productId,
      },
      include: {
        attachment: true,
      },
    });
  if (!link) {
    throw new HttpException("Attachment link not found", 404);
  }
  // 4. Embed product and attachment for response per DTO (fields only from DTO structure)
  return {
    id: link.id,
    shopping_mall_product_id: link.shopping_mall_product_id,
    attachment_id: link.attachment_id,
    purpose: link.purpose,
    position: link.position,
    product: {
      id: product.id,
      shopping_mall_seller_id: product.shopping_mall_seller_id,
      shopping_mall_channel_id: product.shopping_mall_channel_id,
      shopping_mall_section_id: product.shopping_mall_section_id,
      shopping_mall_category_id: product.shopping_mall_category_id,
      code: product.code,
      name: product.name,
      status: product.status,
      business_status: product.business_status,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      deleted_at: product.deleted_at
        ? toISOStringSafe(product.deleted_at)
        : undefined,
    },
    attachment: link.attachment && {
      id: link.attachment.id,
      filename: link.attachment.filename,
      file_extension: link.attachment.file_extension,
      mime_type: link.attachment.mime_type,
      size_bytes: link.attachment.size_bytes,
      server_url: link.attachment.server_url,
      public_accessible: link.attachment.public_accessible,
      permission_scope: link.attachment.permission_scope ?? undefined,
      logical_source: link.attachment.logical_source ?? undefined,
      hash_md5: link.attachment.hash_md5,
      description: link.attachment.description ?? undefined,
      created_at: toISOStringSafe(link.attachment.created_at),
      updated_at: toISOStringSafe(link.attachment.updated_at),
      deleted_at: link.attachment.deleted_at
        ? toISOStringSafe(link.attachment.deleted_at)
        : undefined,
    },
  };
}
