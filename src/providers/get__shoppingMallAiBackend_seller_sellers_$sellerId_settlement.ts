import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSellerSettlement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerSettlement";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve settlement and payout details for a given sellerId.
 *
 * Get the settlement configuration for a specific seller by their sellerId.
 * Returns current payout destination details (bank name, account number,
 * account holder) and related memo if present. Only accessible to the seller
 * owner and admin roles due to the financial sensitivity of the data. Used in
 * seller dashboards or admin financial modules to view, audit, or update seller
 * banking/payout settings. Strictly enforce role and privacy policies when
 * exposing this data. If no settlement info exists, an error is returned.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller payload (must match sellerId)
 * @param props.sellerId - The UUID of the seller whose settlement is requested
 * @returns Seller's settlement configuration and payout details
 * @throws {Error} When the authenticated seller does not match the sellerId
 * @throws {Error} When the seller's settlement configuration does not exist
 */
export async function get__shoppingMallAiBackend_seller_sellers_$sellerId_settlement(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendSellerSettlement> {
  const { seller, sellerId } = props;
  if (seller.id !== sellerId) {
    throw new Error(
      "Access denied: sellers can only view their own settlement info",
    );
  }
  const settlement =
    await MyGlobal.prisma.shopping_mall_ai_backend_seller_settlements.findUnique(
      {
        where: { seller_id: sellerId },
      },
    );
  if (!settlement) {
    throw new Error("Settlement configuration not found for this seller");
  }
  return {
    id: settlement.id,
    seller_id: settlement.seller_id,
    bank_name: settlement.bank_name,
    bank_account_number: settlement.bank_account_number,
    account_holder: settlement.account_holder,
    remittance_memo: settlement.remittance_memo ?? null,
    created_at: toISOStringSafe(settlement.created_at),
    updated_at: toISOStringSafe(settlement.updated_at),
  };
}
