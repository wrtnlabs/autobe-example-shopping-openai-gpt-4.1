import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import { IPageIShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallBoardsBoardIdPosts(props: {
  boardId: string & tags.Format<"uuid">;
  body: IShoppingMallBoardPost.IRequest;
}): Promise<IPageIShoppingMallBoardPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic where clause; do not include undefined filters
  const where: Record<string, unknown> = {
    shopping_mall_board_id: props.boardId,
    deleted_at: null,
  };
  if (props.body.moderation_status !== undefined) {
    where.moderation_status = props.body.moderation_status;
  }
  if (props.body.visibility !== undefined) {
    where.visibility = props.body.visibility;
  }
  if (props.body.reply_level !== undefined) {
    where.reply_level = props.body.reply_level;
  }
  if (props.body.author_type !== undefined) {
    if (props.body.author_type === "customer") {
      where.shopping_mall_customer_id = { not: null };
    } else if (props.body.author_type === "seller") {
      where.shopping_mall_seller_id = { not: null };
    } else if (props.body.author_type === "admin") {
      where.shopping_mall_admin_id = { not: null };
    }
  }
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    where.created_at = Object.assign(where.created_at ?? {}, {
      gte: props.body.created_after,
    });
  }
  if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    where.created_at = Object.assign(where.created_at ?? {}, {
      lte: props.body.created_before,
    });
  }
  if (props.body.title !== undefined) {
    where.title = { contains: props.body.title };
  }
  if (props.body.body !== undefined) {
    where.body = { contains: props.body.body };
  }

  // Allowed sort fields only
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (props.body.sort !== undefined) {
    let dir: "asc" | "desc" = "desc";
    let raw = props.body.sort.trim();
    if (raw.startsWith("-")) {
      dir = "desc";
      raw = raw.slice(1);
    } else if (raw.startsWith("+")) {
      dir = "asc";
      raw = raw.slice(1);
    } else {
      dir = "asc";
    }
    const allowed = ["created_at", "reply_level", "title"];
    if (allowed.includes(raw)) {
      orderBy = { [raw]: dir };
    }
  }

  // Prisma queries
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_board_posts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_board_posts.count({ where }),
  ]);

  // Map results to ISummary
  const data = posts.map((post) => {
    const summary: IShoppingMallBoardPost.ISummary = {
      id: post.id,
      shopping_mall_board_id: post.shopping_mall_board_id,
      // Nullable+optional title handling
      ...(post.title !== undefined &&
        post.title !== null && { title: post.title }),
      // body_summary truncation (100 chars max)?
      ...(post.body && { body_summary: post.body.substring(0, 100) }),
      reply_level: post.reply_level,
      is_official_answer: post.is_official_answer,
      visibility: post.visibility,
      moderation_status: post.moderation_status,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      // Optional and nullable deleted_at
      ...(post.deleted_at !== undefined &&
        post.deleted_at !== null && {
          deleted_at: toISOStringSafe(post.deleted_at),
        }),
    };
    return summary;
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
