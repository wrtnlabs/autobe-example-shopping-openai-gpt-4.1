import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import { IPageIShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttachmentLink";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdAttachments(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttachmentLink.IRequest;
}): Promise<IPageIShoppingMallProductAttachmentLink.ISummary> {
  const { seller, productId, body } = props;

  // 1. Fetch product and check if seller is owner
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_mall_seller_id !== seller.id)
    throw new HttpException("Forbidden: You do not own this product", 403);

  // 2. Pagination params
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where conditions
  const where: Record<string, any> = {
    shopping_mall_product_id: productId,
    ...(body.purpose !== undefined ? { purpose: body.purpose } : {}),
    ...(body.position !== undefined ? { position: body.position } : {}),
    ...(body.attachmentId !== undefined
      ? { attachment_id: body.attachmentId }
      : {}),
  };

  // 4. Sort option
  const sortField = body.sort ?? "position";
  const sortOrder = body.order ?? "asc";
  const orderBy = { [sortField]: sortOrder };

  // 5. Query results and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_attachment_links.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        attachment_id: true,
        purpose: true,
        position: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_attachment_links.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((link) => ({
      id: link.id,
      attachment_id: link.attachment_id,
      purpose: link.purpose,
      position: link.position,
    })),
  };
}
