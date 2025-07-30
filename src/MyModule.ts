import { Module } from "@nestjs/common";

import { Aimall_backendAdministratorChannelsController } from "./controllers/aimall-backend/administrator/channels/Aimall_backendAdministratorChannelsController";
import { Aimall_backendAdministratorChannelsSectionsController } from "./controllers/aimall-backend/administrator/channels/sections/Aimall_backendAdministratorChannelsSectionsController";
import { Aimall_backendAdministratorConfigurationsController } from "./controllers/aimall-backend/administrator/configurations/Aimall_backendAdministratorConfigurationsController";
import { Aimall_backendAdministratorCustomersController } from "./controllers/aimall-backend/administrator/customers/Aimall_backendAdministratorCustomersController";
import { Aimall_backendCustomersController } from "./controllers/aimall-backend/customers/Aimall_backendCustomersController";
import { Aimall_backendCustomerCustomersExternalaccountsController } from "./controllers/aimall-backend/customer/customers/externalAccounts/Aimall_backendCustomerCustomersExternalaccountsController";
import { Aimall_backendAdministratorCustomersExternalaccountsController } from "./controllers/aimall-backend/administrator/customers/externalAccounts/Aimall_backendAdministratorCustomersExternalaccountsController";
import { Aimall_backendCustomerCustomersBehaviortrackingsController } from "./controllers/aimall-backend/customer/customers/behaviorTrackings/Aimall_backendCustomerCustomersBehaviortrackingsController";
import { Aimall_backendAdministratorCustomersBehaviortrackingsController } from "./controllers/aimall-backend/administrator/customers/behaviorTrackings/Aimall_backendAdministratorCustomersBehaviortrackingsController";
import { Aimall_backendCustomerCustomersAddressesController } from "./controllers/aimall-backend/customer/customers/addresses/Aimall_backendCustomerCustomersAddressesController";
import { Aimall_backendAdministratorCustomersAddressesController } from "./controllers/aimall-backend/administrator/customers/addresses/Aimall_backendAdministratorCustomersAddressesController";
import { Aimall_backendAdministratorSellersController } from "./controllers/aimall-backend/administrator/sellers/Aimall_backendAdministratorSellersController";
import { Aimall_backendSellerSellersController } from "./controllers/aimall-backend/seller/sellers/Aimall_backendSellerSellersController";
import { Aimall_backendAdministratorAdministratorsController } from "./controllers/aimall-backend/administrator/administrators/Aimall_backendAdministratorAdministratorsController";
import { Aimall_backendAdministratorPermissionsController } from "./controllers/aimall-backend/administrator/permissions/Aimall_backendAdministratorPermissionsController";
import { Aimall_backendProductsController } from "./controllers/aimall-backend/products/Aimall_backendProductsController";
import { Aimall_backendSellerProductsController } from "./controllers/aimall-backend/seller/products/Aimall_backendSellerProductsController";
import { Aimall_backendAdministratorProductsController } from "./controllers/aimall-backend/administrator/products/Aimall_backendAdministratorProductsController";
import { Aimall_backendProductsProductoptionsController } from "./controllers/aimall-backend/products/productOptions/Aimall_backendProductsProductoptionsController";
import { Aimall_backendSellerProductsProductoptionsController } from "./controllers/aimall-backend/seller/products/productOptions/Aimall_backendSellerProductsProductoptionsController";
import { Aimall_backendAdministratorProductsProductoptionsController } from "./controllers/aimall-backend/administrator/products/productOptions/Aimall_backendAdministratorProductsProductoptionsController";
import { Aimall_backendSellerProductsProductbundlesController } from "./controllers/aimall-backend/seller/products/productBundles/Aimall_backendSellerProductsProductbundlesController";
import { Aimall_backendAdministratorProductsProductbundlesController } from "./controllers/aimall-backend/administrator/products/productBundles/Aimall_backendAdministratorProductsProductbundlesController";
import { Aimall_backendCustomerCategoriesController } from "./controllers/aimall-backend/customer/categories/Aimall_backendCustomerCategoriesController";
import { Aimall_backendSellerCategoriesController } from "./controllers/aimall-backend/seller/categories/Aimall_backendSellerCategoriesController";
import { Aimall_backendAdministratorCategoriesController } from "./controllers/aimall-backend/administrator/categories/Aimall_backendAdministratorCategoriesController";
import { Aimall_backendAdministratorCategoriesChildcategoriesController } from "./controllers/aimall-backend/administrator/categories/childCategories/Aimall_backendAdministratorCategoriesChildcategoriesController";
import { Aimall_backendSellerCategoriesChildcategoriesController } from "./controllers/aimall-backend/seller/categories/childCategories/Aimall_backendSellerCategoriesChildcategoriesController";
import { Aimall_backendAdministratorProductsSkusController } from "./controllers/aimall-backend/administrator/products/skus/Aimall_backendAdministratorProductsSkusController";
import { Aimall_backendSellerProductsSkusController } from "./controllers/aimall-backend/seller/products/skus/Aimall_backendSellerProductsSkusController";
import { Aimall_backendAdministratorSkusController } from "./controllers/aimall-backend/administrator/skus/Aimall_backendAdministratorSkusController";
import { Aimall_backendAdministratorSkusInventorysnapshotsController } from "./controllers/aimall-backend/administrator/skus/inventorySnapshots/Aimall_backendAdministratorSkusInventorysnapshotsController";
import { Aimall_backendSellerProductsChannelassignmentsController } from "./controllers/aimall-backend/seller/products/channelAssignments/Aimall_backendSellerProductsChannelassignmentsController";
import { Aimall_backendAdministratorProductsChannelassignmentsController } from "./controllers/aimall-backend/administrator/products/channelAssignments/Aimall_backendAdministratorProductsChannelassignmentsController";
import { Aimall_backendPostsController } from "./controllers/aimall-backend/posts/Aimall_backendPostsController";
import { Aimall_backendCustomerPostsController } from "./controllers/aimall-backend/customer/posts/Aimall_backendCustomerPostsController";
import { Aimall_backendSellerPostsController } from "./controllers/aimall-backend/seller/posts/Aimall_backendSellerPostsController";
import { Aimall_backendAdministratorPostsController } from "./controllers/aimall-backend/administrator/posts/Aimall_backendAdministratorPostsController";
import { Aimall_backendCustomerPostsCommentsController } from "./controllers/aimall-backend/customer/posts/comments/Aimall_backendCustomerPostsCommentsController";
import { Aimall_backendSellerPostsCommentsController } from "./controllers/aimall-backend/seller/posts/comments/Aimall_backendSellerPostsCommentsController";
import { Aimall_backendAdministratorPostsCommentsController } from "./controllers/aimall-backend/administrator/posts/comments/Aimall_backendAdministratorPostsCommentsController";
import { Aimall_backendCustomerPostsAttachmentsController } from "./controllers/aimall-backend/customer/posts/attachments/Aimall_backendCustomerPostsAttachmentsController";
import { Aimall_backendSellerPostsAttachmentsController } from "./controllers/aimall-backend/seller/posts/attachments/Aimall_backendSellerPostsAttachmentsController";
import { Aimall_backendAdministratorPostsAttachmentsController } from "./controllers/aimall-backend/administrator/posts/attachments/Aimall_backendAdministratorPostsAttachmentsController";
import { Aimall_backendAdministratorCommentsController } from "./controllers/aimall-backend/administrator/comments/Aimall_backendAdministratorCommentsController";
import { Aimall_backendCustomerCommentsController } from "./controllers/aimall-backend/customer/comments/Aimall_backendCustomerCommentsController";
import { Aimall_backendCustomerCommentsAttachmentsController } from "./controllers/aimall-backend/customer/comments/attachments/Aimall_backendCustomerCommentsAttachmentsController";
import { Aimall_backendAdministratorCommentsAttachmentsController } from "./controllers/aimall-backend/administrator/comments/attachments/Aimall_backendAdministratorCommentsAttachmentsController";
import { Aimall_backendCustomerCommentsCommentsController } from "./controllers/aimall-backend/customer/comments/comments/Aimall_backendCustomerCommentsCommentsController";
import { Aimall_backendAdministratorCommentsCommentsController } from "./controllers/aimall-backend/administrator/comments/comments/Aimall_backendAdministratorCommentsCommentsController";
import { Aimall_backendReviewsController } from "./controllers/aimall-backend/reviews/Aimall_backendReviewsController";
import { Aimall_backendCustomerReviewsController } from "./controllers/aimall-backend/customer/reviews/Aimall_backendCustomerReviewsController";
import { Aimall_backendAdministratorReviewsController } from "./controllers/aimall-backend/administrator/reviews/Aimall_backendAdministratorReviewsController";
import { Aimall_backendCustomerReviewsCommentsController } from "./controllers/aimall-backend/customer/reviews/comments/Aimall_backendCustomerReviewsCommentsController";
import { Aimall_backendSellerReviewsCommentsController } from "./controllers/aimall-backend/seller/reviews/comments/Aimall_backendSellerReviewsCommentsController";
import { Aimall_backendAdministratorReviewsCommentsController } from "./controllers/aimall-backend/administrator/reviews/comments/Aimall_backendAdministratorReviewsCommentsController";
import { Aimall_backendCustomerReviewsAttachmentsController } from "./controllers/aimall-backend/customer/reviews/attachments/Aimall_backendCustomerReviewsAttachmentsController";
import { Aimall_backendSellerReviewsAttachmentsController } from "./controllers/aimall-backend/seller/reviews/attachments/Aimall_backendSellerReviewsAttachmentsController";
import { Aimall_backendAdministratorReviewsAttachmentsController } from "./controllers/aimall-backend/administrator/reviews/attachments/Aimall_backendAdministratorReviewsAttachmentsController";
import { Aimall_backendAdministratorAttachmentsController } from "./controllers/aimall-backend/administrator/attachments/Aimall_backendAdministratorAttachmentsController";
import { Aimall_backendAdministratorSnapshotsController } from "./controllers/aimall-backend/administrator/snapshots/Aimall_backendAdministratorSnapshotsController";
import { Aimall_backendCustomerPostsSnapshotsController } from "./controllers/aimall-backend/customer/posts/snapshots/Aimall_backendCustomerPostsSnapshotsController";
import { Aimall_backendSellerPostsSnapshotsController } from "./controllers/aimall-backend/seller/posts/snapshots/Aimall_backendSellerPostsSnapshotsController";
import { Aimall_backendAdministratorPostsSnapshotsController } from "./controllers/aimall-backend/administrator/posts/snapshots/Aimall_backendAdministratorPostsSnapshotsController";
import { Aimall_backendCustomerReviewsSnapshotsController } from "./controllers/aimall-backend/customer/reviews/snapshots/Aimall_backendCustomerReviewsSnapshotsController";
import { Aimall_backendSellerReviewsSnapshotsController } from "./controllers/aimall-backend/seller/reviews/snapshots/Aimall_backendSellerReviewsSnapshotsController";
import { Aimall_backendAdministratorReviewsSnapshotsController } from "./controllers/aimall-backend/administrator/reviews/snapshots/Aimall_backendAdministratorReviewsSnapshotsController";
import { Aimall_backendAdministratorCartsController } from "./controllers/aimall-backend/administrator/carts/Aimall_backendAdministratorCartsController";
import { Aimall_backendCustomerCartsController } from "./controllers/aimall-backend/customer/carts/Aimall_backendCustomerCartsController";
import { Aimall_backendCustomerCartsCartitemsController } from "./controllers/aimall-backend/customer/carts/cartItems/Aimall_backendCustomerCartsCartitemsController";
import { Aimall_backendAdministratorCartsCartitemsController } from "./controllers/aimall-backend/administrator/carts/cartItems/Aimall_backendAdministratorCartsCartitemsController";
import { Aimall_backendAdministratorOrdersController } from "./controllers/aimall-backend/administrator/orders/Aimall_backendAdministratorOrdersController";
import { Aimall_backendSellerOrdersController } from "./controllers/aimall-backend/seller/orders/Aimall_backendSellerOrdersController";
import { Aimall_backendCustomerOrdersController } from "./controllers/aimall-backend/customer/orders/Aimall_backendCustomerOrdersController";
import { Aimall_backendAdministratorOrdersOrderitemsController } from "./controllers/aimall-backend/administrator/orders/orderItems/Aimall_backendAdministratorOrdersOrderitemsController";
import { Aimall_backendSellerOrdersOrderitemsController } from "./controllers/aimall-backend/seller/orders/orderItems/Aimall_backendSellerOrdersOrderitemsController";
import { Aimall_backendCustomerOrdersOrderitemsController } from "./controllers/aimall-backend/customer/orders/orderItems/Aimall_backendCustomerOrdersOrderitemsController";
import { Aimall_backendCustomerOrdersPaymentsController } from "./controllers/aimall-backend/customer/orders/payments/Aimall_backendCustomerOrdersPaymentsController";
import { Aimall_backendSellerOrdersPaymentsController } from "./controllers/aimall-backend/seller/orders/payments/Aimall_backendSellerOrdersPaymentsController";
import { Aimall_backendAdministratorOrdersPaymentsController } from "./controllers/aimall-backend/administrator/orders/payments/Aimall_backendAdministratorOrdersPaymentsController";
import { Aimall_backendCustomerOrdersShipmentsController } from "./controllers/aimall-backend/customer/orders/shipments/Aimall_backendCustomerOrdersShipmentsController";
import { Aimall_backendSellerOrdersShipmentsController } from "./controllers/aimall-backend/seller/orders/shipments/Aimall_backendSellerOrdersShipmentsController";
import { Aimall_backendAdministratorOrdersShipmentsController } from "./controllers/aimall-backend/administrator/orders/shipments/Aimall_backendAdministratorOrdersShipmentsController";
import { Aimall_backendCustomerOrdersOrdersnapshotsController } from "./controllers/aimall-backend/customer/orders/orderSnapshots/Aimall_backendCustomerOrdersOrdersnapshotsController";
import { Aimall_backendSellerOrdersOrdersnapshotsController } from "./controllers/aimall-backend/seller/orders/orderSnapshots/Aimall_backendSellerOrdersOrdersnapshotsController";
import { Aimall_backendAdministratorOrdersOrdersnapshotsController } from "./controllers/aimall-backend/administrator/orders/orderSnapshots/Aimall_backendAdministratorOrdersOrdersnapshotsController";
import { Aimall_backendCustomerCouponsController } from "./controllers/aimall-backend/customer/coupons/Aimall_backendCustomerCouponsController";
import { Aimall_backendAdministratorCouponsController } from "./controllers/aimall-backend/administrator/coupons/Aimall_backendAdministratorCouponsController";
import { Aimall_backendAdministratorDiscountcampaignsController } from "./controllers/aimall-backend/administrator/discountCampaigns/Aimall_backendAdministratorDiscountcampaignsController";
import { Aimall_backendAdministratorCouponredemptionsController } from "./controllers/aimall-backend/administrator/couponRedemptions/Aimall_backendAdministratorCouponredemptionsController";
import { Aimall_backendAdministratorDiscountcampaignsCouponsController } from "./controllers/aimall-backend/administrator/discountCampaigns/coupons/Aimall_backendAdministratorDiscountcampaignsCouponsController";
import { Aimall_backendAdministratorCouponsCouponredemptionsController } from "./controllers/aimall-backend/administrator/coupons/couponRedemptions/Aimall_backendAdministratorCouponsCouponredemptionsController";
import { Aimall_backendAdministratorLoyaltytransactionsController } from "./controllers/aimall-backend/administrator/loyaltyTransactions/Aimall_backendAdministratorLoyaltytransactionsController";
import { Aimall_backendAdministratorAbuseincidentsController } from "./controllers/aimall-backend/administrator/abuseIncidents/Aimall_backendAdministratorAbuseincidentsController";
import { Aimall_backendCustomerSupportticketsController } from "./controllers/aimall-backend/customer/supportTickets/Aimall_backendCustomerSupportticketsController";
import { Aimall_backendSellerSupportticketsController } from "./controllers/aimall-backend/seller/supportTickets/Aimall_backendSellerSupportticketsController";
import { Aimall_backendAdministratorSupportticketsController } from "./controllers/aimall-backend/administrator/supportTickets/Aimall_backendAdministratorSupportticketsController";
import { Aimall_backendFaqsController } from "./controllers/aimall-backend/faqs/Aimall_backendFaqsController";
import { Aimall_backendAdministratorFaqsController } from "./controllers/aimall-backend/administrator/faqs/Aimall_backendAdministratorFaqsController";
import { Aimall_backendAdministratorAnalyticsdashboardsController } from "./controllers/aimall-backend/administrator/analyticsDashboards/Aimall_backendAdministratorAnalyticsdashboardsController";
import { Aimall_backendAdministratorAuditlogsController } from "./controllers/aimall-backend/administrator/auditLogs/Aimall_backendAdministratorAuditlogsController";

