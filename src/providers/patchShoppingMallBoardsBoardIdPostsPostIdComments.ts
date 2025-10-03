import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComment";
import { IPageIShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallBoardsBoardIdPostsPostIdComments(props: {
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IShoppingMallComment.IRequest;
}): Promise<IPageIShoppingMallComment.ISummary> {
  const body = props.body;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build filters
  const where: Record<string, unknown> = {
    shopping_mall_board_post_id: props.postId,
    deleted_at: null,
    ...(body.reply_level !== undefined &&
      body.reply_level !== null && {
        level: body.reply_level,
      }),
    ...(body.moderation_status !== undefined &&
      body.moderation_status !== null && {
        moderation_status: body.moderation_status,
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: { gte: body.created_at },
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim().length > 0 && {
        body: { contains: body.search },
      }),
  };

  // author_type filter
  if (body.author_type === "customer") {
    where.shopping_mall_customer_id = { not: null };
    where.shopping_mall_seller_id = null;
    where.shopping_mall_admin_id = null;
  } else if (body.author_type === "seller") {
    where.shopping_mall_customer_id = null;
    where.shopping_mall_seller_id = { not: null };
    where.shopping_mall_admin_id = null;
  } else if (body.author_type === "admin") {
    where.shopping_mall_customer_id = null;
    where.shopping_mall_seller_id = null;
    where.shopping_mall_admin_id = { not: null };
  }

  // Sorting
  let orderBy: any = { created_at: "desc" };
  if (body.sort) {
    const [field, order] = body.sort.split(":");
    // Only allow whitelisted fields
    const allowed = ["created_at", "updated_at", "level", "body"];
    if (allowed.includes(field)) {
      orderBy = { [field]: order === "asc" ? "asc" : "desc" };
    }
  }

  // Query for data/total (in parallel)
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_comments.count({ where }),
  ]);

  // Map Prisma rows to ISummary output
  const data: IShoppingMallComment.ISummary[] = comments.map((row) => {
    let author_type = "customer";
    if (row.shopping_mall_admin_id) {
      author_type = "admin";
    } else if (row.shopping_mall_seller_id) {
      author_type = "seller";
    }
    const comment_body_summary =
      row.body.length > 100 ? row.body.slice(0, 100) : row.body;
    return {
      id: row.id,
      shopping_mall_board_post_id: row.shopping_mall_board_post_id ?? undefined,
      shopping_mall_product_inquiry_id:
        row.shopping_mall_product_inquiry_id ?? undefined,
      shopping_mall_review_id: row.shopping_mall_review_id ?? undefined,
      parent_comment_id: row.shopping_mall_parent_comment_id ?? undefined,
      author_type,
      comment_body_summary,
      level: row.level,
      moderation_status: row.moderation_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
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
