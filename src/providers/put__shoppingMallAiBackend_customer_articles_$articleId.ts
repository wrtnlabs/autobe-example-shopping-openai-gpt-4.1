import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Updates an existing article's content, title, status, or other permitted
 * business fields by ID.
 *
 * Enables an authenticated and authorized customer to update their own article
 * identified by UUID. Allowed update fields: title, body, status, pinned,
 * is_notice. Enforces author ownership, prevents updates to deleted articles,
 * ensures title uniqueness within channel, and creates a historical versioned
 * snapshot for compliance.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the update
 * @param props.articleId - UUID of the article to update
 * @param props.body - Partial update fields (title, body, status, pinned,
 *   is_notice)
 * @returns The fully updated article object reflecting all changes
 * @throws {Error} If the article does not exist, is deleted, user is not
 *   author, or title uniqueness would be violated
 */
export async function put__shoppingMallAiBackend_customer_articles_$articleId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendArticle.IUpdate;
}): Promise<IShoppingMallAiBackendArticle> {
  const { customer, articleId, body } = props;

  // 1. Fetch original article
  const article =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.findUniqueOrThrow({
      where: { id: articleId },
    });

  // 2. Validate soft-deletion
  if (article.deleted_at !== null) {
    throw new Error("Cannot update a deleted article.");
  }
  // 3. Enforce author ownership
  if (article.author_id !== customer.id) {
    throw new Error("Only the author may update this article.");
  }

  // 4. Uniqueness check for (channel_id, title)
  const willChangeTitleOrChannel =
    (body.title !== undefined && body.title !== article.title) ||
    (body.channel_id !== undefined && body.channel_id !== article.channel_id);
  if (willChangeTitleOrChannel) {
    const channel_id = body.channel_id ?? article.channel_id;
    const title = body.title ?? article.title;
    const conflict =
      await MyGlobal.prisma.shopping_mall_ai_backend_articles.findFirst({
        where: {
          channel_id,
          title,
          deleted_at: null,
          id: { not: articleId },
        },
      });
    if (conflict) {
      throw new Error(
        "A different article in this channel already uses the requested title. Titles must be unique per channel.",
      );
    }
  }

  // 5. Prepare fields to update (only supplied fields)
  const now = toISOStringSafe(new Date());
  // Only explicit listed fields are included; undefineds skipped
  const updateFields = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.body !== undefined ? { body: body.body } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
    ...(body.is_notice !== undefined ? { is_notice: body.is_notice } : {}),
    updated_at: now,
  };

  // 6. Update the article
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.update({
      where: { id: articleId },
      data: updateFields,
    });

  // 7. Write audit/versioned snapshot record
  await MyGlobal.prisma.shopping_mall_ai_backend_article_snapshots.create({
    data: {
      id: v4(),
      article_id: article.id,
      editor_id: customer.id,
      title: updated.title,
      body: updated.body,
      status: updated.status,
      is_notice: updated.is_notice,
      pinned: updated.pinned,
      created_at: now,
    },
  });

  // 8. Return updated article with all date fields formatted correctly
  return {
    id: updated.id,
    channel_id: updated.channel_id,
    title: updated.title,
    body: updated.body,
    author_id: updated.author_id,
    pinned: updated.pinned,
    status: updated.status,
    view_count: updated.view_count,
    is_notice: updated.is_notice,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
