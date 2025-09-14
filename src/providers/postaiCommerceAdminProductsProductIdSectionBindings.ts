import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new section binding between a product and a merchandising section.
 *
 * This endpoint creates a binding that associates a product with a
 * merchandising section (such as 'Best Sellers' or 'Curated Picks') in the
 * ai_commerce_product_section_bindings table. The admin must ensure the product
 * exists, the section exists and is active, and that no duplicate binding
 * (product_id, section_id) or (section_id, display_order) exists. Attempts to
 * create duplicates are rejected with descriptive errors. Resulting binding
 * strictly matches the IAiCommerceProductSectionBinding interface.
 *
 * @param props - The operation parameters
 * @param props.admin - Authenticated admin payload
 * @param props.productId - The UUID of the product to associate
 * @param props.body - The section binding details to create (section_id and
 *   display_order)
 * @returns The created product-section binding, including id and all fields
 * @throws {Error} If product does not exist
 * @throws {Error} If section does not exist or is inactive
 * @throws {Error} If a binding for this (product, section) already exists
 * @throws {Error} If a display order is already used in this section
 */
export async function postaiCommerceAdminProductsProductIdSectionBindings(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSectionBinding.ICreate;
}): Promise<IAiCommerceProductSectionBinding> {
  const { admin, productId, body } = props;

  // Ensure product exists
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // Ensure section exists and is active
  const section = await MyGlobal.prisma.ai_commerce_sections.findFirst({
    where: { id: body.section_id, is_active: true },
    select: { id: true },
  });
  if (!section) {
    throw new Error("Section not found or inactive");
  }

  // Prevent duplicate (product_id, section_id)
  const bindingDup =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: { product_id: productId, section_id: body.section_id },
      select: { id: true },
    });
  if (bindingDup) {
    throw new Error("Binding for this product and section already exists");
  }

  // Prevent duplicate (section_id, display_order)
  const displayDup =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: { section_id: body.section_id, display_order: body.display_order },
      select: { id: true },
    });
  if (displayDup) {
    throw new Error("Display order already used in this section");
  }

  // Generate id for new binding
  const newId = v4();
  const created =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.create({
      data: {
        id: newId,
        product_id: productId,
        section_id: body.section_id,
        display_order: body.display_order,
      },
      select: {
        id: true,
        product_id: true,
        section_id: true,
        display_order: true,
      },
    });

  const result = {
    id: created.id,
    product_id: created.product_id,
    section_id: created.section_id,
    display_order: created.display_order,
  } satisfies IAiCommerceProductSectionBinding;
  return result;
}
