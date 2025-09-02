import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerSettlement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerSettlement";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update the settlement configuration and payout instructions for a specific
 * seller.
 *
 * Allows the authenticated seller to update their own bank name, bank account
 * number, account holder, and optional remittance memo for payouts. Ensures
 * business ownership and fully audits all changes, with updated_at always
 * refreshed. Returns the updated settlement record, ensuring all fields
 * (especially dates) are correctly formatted.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller making the request (authorization
 *   required)
 * @param props.sellerId - Unique identifier of the seller whose settlement is
 *   being updated
 * @param props.body - Settlement update input: partial or full update allowed
 *   for allowed fields
 * @returns The updated seller settlement configuration object
 * @throws {Error} When authentication fails, seller does not match, or no
 *   settlement exists
 */
export async function put__shoppingMallAiBackend_seller_sellers_$sellerId_settlement(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSellerSettlement.IUpdate;
}): Promise<IShoppingMallAiBackendSellerSettlement> {
  const { seller, sellerId, body } = props;

  // Authorization check: only owner can update their settlement
  if (seller.id !== sellerId) {
    throw new Error(
      "Forbidden: Sellers can only update their own settlement details.",
    );
  }

  // Ensure a settlement exists for this seller
  const settlement =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_settlements.findUnique(
      {
        where: { seller_id: sellerId },
      },
    );
  if (settlement == null) {
    throw new Error("No settlement configuration found for seller.");
  }

  // Always update updated_at; don't include fields that aren't present in the update body.
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_settlements.update({
      where: { seller_id: sellerId },
      data: {
        bank_name: body.bank_name ?? undefined,
        bank_account_number: body.bank_account_number ?? undefined,
        account_holder: body.account_holder ?? undefined,
        remittance_memo:
          body.remittance_memo === undefined ? undefined : body.remittance_memo,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    seller_id: updated.seller_id,
    bank_name: updated.bank_name,
    bank_account_number: updated.bank_account_number,
    account_holder: updated.account_holder,
    remittance_memo: updated.remittance_memo,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
