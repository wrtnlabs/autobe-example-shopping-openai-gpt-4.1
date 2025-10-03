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

export async function postShoppingMallSellerProductsProductIdAttachments(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttachmentLink.ICreate;
}): Promise<IShoppingMallProductAttachmentLink> {
  // Check if product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Find seller by payload.id
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: product.shopping_mall_seller_id,
      shopping_mall_customer_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("You are not the owner of this product", 403);
  }
  // Check if attachment exists and is not deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: props.body.attachment_id,
      deleted_at: null,
    },
  });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Check for existing link (enforce uniqueness)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attachment_id: props.body.attachment_id,
        purpose: props.body.purpose,
        position: props.body.position,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Attachment link with same purpose and position already exists for this product.",
      409,
    );
  }
  // Create new link
  const created =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        attachment_id: props.body.attachment_id,
        purpose: props.body.purpose,
        position: props.body.position,
      },
    });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    attachment_id: created.attachment_id,
    purpose: created.purpose,
    position: created.position,
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
    attachment: {
      id: attachment.id,
      filename: attachment.filename,
      file_extension: attachment.file_extension,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      server_url: attachment.server_url,
      public_accessible: attachment.public_accessible,
      permission_scope: attachment.permission_scope ?? undefined,
      logical_source: attachment.logical_source ?? undefined,
      hash_md5: attachment.hash_md5,
      description: attachment.description ?? undefined,
      created_at: toISOStringSafe(attachment.created_at),
      updated_at: toISOStringSafe(attachment.updated_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : undefined,
    },
  };
}
