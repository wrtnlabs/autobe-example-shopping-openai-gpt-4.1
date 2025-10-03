import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiryAnswer";
import { IPageIShoppingMallInquiryAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInquiryAnswer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductsProductIdInquiriesInquiryIdAnswers(props: {
  productId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiryAnswer.IRequest;
}): Promise<IPageIShoppingMallInquiryAnswer> {
  const { inquiryId, body } = props;
  // Pagination defaults and normalization
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = rawPage > 0 ? rawPage : 1;
  const limit = rawLimit > 0 ? rawLimit : 20;
  // Build WHERE conditions inline for type inference
  const where = {
    shopping_mall_product_inquiry_id: inquiryId,
    deleted_at: null,
    ...(body.authorType === "seller"
      ? { shopping_mall_seller_id: { not: null } }
      : {}),
    ...(body.authorType === "admin"
      ? { shopping_mall_admin_id: { not: null } }
      : {}),
    ...(body.moderation_status !== undefined && body.moderation_status !== null
      ? { moderation_status: body.moderation_status }
      : {}),
    ...(body.official_answer !== undefined && body.official_answer !== null
      ? { official_answer: body.official_answer }
      : {}),
  };
  const skip = (page - 1) * limit;
  const [answers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inquiry_answers.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_inquiry_answers.count({ where }),
  ]);
  const data = answers.map((answer) => {
    return {
      id: answer.id,
      shopping_mall_product_inquiry_id: answer.shopping_mall_product_inquiry_id,
      shopping_mall_seller_id:
        answer.shopping_mall_seller_id === null
          ? undefined
          : answer.shopping_mall_seller_id,
      shopping_mall_admin_id:
        answer.shopping_mall_admin_id === null
          ? undefined
          : answer.shopping_mall_admin_id,
      body: answer.body,
      moderation_status: answer.moderation_status,
      official_answer: answer.official_answer,
      notified_at:
        answer.notified_at === null || answer.notified_at === undefined
          ? undefined
          : toISOStringSafe(answer.notified_at),
      created_at: toISOStringSafe(answer.created_at),
      updated_at: toISOStringSafe(answer.updated_at),
      deleted_at:
        answer.deleted_at === null || answer.deleted_at === undefined
          ? undefined
          : toISOStringSafe(answer.deleted_at),
    };
  });
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
