import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import { IPageIShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductsProductIdInquiries(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInquiry.IRequest;
}): Promise<IPageIShoppingMallProductInquiry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.answered !== undefined &&
      props.body.answered !== null && { answered: props.body.answered }),
    ...(props.body.is_private !== undefined &&
      props.body.is_private !== null && { is_private: props.body.is_private }),
    ...(props.body.moderation_status !== undefined && {
      moderation_status: props.body.moderation_status,
    }),
    ...(props.body.author_type === "customer" && {
      shopping_mall_customer_id: { not: null },
    }),
    ...(props.body.author_type === "seller" && {
      shopping_mall_seller_id: { not: null },
    }),
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined && {
              gte: props.body.created_from,
            }),
            ...(props.body.created_to !== undefined && {
              lte: props.body.created_to,
            }),
          },
        }
      : {}),
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const orderBy = props.body.sort_by
    ? {
        [props.body.sort_by]: (props.body.order === "asc"
          ? "asc"
          : "desc") as Prisma.SortOrder,
      }
    : { created_at: "desc" as Prisma.SortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_inquiries.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_product_id: true,
        title: true,
        body: true,
        is_private: true,
        answered: true,
        moderation_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_inquiries.count({ where }),
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
      title: row.title ?? undefined,
      body: row.body,
      is_private: row.is_private,
      answered: row.answered,
      moderation_status: row.moderation_status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
