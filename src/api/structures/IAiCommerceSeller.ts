import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IAiCommerceSeller {
  /**
   * Seller join/registration payload, as POSTed to seller onboarding/join
   * endpoint. Collects business-critical registration fields. Corresponds to
   * ai_commerce_seller onboarding logic. Excludes role/actor IDs and
   * system-generated keys.
   */
  export type IJoin = {
    /**
     * Unique email address for seller to register. Must be unused in
     * ai_commerce_buyer and ai_commerce_seller. All new sellers provisioned
     * via join must supply email for login and business communications.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for seller registration; must be hashed for
     * storage. Business logic must validate complexity and reject
     * weakened/short passwords at onboarding. Never supply hash here.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Payload for seller login authentication. Used for logging in as seller
   * only.
   */
  export type ILogin = {
    /**
     * Email address for seller login. Must match email in ai_commerce_buyer
     * and be linked as a seller account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for login. Will be checked against stored
     * password_hash; must not be empty.
     */
    password: string;
  };

  /**
   * Seller authorization response: contains unique seller id and issued JWT
   * token with claims for seller role.
   */
  export type IAuthorized = {
    /** Seller's unique ID (UUID, ai_commerce_seller.id). */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