@Module({
  controllers: [
    Aimall_backendAdministratorChannelsController,
    Aimall_backendAdministratorChannelsSectionsController,
    Aimall_backendAdministratorConfigurationsController,
    Aimall_backendAdministratorCustomersController,
    Aimall_backendCustomersController,
    Aimall_backendCustomerCustomersExternalaccountsController,
    Aimall_backendAdministratorCustomersExternalaccountsController,
    Aimall_backendCustomerCustomersBehaviortrackingsController,
    Aimall_backendAdministratorCustomersBehaviortrackingsController,
    Aimall_backendCustomerCustomersAddressesController,
    Aimall_backendAdministratorCustomersAddressesController,
    Aimall_backendAdministratorSellersController,
    Aimall_backendSellerSellersController,
    Aimall_backendAdministratorAdministratorsController,
    Aimall_backendAdministratorPermissionsController,
    Aimall_backendProductsController,
    Aimall_backendSellerProductsController,
    Aimall_backendAdministratorProductsController,
    Aimall_backendProductsProductoptionsController,
    Aimall_backendSellerProductsProductoptionsController,
    Aimall_backendAdministratorProductsProductoptionsController,
    Aimall_backendSellerProductsProductbundlesController,
    Aimall_backendAdministratorProductsProductbundlesController,
    Aimall_backendCustomerCategoriesController,
    Aimall_backendSellerCategoriesController,
    Aimall_backendAdministratorCategoriesController,
    Aimall_backendAdministratorCategoriesChildcategoriesController,
    Aimall_backendSellerCategoriesChildcategoriesController,
    Aimall_backendAdministratorProductsSkusController,
    Aimall_backendSellerProductsSkusController,
    Aimall_backendAdministratorSkusController,
    Aimall_backendAdministratorSkusInventorysnapshotsController,
    Aimall_backendSellerProductsChannelassignmentsController,
    Aimall_backendAdministratorProductsChannelassignmentsController,
    Aimall_backendPostsController,
    Aimall_backendCustomerPostsController,
    Aimall_backendSellerPostsController,
    Aimall_backendAdministratorPostsController,
    Aimall_backendCustomerPostsCommentsController,
    Aimall_backendSellerPostsCommentsController,
    Aimall_backendAdministratorPostsCommentsController,
    Aimall_backendCustomerPostsAttachmentsController,
    Aimall_backendSellerPostsAttachmentsController,
    Aimall_backendAdministratorPostsAttachmentsController,
    Aimall_backendAdministratorCommentsController,
    Aimall_backendCustomerCommentsController,
    Aimall_backendCustomerCommentsAttachmentsController,
    Aimall_backendAdministratorCommentsAttachmentsController,
    Aimall_backendCustomerCommentsCommentsController,
    Aimall_backendAdministratorCommentsCommentsController,
    Aimall_backendReviewsController,
    Aimall_backendCustomerReviewsController,
    Aimall_backendAdministratorReviewsController,
    Aimall_backendCustomerReviewsCommentsController,
    Aimall_backendSellerReviewsCommentsController,
    Aimall_backendAdministratorReviewsCommentsController,
    Aimall_backendCustomerReviewsAttachmentsController,
    Aimall_backendSellerReviewsAttachmentsController,
    Aimall_backendAdministratorReviewsAttachmentsController,
    Aimall_backendAdministratorAttachmentsController,
    Aimall_backendAdministratorSnapshotsController,
    Aimall_backendCustomerPostsSnapshotsController,
    Aimall_backendSellerPostsSnapshotsController,
    Aimall_backendAdministratorPostsSnapshotsController,
    Aimall_backendCustomerReviewsSnapshotsController,
    Aimall_backendSellerReviewsSnapshotsController,
    Aimall_backendAdministratorReviewsSnapshotsController,
    Aimall_backendAdministratorCartsController,
    Aimall_backendCustomerCartsController,
    Aimall_backendCustomerCartsCartitemsController,
    Aimall_backendAdministratorCartsCartitemsController,
    Aimall_backendAdministratorOrdersController,
    Aimall_backendSellerOrdersController,
    Aimall_backendCustomerOrdersController,
    Aimall_backendAdministratorOrdersOrderitemsController,
    Aimall_backendSellerOrdersOrderitemsController,
    Aimall_backendCustomerOrdersOrderitemsController,
    Aimall_backendCustomerOrdersPaymentsController,
    Aimall_backendSellerOrdersPaymentsController,
    Aimall_backendAdministratorOrdersPaymentsController,
    Aimall_backendCustomerOrdersShipmentsController,
    Aimall_backendSellerOrdersShipmentsController,
    Aimall_backendAdministratorOrdersShipmentsController,
    Aimall_backendCustomerOrdersOrdersnapshotsController,
    Aimall_backendSellerOrdersOrdersnapshotsController,
    Aimall_backendAdministratorOrdersOrdersnapshotsController,
    Aimall_backendCustomerCouponsController,
    Aimall_backendAdministratorCouponsController,
    Aimall_backendAdministratorDiscountcampaignsController,
    Aimall_backendAdministratorCouponredemptionsController,
    Aimall_backendAdministratorDiscountcampaignsCouponsController,
    Aimall_backendAdministratorCouponsCouponredemptionsController,
    Aimall_backendAdministratorLoyaltytransactionsController,
    Aimall_backendAdministratorAbuseincidentsController,
    Aimall_backendCustomerSupportticketsController,
    Aimall_backendSellerSupportticketsController,
    Aimall_backendAdministratorSupportticketsController,
    Aimall_backendFaqsController,
    Aimall_backendAdministratorFaqsController,
    Aimall_backendAdministratorAnalyticsdashboardsController,
    Aimall_backendAdministratorAuditlogsController,
  ],
})
export class MyModule {}
