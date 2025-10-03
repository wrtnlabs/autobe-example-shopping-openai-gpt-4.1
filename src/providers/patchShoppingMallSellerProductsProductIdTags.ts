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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdTags(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.IRequest;
}): Promise<IPageIShoppingMallProductTag.ISummary> {
  // Step 1: Check product ownership and not soft-deleted.
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException(
      "Unauthorized: You do not own this product or it does not exist.",
      403,
    );
  }

  // Step 2: Parse pagination and search params.
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const tagSearch = props.body.tag;
  const sort = props.body.sort || "created_at:desc";

  let sortField = "created_at";
  let sortDir: "asc" | "desc" = "desc";
  if (sort.includes(":")) {
    const [field, dir] = sort.split(":");
    if (field === "tag" || field === "created_at") sortField = field;
    if (dir === "asc" || dir === "desc") sortDir = dir;
  }

  // Step 3: Build where filter for Prisma.
  const where = {
    shopping_mall_product_id: props.productId,
    ...(tagSearch ? { tag: { contains: tagSearch } } : {}),
  };

  // Step 4: Query counts and data.
  const [records, tags] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_tags.count({ where }),
    MyGlobal.prisma.shopping_mall_product_tags.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, tag: true },
    }),
  ]);

  const pages = Math.ceil(records / limit);
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records,
      pages,
    },
    data: tags.map((row) => ({ id: row.id, tag: row.tag })),
  };
}
