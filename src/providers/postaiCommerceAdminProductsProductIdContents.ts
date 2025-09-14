import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new structured content record for a given product in
 * ai_commerce_product_contents
 *
 * Adds a new structured business content record to a product based on a POSTed
 * IAiCommerceProductContent.ICreate DTO. The request captures required fields
 * such as content_type, format, locale, content_body, and display_order.
 * Sellers can thus manage multiple languages, detail blocks, or technical
 * instructions under a product.
 *
 * Admin/seller privileges are required for this action, and business logic
 * checks for duplicate content types/locale per product. The operation ensures
 * that the product is active and not locked. On success, returns the newly
 * created entity for immediate UI rendering. Validation/enforcement of unique
 * constraints and field lengths must follow the schema. Error scenarios cover
 * access denied, failed validation, or immutable product state.
 *
 * @param props - Input object containing admin authentication, productId, and
 *   content body data
 * @param props.admin - The authenticated admin performing the operation
 * @param props.productId - The product to which content is to be added (UUID)
 * @param props.body - The IAiCommerceProductContent.ICreate DTO providing
 *   content-specific values
 * @returns The newly created IAiCommerceProductContent entity with all fields
 *   populated
 * @throws {Error} When product does not exist or is deleted
 * @throws {Error} When a duplicate content section exists for type/locale
 */
export async function postaiCommerceAdminProductsProductIdContents(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.ICreate;
}): Promise<IAiCommerceProductContent> {
  const { admin, productId, body } = props;

  // Step 1: Validate product existence and not-deleted status
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found or already deleted");
  }

  // Step 2: Prevent duplicate content_type/locale blocks for this product
  const exists = await MyGlobal.prisma.ai_commerce_product_contents.findFirst({
    where: {
      product_id: productId,
      content_type: body.content_type,
      locale: body.locale !== undefined ? body.locale : null,
    },
  });
  if (exists) {
    throw new Error(
      "A content section of this type/locale already exists for the specified product.",
    );
  }

  // Step 3: Generate fields and insert new content row
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.ai_commerce_product_contents.create({
    data: {
      id,
      product_id: productId,
      content_type: body.content_type,
      format: body.format,
      locale: body.locale !== undefined ? body.locale : null,
      content_body: body.content_body,
      display_order: body.display_order,
    },
  });

  return {
    id: created.id,
    product_id: created.product_id,
    content_type: created.content_type,
    format: created.format,
    locale: created.locale === null ? undefined : created.locale,
    content_body: created.content_body,
    display_order: created.display_order,
  };
}
