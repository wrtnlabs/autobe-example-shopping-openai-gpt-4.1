import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { IPageIShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IRequest;
}): Promise<IPageIShoppingMallProductOption.ISummary> {
  const { seller, productId, body } = props;

  // 1. Ownership/auth check: product exists, belongs to this seller, not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
      seller: {
        shopping_mall_customer_id: seller.id,
      },
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // 2. Build where clause for options listing
  const optionWhere: Record<string, any> = {
    shopping_mall_product_id: productId,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.required !== undefined && { required: body.required }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [{ name: { contains: body.search } }],
      }),
  };

  // 3. Pagination params with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sorting
  let orderBy;
  if (body.sort) {
    // Format: "field:asc" or "field:desc"
    const [fld, dir] = body.sort.split(":");
    orderBy = [
      {
        [fld]:
          dir === "desc"
            ? ("desc" as Prisma.SortOrder)
            : ("asc" as Prisma.SortOrder),
      },
    ];
  } else {
    orderBy = [{ position: "asc" as Prisma.SortOrder }];
  }

  // 5. Query paginated options & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_options.findMany({
      where: optionWhere,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_options.count({ where: optionWhere }),
  ]);

  // 6. Map data to ISummary (handle date types)
  const data = rows.map((opt) => ({
    id: opt.id,
    shopping_mall_product_id: opt.shopping_mall_product_id,
    name: opt.name,
    required: opt.required,
    position: opt.position,
    created_at: toISOStringSafe(opt.created_at),
    updated_at: toISOStringSafe(opt.updated_at),
    deleted_at: opt.deleted_at ? toISOStringSafe(opt.deleted_at) : undefined,
  }));

  // 7. Pagination info (strip tags for IPage.IPagination)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
