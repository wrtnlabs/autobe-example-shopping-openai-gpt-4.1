import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently erase an article category by ID from the system (hard delete).
 *
 * Irreversibly deletes the specified article category from the taxonomy,
 * removing its record from the database. This is a _hard_ delete operation: the
 * record is physically erased without a soft-delete or restoration path.
 * Clients are responsible for managing child categories or related articles
 * prior to invoking this API, as orphans or navigation errors may result.
 * Intended strictly for administrative use, by authorized operators.
 *
 * @param props - Props object for request parameters
 * @param props.admin - The authenticated admin performing the deletion
 *   (authorization contract)
 * @param props.articleCategoryId - Unique identifier of the article category to
 *   delete
 * @returns Void (no response body)
 * @throws {Error} If the specified article category does not exist, a Prisma
 *   error is thrown.
 */
export async function delete__shoppingMallAiBackend_admin_articleCategories_$articleCategoryId(props: {
  admin: AdminPayload;
  articleCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { articleCategoryId } = props;
  await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.delete({
    where: { id: articleCategoryId },
  });
}
