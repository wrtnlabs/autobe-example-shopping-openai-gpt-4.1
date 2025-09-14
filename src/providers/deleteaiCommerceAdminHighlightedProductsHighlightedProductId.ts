import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Remove a highlighted product from discovery curation registry (hard delete)
 *
 * This endpoint performs a hard deletion on a highlighted product record,
 * permanently removing the entry. This is due to the lack of a soft-delete
 * field ('deleted_at') in the ai_commerce_highlighted_products schema.
 *
 * Only authorized admins or curating sellers may perform this operation. If the
 * highlight is in an active campaign period (highlight_end_at is in the
 * future), deletion is disallowed. All deletions are strongly validated and
 * business rules are enforced.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this operation
 * @param props.highlightedProductId - UUID of highlighted product to remove
 * @returns Void
 * @throws {Error} When the highlighted product does not exist, or is in an
 *   active campaign
 */
export async function deleteaiCommerceAdminHighlightedProductsHighlightedProductId(props: {
  admin: AdminPayload;
  highlightedProductId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the highlight record by id, ensure it exists
  const highlighted =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findUnique({
      where: { id: props.highlightedProductId },
    });
  if (!highlighted) {
    throw new Error("Highlighted product not found");
  }

  // Step 2: If highlight_end_at exists and is in the future, prevent deletion
  if (
    highlighted.highlight_end_at !== null &&
    highlighted.highlight_end_at !== undefined &&
    toISOStringSafe(highlighted.highlight_end_at) > toISOStringSafe(new Date())
  ) {
    throw new Error(
      "Cannot delete a highlight during an active campaign period",
    );
  }

  // Step 3: Hard delete (permanently remove, since soft delete not in schema)
  await MyGlobal.prisma.ai_commerce_highlighted_products.delete({
    where: { id: props.highlightedProductId },
  });
}
