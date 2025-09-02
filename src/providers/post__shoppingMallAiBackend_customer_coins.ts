import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Create a new digital coin ledger for a customer.
 *
 * This endpoint creates a new digital coin wallet (ledger) for an authenticated
 * customer in the shopping_mall_ai_backend_coins table. It ensures customers
 * can only create their own ledger, prevents duplicate creation, and
 * initializes all balances and audit fields. All date and ID values are
 * generated in compliance with API spec, and all business rules are strictly
 * enforced.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.body - The coin ledger creation request, including owner ID and
 *   initial balances
 * @returns The newly created coin ledger entity, including audit fields and
 *   zero/initial balances as supplied
 * @throws {Error} If attempting to create a coin ledger for another customer,
 *   or if a wallet already exists for this customer
 */
export async function post__shoppingMallAiBackend_customer_coins(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendCoin.ICreate;
}): Promise<IShoppingMallAiBackendCoin> {
  const { customer, body } = props;
  // Ownership and auth: customer may only create their own wallet
  if (
    !body.shopping_mall_ai_backend_customer_id ||
    customer.id !== body.shopping_mall_ai_backend_customer_id
  ) {
    throw new Error("Customers may only create a coin ledger for themselves");
  }
  // Guard: prevent duplicate wallet (must check for soft-deleted records)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_coins.findFirst({
      where: {
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("A coin wallet already exists for this customer");
  }
  // Invariant: a customer may only own their own wallet, is authenticated
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const record = await MyGlobal.prisma.shopping_mall_ai_backend_coins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_customer_id: customer.id,
      shopping_mall_ai_backend_seller_id: null,
      total_accrued: body.total_accrued,
      usable_coin: body.usable_coin,
      expired_coin: body.expired_coin,
      on_hold_coin: body.on_hold_coin,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Strict output mapping; always emit all audit fields
  return {
    id: record.id,
    shopping_mall_ai_backend_customer_id:
      record.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_seller_id:
      record.shopping_mall_ai_backend_seller_id,
    total_accrued: record.total_accrued,
    usable_coin: record.usable_coin,
    expired_coin: record.expired_coin,
    on_hold_coin: record.on_hold_coin,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
