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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdOptions(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IRequest;
}): Promise<IPageIShoppingMallProductOption.ISummary> {
  const { productId, body } = props;

  // Pagination
  const page = body.page == null ? 1 : body.page;
  const limit = body.limit == null ? 20 : body.limit;
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" }[] = [{ position: "asc" }];
  if (body.sort) {
    // Acceptable sort fields: name, position, required, created_at, updated_at
    // Parse syntax: field:order
    const [fieldRaw, orderRaw] = body.sort.split(":");
    const field = fieldRaw?.trim();
    const order = orderRaw?.trim().toLowerCase() === "desc" ? "desc" : "asc";
    const allowedFields = [
      "name",
      "position",
      "required",
      "created_at",
      "updated_at",
    ];
    if (field && allowedFields.includes(field)) {
      orderBy = [{ [field]: order }];
    }
  }

  // Build dynamic where filter object
  const where = {
    shopping_mall_product_id: productId,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.required !== undefined && { required: body.required }),
  };

  // Query options in parallel
  const [options, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_options.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_options.count({ where }),
  ]);

  // Map to ISummary (convert Date fields)
  const data: IShoppingMallProductOption.ISummary[] = options.map((opt) => ({
    id: opt.id,
    shopping_mall_product_id: opt.shopping_mall_product_id,
    name: opt.name,
    required: opt.required,
    position: opt.position,
    created_at: toISOStringSafe(opt.created_at),
    updated_at: toISOStringSafe(opt.updated_at),
    deleted_at: opt.deleted_at ? toISOStringSafe(opt.deleted_at) : undefined,
  }));

  // Pagination info (branding via Number() to fit tags.Type)
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
