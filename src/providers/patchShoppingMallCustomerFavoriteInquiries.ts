import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteInquiry";
import { IPageIShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerFavoriteInquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteInquiry.IRequest;
}): Promise<IPageIShoppingMallFavoriteInquiry> {
  const { customer, body } = props;

  // Pagination defaults
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = pageRaw >= 1 ? pageRaw : 1;
  const limit = limitRaw >= 1 && limitRaw <= 200 ? limitRaw : 20;
  const skip = (page - 1) * limit;

  // Sorting
  const sortField =
    body.sort_field === "updated_at" ? "updated_at" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Where filter base
  const where: Record<string, any> = {
    shopping_mall_customer_id: customer.id,
    deleted_at: null,
  };

  // productId filter, resolves via shopping_mall_product_inquiries relation
  if (body.productId !== undefined && body.productId !== null) {
    // Need to filter via join with inquiry
    const inquiryIds =
      await MyGlobal.prisma.shopping_mall_product_inquiries.findMany({
        where: {
          shopping_mall_product_id: body.productId,
        },
        select: { id: true },
      });
    const inquiryIdList = inquiryIds.map((i) => i.id);
    where.shopping_mall_product_inquiry_id = {
      in: inquiryIdList.length > 0 ? inquiryIdList : [""],
    };
  }

  if (body.notification_enabled !== undefined) {
    where.notification_enabled = body.notification_enabled;
  }
  if (body.batch_label !== undefined) {
    where.batch_label = body.batch_label;
  }
  if (body.created_from !== undefined) {
    where.created_at = { ...(where.created_at ?? {}), gte: body.created_from };
  }
  if (body.created_to !== undefined) {
    where.created_at = {
      ...(where.created_at ?? {}),
      lte: body.created_to,
      ...(where.created_at ?? {}),
    };
  }

  // Query main rows and count total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_favorite_inquiries.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_favorite_inquiries.count({ where }),
  ]);

  // Map rows to DTO
  const data: IShoppingMallFavoriteInquiry[] = rows.map((r) => ({
    id: r.id,
    shopping_mall_customer_id: r.shopping_mall_customer_id,
    shopping_mall_product_inquiry_id: r.shopping_mall_product_inquiry_id,
    shopping_mall_favorite_snapshot_id: r.shopping_mall_favorite_snapshot_id,
    notification_enabled: r.notification_enabled,
    batch_label: r.batch_label ?? undefined,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : undefined,
  }));

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
