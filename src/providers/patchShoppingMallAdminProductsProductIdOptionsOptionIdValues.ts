import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IPageIShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductOptionValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductsProductIdOptionsOptionIdValues(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductOptionValue> {
  // 1. Validate product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Validate option exists and belongs to product
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: props.optionId,
      shopping_mall_product_id: props.productId,
    },
    select: { id: true },
  });
  if (!option) {
    throw new HttpException(
      "Option not found or does not belong to product",
      404,
    );
  }

  // 3. Pagination parameters
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined && props.body.limit >= 1
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  // 4. Build where clause
  const where = {
    shopping_mall_product_option_id: props.optionId,
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value },
    }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: props.body.created_from,
        }),
        ...(props.body.created_to !== undefined && {
          lte: props.body.created_to,
        }),
      },
    }),
  };

  // 5. Sorting
  const allowedSortFields = [
    "value",
    "created_at",
    "display_order",
    "updated_at",
  ];
  const sortField =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "display_order";
  const sortOrder = props.body.order === "desc" ? "desc" : "asc";

  // 6. Fetch
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_option_values.count({ where }),
  ]);

  // 7. DTO Mapping
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_product_option_id: row.shopping_mall_product_option_id,
    value: row.value,
    display_order: row.display_order,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

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
