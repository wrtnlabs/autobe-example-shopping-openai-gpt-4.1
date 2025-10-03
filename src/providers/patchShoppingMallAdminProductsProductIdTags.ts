import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdTags(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.IRequest;
}): Promise<IPageIShoppingMallProductTag.ISummary> {
  // 1. Check product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });

  // 2. Extract/normalize pagination
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  // 3. Tag search support (no case insensitivity for SQLite compatibility)
  const where = {
    shopping_mall_product_id: props.productId,
    ...(props.body.tag ? { tag: { contains: props.body.tag } } : {}),
  };

  // 4. Query page data and total with inline orderBy
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_tags.findMany({
      where,
      orderBy:
        props.body.sort === "tag"
          ? { tag: "asc" as const }
          : props.body.sort === "tag_desc"
            ? { tag: "desc" as const }
            : { id: "desc" as const },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_tags.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      tag: row.tag,
    })),
  };
}
