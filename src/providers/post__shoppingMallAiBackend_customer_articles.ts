import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new article on the platform for an authenticated and authorized
 * customer.
 *
 * This endpoint lets an authenticated customer (with posting rights) create a
 * new article in a specified channel. Fields such as title, content body, and
 * channel ID are validated. Enforces that the article's author matches the
 * authenticated customer. Ensures title uniqueness within the channel and
 * initializes all audit/compliance business fields.
 *
 * The created article includes server-generated fields and all business
 * properties. All actions are logged for compliance and audit.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer (author of the article)
 * @param props.body - Data for creating a new article (title, body, channel,
 *   status, etc.)
 * @returns The newly created article record, with all system and business
 *   fields populated.
 * @throws {Error} If author_id does not match authenticated customer
 * @throws {Error} If another article in the same channel has the same title
 */
export async function post__shoppingMallAiBackend_customer_articles(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendArticle.ICreate;
}): Promise<IShoppingMallAiBackendArticle> {
  const { customer, body } = props;
  // Authorization: ensure author matches authenticated customer
  if (body.author_id !== customer.id) {
    throw new Error(
      "You cannot create an article for another author: author_id must match your own account.",
    );
  }
  // Enforce uniqueness: no duplicate article title in the same channel (soft delete aware)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.findFirst({
      where: {
        channel_id: body.channel_id,
        title: body.title,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "An article with the same title already exists in this channel. Titles must be unique per channel.",
    );
  }
  // Generate values with proper types and timezone management
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.create({
      data: {
        id: v4(),
        channel_id: body.channel_id,
        title: body.title,
        body: body.body,
        author_id: body.author_id,
        pinned: body.pinned,
        status: body.status,
        is_notice: body.is_notice,
        view_count: typeof body.view_count === "number" ? body.view_count : 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Return value: strictly conforming and branded for all date/uuid fields
  return {
    id: created.id,
    channel_id: created.channel_id,
    title: created.title,
    body: created.body,
    author_id: created.author_id,
    pinned: created.pinned,
    status: created.status,
    is_notice: created.is_notice,
    view_count: created.view_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
