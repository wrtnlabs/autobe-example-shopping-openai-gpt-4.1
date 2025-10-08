import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1 || limit < 1) {
    throw new HttpException("Invalid page or limit: must be >= 1", 400);
  }
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(body.parent_id !== undefined &&
      body.parent_id !== null && { parent_id: body.parent_id }),
    ...(body.name_ko && { name_ko: { contains: body.name_ko } }),
    ...(body.name_en && { name_en: { contains: body.name_en } }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.display_order !== undefined && {
      display_order: body.display_order,
    }),
    ...(body.search
      ? {
          OR: [
            { name_ko: { contains: body.search } },
            { name_en: { contains: body.search } },
            { description_ko: { contains: body.search } },
            { description_en: { contains: body.search } },
          ],
        }
      : {}),
  };
  const allowedSorts = ["display_order", "created_at", "name_ko", "name_en"];
  const sortField: "display_order" | "created_at" | "name_ko" | "name_en" =
    allowedSorts.includes(body.sort ?? "")
      ? (body.sort as "display_order" | "created_at" | "name_ko" | "name_en")
      : "display_order";
  const sortOrder: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      orderBy: [{ [sortField]: sortOrder }],
      skip,
      take: limit,
      select: {
        id: true,
        parent_id: true,
        name_ko: true,
        name_en: true,
        display_order: true,
        is_active: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);
  const data: IShoppingMallCategory.ISummary[] = rows.map((row) => {
    return {
      id: row.id,
      parent_id: row.parent_id ?? undefined,
      name_ko: row.name_ko,
      name_en: row.name_en,
      display_order: row.display_order,
      is_active: row.is_active,
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
