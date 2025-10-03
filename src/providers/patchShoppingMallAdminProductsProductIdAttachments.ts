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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdAttachments(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttachmentLink.IRequest;
}): Promise<IPageIShoppingMallProductAttachmentLink.ISummary> {
  // 1. Ensure product exists and not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // 2. Extract and apply filters from request body
  const body = props.body;
  const where = {
    shopping_mall_product_id: props.productId,
    ...(body.purpose !== undefined && { purpose: body.purpose }),
    ...(body.position !== undefined && { position: body.position }),
    ...(body.attachmentId !== undefined && {
      attachment_id: body.attachmentId,
    }),
  };

  // 3. Pagination and sorting defaults
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  const skip = (page - 1) * limit;
  const sortField = body.sort !== undefined ? body.sort : "position";
  const sortOrder = body.order !== undefined ? body.order : "asc";
  const orderBy = { [sortField]: sortOrder };

  // 4. Get total count (for pagination)
  const total =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.count({
      where,
    });

  // 5. Query paginated links
  const rows =
    await MyGlobal.prisma.shopping_mall_product_attachment_links.findMany({
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
    });

  // 6. Map DB rows to ISummary objects
  const data = rows.map(
    (row): IShoppingMallProductAttachmentLink.ISummary => ({
      id: row.id,
      attachment_id: row.attachment_id,
      purpose: row.purpose,
      position: row.position,
    }),
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
