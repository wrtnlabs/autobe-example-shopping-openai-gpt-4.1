import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { IPageIShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBundle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdBundles(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.IRequest;
}): Promise<IPageIShoppingMallProductBundle> {
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.bundle_type !== undefined &&
      props.body.bundle_type !== null && {
        bundle_type: props.body.bundle_type,
      }),
    ...(props.body.search
      ? {
          OR: [
            { name: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };
  const allowedSortFields = ["position", "created_at", "name"];
  const sortByRaw = props.body.sort_by;
  const sortBy = allowedSortFields.includes(sortByRaw ?? "")
    ? sortByRaw
    : "position";
  const sortOrder = props.body.sort_order === "desc" ? "desc" : "asc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_bundles.findMany({
      where,
      orderBy:
        sortBy === "position"
          ? { position: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : { name: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_bundles.count({ where }),
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
      shopping_mall_product_id: row.shopping_mall_product_id,
      name: row.name,
      bundle_type: row.bundle_type,
      description: row.description ?? undefined,
      position: row.position,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    })),
  };
}
