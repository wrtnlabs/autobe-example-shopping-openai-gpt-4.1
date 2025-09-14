import { IPage } from "./IPage";
import { IAiCommerceBusinessRuleTemplate } from "./IAiCommerceBusinessRuleTemplate";

export namespace IPageIAiCommerceBusinessRuleTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAiCommerceBusinessRuleTemplate.ISummary[];
  };
}
