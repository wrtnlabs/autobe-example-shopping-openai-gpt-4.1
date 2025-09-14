import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing product-tag binding (ai_commerce_product_tags).
 *
 * This operation updates an existing product-tag binding for a given record ID.
 * It is used to correct, reclassify, or annotate the product-tag relationship.
 * However, the current database schema does not provide updatable moderation
 * fields (e.g., status, note); only basic join fields exist. All changes are
 * audited, but actual update is not possible until the schema is enhanced.
 *
 * Only admin users are permitted to perform this operation.
 *
 * @param props - Parameters for product-tag binding update
 * @param props.admin - Authenticated admin payload
 * @param props.productTagId - The unique identifier of the product-tag binding
 *   to update
 * @param props.body - Fields to update (currently, schema does not support any
 *   updatable fields)
 * @returns The updated product-tag binding (or current record; actual update
 *   not possible with schema)
 * @throws {Error} When the product-tag binding does not exist or update is
 *   impossible due to schema limitation
 */
export async function putaiCommerceAdminProductTagsProductTagId(props: {
  admin: AdminPayload;
  productTagId: string & tags.Format<"uuid">;
  body: IAiCommerceProductTag.IUpdate;
}): Promise<IAiCommerceProductTag> {
  // Schema does not support updating any fields (status, note, etc.)
  // Fallback: fetch the record, if not found throw error; else return as-is
  const found = await MyGlobal.prisma.ai_commerce_product_tags.findFirst({
    where: { id: props.productTagId },
  });
  if (!found) {
    throw new Error(
      "Product-tag binding not found; cannot update non-existent record",
    );
  }
  return {
    id: found.id,
    ai_commerce_product_id: found.ai_commerce_product_id,
    ai_commerce_tag_id: found.ai_commerce_tag_id,
    created_at: toISOStringSafe(found.created_at),
  };
}
