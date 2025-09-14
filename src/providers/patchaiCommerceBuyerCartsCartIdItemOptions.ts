import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItemOption";
import { IPageIAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartItemOption";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and list cart item options (ai_commerce_cart_item_options) for a
 * specific cart.
 *
 * Retrieves a paginated and/or filtered list of all option selections
 * (ai_commerce_cart_item_options) for items in a given buyer's cart. Only item
 * options for carts owned by the authenticated buyer and not soft-deleted are
 * visible. Optionally supports search by option_name and result pagination.
 * Enforces strict type and ownership constraints, and only exposes allowed
 * fields.
 *
 * @param props - The request parameters and payload
 * @param props.buyer - The authenticated buyer (as BuyerPayload)
 * @param props.cartId - The UUID of the cart whose item options to list
 * @param props.body - Search, filter, and pagination criteria
 * @returns Paginated list of cart item option selections
 */
export async function patchaiCommerceBuyerCartsCartIdItemOptions(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItemOption.IRequest;
}): Promise<IPageIAiCommerceCartItemOption> {
  const { buyer, cartId, body } = props;

  // Step 1: Validate cart ownership and status
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!cart) {
    // Cart does not exist, is deleted, or not owned by this buyer
    return {
      pagination: {
        current: (body.page ?? 1) as number,
        limit: (body.limit ?? 20) as number,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 2: Get all cart items in this cart
  const cartItems = await MyGlobal.prisma.ai_commerce_cart_items.findMany({
    where: { cart_id: cartId },
    select: { id: true },
  });
  const cartItemIds = cartItems.map((item) => item.id);
  if (cartItemIds.length === 0) {
    return {
      pagination: {
        current: (body.page ?? 1) as number,
        limit: (body.limit ?? 20) as number,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 3: Pagination and filters
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const filterOptionName =
    body.optionName !== undefined &&
    body.optionName !== null &&
    body.optionName.length > 0
      ? { option_name: { contains: body.optionName } }
      : {};
  const whereCondition = {
    cart_item_id: { in: cartItemIds },
    ...filterOptionName,
  };

  // Step 4: Query DB and count total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_item_options.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        cart_item_id: true,
        option_name: true,
        option_value: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_cart_item_options.count({
      where: whereCondition,
    }),
  ]);

  // Step 5: Map to API structure with date formatting & branding
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      cart_item_id: row.cart_item_id,
      option_name: row.option_name,
      option_value: row.option_value,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
