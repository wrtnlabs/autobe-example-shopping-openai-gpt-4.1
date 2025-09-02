import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Create a new comment on an article by article ID.
 *
 * This endpoint enables an authenticated customer to create a comment for a
 * designated article. The logic enforces article existence, content validation
 * (body minimum length), and always uses the authenticated user's ID as
 * author_id. Optionally supports threaded comments via parent_id. All dates are
 * ISO 8601 strings, and UUIDs are system-generated.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload (source of author_id)
 * @param props.articleId - UUID of the article to comment on
 * @param props.body - Comment content, privacy flag, and optional parent_id
 * @returns The created comment entity with all metadata fields populated
 * @throws {Error} If article does not exist, or if input validation fails
 */
export async function post__shoppingMallAiBackend_customer_articles_$articleId_comments(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendArticleComment.ICreate;
}): Promise<IShoppingMallAiBackendArticleComment> {
  const { customer, articleId, body } = props;

  // 1. Authorization: enforced by presence of customer argument (CustomerAuth decorator)
  // 2. Article existence check
  const article =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.findUnique({
      where: { id: articleId },
    });
  if (!article) {
    throw new Error("Article with given ID does not exist");
  }

  // 3. Input validation
  if (
    !body.body ||
    typeof body.body !== "string" ||
    body.body.trim().length < 3
  ) {
    throw new Error("Comment body must be at least 3 characters long.");
  }

  // 4. Prepare creation values
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.create({
      data: {
        id,
        article_id: articleId,
        parent_id: body.parent_id ?? null,
        author_id: customer.id,
        body: body.body,
        is_secret: body.is_secret,
        status: "visible",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 5. Return using expected DTO, converting all dates as required
  return {
    id: created.id,
    article_id: created.article_id,
    parent_id: created.parent_id ?? null,
    author_id: created.author_id,
    body: created.body,
    is_secret: created.is_secret,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
