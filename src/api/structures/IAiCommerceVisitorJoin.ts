import { tags } from "typia";

export namespace IAiCommerceVisitorJoin {
  /**
   * Request body to register a guest (visitor) as a new member, including
   * consent and optional device/session context.
   */
  export type ICreate = {
    /** Email address for visitor to register as a new member. */
    email: string & tags.Format<"email">;

    /**
     * The plain-text password to register. Must meet platform password
     * policy.
     */
    password: string;

    /**
     * Boolean flag for agreement/consent to terms of service and privacy
     * policies. Required in most regulatory contexts.
     */
    consent: boolean;

    /**
     * Optional. Device or tracking ID for the visitor for
     * onboarding/session merging.
     */
    trackingId?: string | null | undefined;
  };
}
