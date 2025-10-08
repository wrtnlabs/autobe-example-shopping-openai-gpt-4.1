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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductsProductIdOptionsOptionIdValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductOptionValue> {
  const { seller, productId, optionId, body } = props;

  // 1. Ensure product exists, is owned by seller, and not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by you", 404);
  }

  // 2. Ensure option exists under productId, not deleted
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: optionId,
      shopping_mall_product_id: productId,
    },
    select: { id: true },
  });
  if (!option) {
    throw new HttpException(
      "Product option not found or not part of product",
      404,
    );
  }

  // 3. Build where filter for option values
  const where = {
    shopping_mall_product_option_id: optionId,
    ...(body.value !== undefined &&
      body.value !== null && {
        value: { contains: body.value },
      }),
    ...(body.display_order !== undefined &&
      body.display_order !== null && {
        display_order: body.display_order,
      }),
    ...(body.created_from !== undefined &&
      body.created_from !== null && {
        created_at: { gte: body.created_from },
      }),
    ...(body.created_to !== undefined &&
      body.created_to !== null && {
        created_at: {
          ...(body.created_from !== undefined &&
            body.created_from !== null && { gte: body.created_from }),
          lte: body.created_to,
        },
      }),
  };

  // 4. Pagination
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  // 5. Sorting - default is by display_order asc if not set
  let orderBy: any = { display_order: "asc" };
  if (body.sort_by) {
    let direction: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";
    if (["value", "display_order", "created_at"].includes(body.sort_by)) {
      orderBy = { [body.sort_by]: direction };
    } else {
      // Fallback to display_order
      orderBy = { display_order: direction };
    }
  }

  // 6. Find total count and page data in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_option_values.count({ where }),
    MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // 7. Map results to API DTO (no nullable fields in this DTO)
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
