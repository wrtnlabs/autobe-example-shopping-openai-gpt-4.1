import { Module } from "@nestjs/common";

import { AuthBuyerController } from "./controllers/auth/buyer/AuthBuyerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AicommerceAdminChannelsController } from "./controllers/aiCommerce/admin/channels/AicommerceAdminChannelsController";
import { AicommerceAdminChannelsSettingsController } from "./controllers/aiCommerce/admin/channels/settings/AicommerceAdminChannelsSettingsController";
import { AicommerceAdminChannelsSectionsController } from "./controllers/aiCommerce/admin/channels/sections/AicommerceAdminChannelsSectionsController";
import { AicommerceAdminChannelsCategoriesController } from "./controllers/aiCommerce/admin/channels/categories/AicommerceAdminChannelsCategoriesController";
import { AicommerceChannelsCategoriesController } from "./controllers/aiCommerce/channels/categories/AicommerceChannelsCategoriesController";
import { AicommerceAdminSectiontemplatesController } from "./controllers/aiCommerce/admin/sectionTemplates/AicommerceAdminSectiontemplatesController";
import { AicommerceAdminCategorytemplatesController } from "./controllers/aiCommerce/admin/categoryTemplates/AicommerceAdminCategorytemplatesController";
import { AicommerceAdminBusinessruletemplatesController } from "./controllers/aiCommerce/admin/businessRuleTemplates/AicommerceAdminBusinessruletemplatesController";
import { AicommerceAdminAuditlogssystemController } from "./controllers/aiCommerce/admin/auditLogsSystem/AicommerceAdminAuditlogssystemController";
import { AicommerceAdminAnalyticschannelsController } from "./controllers/aiCommerce/admin/analyticsChannels/AicommerceAdminAnalyticschannelsController";
import { AicommerceAdminAttachmentsController } from "./controllers/aiCommerce/admin/attachments/AicommerceAdminAttachmentsController";
import { AicommerceBuyerAttachmentsController } from "./controllers/aiCommerce/buyer/attachments/AicommerceBuyerAttachmentsController";
import { AicommerceAdminSelleronboardingsController } from "./controllers/aiCommerce/admin/sellerOnboardings/AicommerceAdminSelleronboardingsController";
import { AicommerceBuyerSelleronboardingsController } from "./controllers/aiCommerce/buyer/sellerOnboardings/AicommerceBuyerSelleronboardingsController";
import { AicommerceAdminSellerkycController } from "./controllers/aiCommerce/admin/sellerKyc/AicommerceAdminSellerkycController";
import { AicommerceSellerSellerkycController } from "./controllers/aiCommerce/seller/sellerKyc/AicommerceSellerSellerkycController";
import { AicommerceAdminSellerprofilesController } from "./controllers/aiCommerce/admin/sellerProfiles/AicommerceAdminSellerprofilesController";
import { AicommerceSellerSellerprofilesController } from "./controllers/aiCommerce/seller/sellerProfiles/AicommerceSellerSellerprofilesController";
import { AicommerceSellerStoresController } from "./controllers/aiCommerce/seller/stores/AicommerceSellerStoresController";
import { AicommerceAdminStoresController } from "./controllers/aiCommerce/admin/stores/AicommerceAdminStoresController";
import { AicommerceAdminStoreanalyticsController } from "./controllers/aiCommerce/admin/storeAnalytics/AicommerceAdminStoreanalyticsController";
import { AicommerceAdminStorebankingController } from "./controllers/aiCommerce/admin/storeBanking/AicommerceAdminStorebankingController";
import { AicommerceAdminStoresettingsController } from "./controllers/aiCommerce/admin/storeSettings/AicommerceAdminStoresettingsController";
import { AicommerceSellerStorebankingController } from "./controllers/aiCommerce/seller/storeBanking/AicommerceSellerStorebankingController";
import { AicommerceAdminSellerstatushistoryController } from "./controllers/aiCommerce/admin/sellerStatusHistory/AicommerceAdminSellerstatushistoryController";
import { AicommerceSellerSellerstatushistoryController } from "./controllers/aiCommerce/seller/sellerStatusHistory/AicommerceSellerSellerstatushistoryController";
import { AicommerceAdminSellerappealsController } from "./controllers/aiCommerce/admin/sellerAppeals/AicommerceAdminSellerappealsController";
import { AicommerceSellerSellerappealsController } from "./controllers/aiCommerce/seller/sellerAppeals/AicommerceSellerSellerappealsController";
import { AicommerceAdminSellerdisputesController } from "./controllers/aiCommerce/admin/sellerDisputes/AicommerceAdminSellerdisputesController";
import { AicommerceAdminProductsController } from "./controllers/aiCommerce/admin/products/AicommerceAdminProductsController";
import { AicommerceSellerProductsController } from "./controllers/aiCommerce/seller/products/AicommerceSellerProductsController";
import { AicommerceAdminProductsVariantsController } from "./controllers/aiCommerce/admin/products/variants/AicommerceAdminProductsVariantsController";
import { AicommerceSellerProductsVariantsController } from "./controllers/aiCommerce/seller/products/variants/AicommerceSellerProductsVariantsController";
import { AicommerceSellerProductsBundlesController } from "./controllers/aiCommerce/seller/products/bundles/AicommerceSellerProductsBundlesController";
import { AicommerceSellerProductsImagesController } from "./controllers/aiCommerce/seller/products/images/AicommerceSellerProductsImagesController";
import { AicommerceAdminProductsImagesController } from "./controllers/aiCommerce/admin/products/images/AicommerceAdminProductsImagesController";
import { AicommerceSellerProductsContentsController } from "./controllers/aiCommerce/seller/products/contents/AicommerceSellerProductsContentsController";
import { AicommerceAdminProductsContentsController } from "./controllers/aiCommerce/admin/products/contents/AicommerceAdminProductsContentsController";
import { AicommerceProductsSeoController } from "./controllers/aiCommerce/products/seo/AicommerceProductsSeoController";
import { AicommerceSellerProductsSeoController } from "./controllers/aiCommerce/seller/products/seo/AicommerceSellerProductsSeoController";
import { AicommerceAdminProductsSeoController } from "./controllers/aiCommerce/admin/products/seo/AicommerceAdminProductsSeoController";
import { AicommerceProductsLegalcomplianceController } from "./controllers/aiCommerce/products/legalCompliance/AicommerceProductsLegalcomplianceController";
import { AicommerceSellerProductsLegalcomplianceController } from "./controllers/aiCommerce/seller/products/legalCompliance/AicommerceSellerProductsLegalcomplianceController";
import { AicommerceAdminProductsLegalcomplianceController } from "./controllers/aiCommerce/admin/products/legalCompliance/AicommerceAdminProductsLegalcomplianceController";
import { AicommerceSellerProductsCategorybindingsController } from "./controllers/aiCommerce/seller/products/categoryBindings/AicommerceSellerProductsCategorybindingsController";
import { AicommerceAdminProductsCategorybindingsController } from "./controllers/aiCommerce/admin/products/categoryBindings/AicommerceAdminProductsCategorybindingsController";
import { AicommerceSellerProductsSectionbindingsController } from "./controllers/aiCommerce/seller/products/sectionBindings/AicommerceSellerProductsSectionbindingsController";
import { AicommerceAdminProductsSectionbindingsController } from "./controllers/aiCommerce/admin/products/sectionBindings/AicommerceAdminProductsSectionbindingsController";
import { AicommerceSellerProductsSnapshotsController } from "./controllers/aiCommerce/seller/products/snapshots/AicommerceSellerProductsSnapshotsController";
import { AicommerceAdminProductsSnapshotsController } from "./controllers/aiCommerce/admin/products/snapshots/AicommerceAdminProductsSnapshotsController";
import { AicommerceSellerProductsAuditlogsController } from "./controllers/aiCommerce/seller/products/auditLogs/AicommerceSellerProductsAuditlogsController";
import { AicommerceAdminProductsAuditlogsController } from "./controllers/aiCommerce/admin/products/auditLogs/AicommerceAdminProductsAuditlogsController";
import { AicommerceAdminTagsController } from "./controllers/aiCommerce/admin/tags/AicommerceAdminTagsController";
import { AicommerceAdminTagsModerationController } from "./controllers/aiCommerce/admin/tags/moderation/AicommerceAdminTagsModerationController";
import { AicommerceAdminProducttagsController } from "./controllers/aiCommerce/admin/productTags/AicommerceAdminProducttagsController";
import { AicommerceSellerProducttagsController } from "./controllers/aiCommerce/seller/productTags/AicommerceSellerProducttagsController";
import { AicommerceTrendingproductsController } from "./controllers/aiCommerce/trendingProducts/AicommerceTrendingproductsController";
import { AicommerceAdminTrendingproductsController } from "./controllers/aiCommerce/admin/trendingProducts/AicommerceAdminTrendingproductsController";
import { AicommerceHighlightedproductsController } from "./controllers/aiCommerce/highlightedProducts/AicommerceHighlightedproductsController";
import { AicommerceAdminHighlightedproductsController } from "./controllers/aiCommerce/admin/highlightedProducts/AicommerceAdminHighlightedproductsController";
import { AicommerceSellerHighlightedproductsController } from "./controllers/aiCommerce/seller/highlightedProducts/AicommerceSellerHighlightedproductsController";
import { AicommerceAdminSearchhistoriesController } from "./controllers/aiCommerce/admin/searchHistories/AicommerceAdminSearchhistoriesController";
import { AicommerceAdminRecommendationsnapshotsController } from "./controllers/aiCommerce/admin/recommendationSnapshots/AicommerceAdminRecommendationsnapshotsController";
import { AicommerceAdminSearchanalyticsController } from "./controllers/aiCommerce/admin/searchAnalytics/AicommerceAdminSearchanalyticsController";
import { AicommerceBuyerCartsController } from "./controllers/aiCommerce/buyer/carts/AicommerceBuyerCartsController";
import { AicommerceBuyerCartsItemsController } from "./controllers/aiCommerce/buyer/carts/items/AicommerceBuyerCartsItemsController";
import { AicommerceBuyerCartsItemoptionsController } from "./controllers/aiCommerce/buyer/carts/itemOptions/AicommerceBuyerCartsItemoptionsController";
import { AicommerceBuyerCartsessionsController } from "./controllers/aiCommerce/buyer/cartSessions/AicommerceBuyerCartsessionsController";
import { AicommerceAdminCartsessionsController } from "./controllers/aiCommerce/admin/cartSessions/AicommerceAdminCartsessionsController";
import { AicommerceAdminCarttemplatesController } from "./controllers/aiCommerce/admin/cartTemplates/AicommerceAdminCarttemplatesController";
import { AicommerceSellerCarttemplatesController } from "./controllers/aiCommerce/seller/cartTemplates/AicommerceSellerCarttemplatesController";
import { AicommerceAdminCartmergesController } from "./controllers/aiCommerce/admin/cartMerges/AicommerceAdminCartmergesController";
import { AicommerceAdminCartexpirationsController } from "./controllers/aiCommerce/admin/cartExpirations/AicommerceAdminCartexpirationsController";
import { AicommerceAdminOrdersController } from "./controllers/aiCommerce/admin/orders/AicommerceAdminOrdersController";
import { AicommerceBuyerOrdersController } from "./controllers/aiCommerce/buyer/orders/AicommerceBuyerOrdersController";
import { AicommerceBuyerOrdersItemsController } from "./controllers/aiCommerce/buyer/orders/items/AicommerceBuyerOrdersItemsController";
import { AicommerceAdminOrdersItemsController } from "./controllers/aiCommerce/admin/orders/items/AicommerceAdminOrdersItemsController";
import { AicommerceSellerOrdersItemsController } from "./controllers/aiCommerce/seller/orders/items/AicommerceSellerOrdersItemsController";
import { AicommerceBuyerOrdersSubordersController } from "./controllers/aiCommerce/buyer/orders/subOrders/AicommerceBuyerOrdersSubordersController";
import { AicommerceAdminOrdersSubordersController } from "./controllers/aiCommerce/admin/orders/subOrders/AicommerceAdminOrdersSubordersController";
import { AicommerceSellerOrdersSubordersController } from "./controllers/aiCommerce/seller/orders/subOrders/AicommerceSellerOrdersSubordersController";
import { AicommerceBuyerOrdersStatushistoryController } from "./controllers/aiCommerce/buyer/orders/statusHistory/AicommerceBuyerOrdersStatushistoryController";
import { AicommerceSellerOrdersStatushistoryController } from "./controllers/aiCommerce/seller/orders/statusHistory/AicommerceSellerOrdersStatushistoryController";
import { AicommerceAdminOrdersStatushistoryController } from "./controllers/aiCommerce/admin/orders/statusHistory/AicommerceAdminOrdersStatushistoryController";
import { AicommerceBuyerOrdersPayController } from "./controllers/aiCommerce/buyer/orders/pay/AicommerceBuyerOrdersPayController";
import { AicommerceBuyerOrdersFulfillmentsController } from "./controllers/aiCommerce/buyer/orders/fulfillments/AicommerceBuyerOrdersFulfillmentsController";
import { AicommerceSellerOrdersFulfillmentsController } from "./controllers/aiCommerce/seller/orders/fulfillments/AicommerceSellerOrdersFulfillmentsController";
import { AicommerceAdminOrdersFulfillmentsController } from "./controllers/aiCommerce/admin/orders/fulfillments/AicommerceAdminOrdersFulfillmentsController";
import { AicommerceBuyerOrdersAftersalesController } from "./controllers/aiCommerce/buyer/orders/afterSales/AicommerceBuyerOrdersAftersalesController";
import { AicommerceSellerOrdersAftersalesController } from "./controllers/aiCommerce/seller/orders/afterSales/AicommerceSellerOrdersAftersalesController";
import { AicommerceAdminOrdersAftersalesController } from "./controllers/aiCommerce/admin/orders/afterSales/AicommerceAdminOrdersAftersalesController";
import { AicommerceBuyerOrdersCancellationsController } from "./controllers/aiCommerce/buyer/orders/cancellations/AicommerceBuyerOrdersCancellationsController";
import { AicommerceSellerOrdersCancellationsController } from "./controllers/aiCommerce/seller/orders/cancellations/AicommerceSellerOrdersCancellationsController";
import { AicommerceAdminOrdersCancellationsController } from "./controllers/aiCommerce/admin/orders/cancellations/AicommerceAdminOrdersCancellationsController";
import { AicommerceBuyerOrdersRefundsController } from "./controllers/aiCommerce/buyer/orders/refunds/AicommerceBuyerOrdersRefundsController";
import { AicommerceSellerOrdersRefundsController } from "./controllers/aiCommerce/seller/orders/refunds/AicommerceSellerOrdersRefundsController";
import { AicommerceAdminOrdersRefundsController } from "./controllers/aiCommerce/admin/orders/refunds/AicommerceAdminOrdersRefundsController";
import { AicommerceBuyerOrdersAnalyticsController } from "./controllers/aiCommerce/buyer/orders/analytics/AicommerceBuyerOrdersAnalyticsController";
import { AicommerceSellerOrdersAnalyticsController } from "./controllers/aiCommerce/seller/orders/analytics/AicommerceSellerOrdersAnalyticsController";
import { AicommerceAdminOrdersAnalyticsController } from "./controllers/aiCommerce/admin/orders/analytics/AicommerceAdminOrdersAnalyticsController";
import { AicommerceBuyerOrdersSnapshotsController } from "./controllers/aiCommerce/buyer/orders/snapshots/AicommerceBuyerOrdersSnapshotsController";
import { AicommerceSellerOrdersSnapshotsController } from "./controllers/aiCommerce/seller/orders/snapshots/AicommerceSellerOrdersSnapshotsController";
import { AicommerceAdminOrdersSnapshotsController } from "./controllers/aiCommerce/admin/orders/snapshots/AicommerceAdminOrdersSnapshotsController";
import { AicommerceAdminOrdersAuditlogsController } from "./controllers/aiCommerce/admin/orders/auditLogs/AicommerceAdminOrdersAuditlogsController";
import { AicommerceAdminPaymentsController } from "./controllers/aiCommerce/admin/payments/AicommerceAdminPaymentsController";
import { AicommerceAdminPaymentmethodsController } from "./controllers/aiCommerce/admin/paymentMethods/AicommerceAdminPaymentmethodsController";
import { AicommerceAdminPaymentgatewaysController } from "./controllers/aiCommerce/admin/paymentGateways/AicommerceAdminPaymentgatewaysController";
import { AicommerceAdminPaymenttransactionsController } from "./controllers/aiCommerce/admin/paymentTransactions/AicommerceAdminPaymenttransactionsController";
import { AicommerceAdminDepositaccountsController } from "./controllers/aiCommerce/admin/depositAccounts/AicommerceAdminDepositaccountsController";
import { AicommerceBuyerDeposittransactionsController } from "./controllers/aiCommerce/buyer/depositTransactions/AicommerceBuyerDeposittransactionsController";
import { AicommerceAdminDeposittransactionsController } from "./controllers/aiCommerce/admin/depositTransactions/AicommerceAdminDeposittransactionsController";
import { AicommerceBuyerMileageaccountsController } from "./controllers/aiCommerce/buyer/mileageAccounts/AicommerceBuyerMileageaccountsController";
import { AicommerceAdminMileageaccountsController } from "./controllers/aiCommerce/admin/mileageAccounts/AicommerceAdminMileageaccountsController";
import { AicommerceSellerMileageaccountsController } from "./controllers/aiCommerce/seller/mileageAccounts/AicommerceSellerMileageaccountsController";
import { AicommerceBuyerMileagetransactionsController } from "./controllers/aiCommerce/buyer/mileageTransactions/AicommerceBuyerMileagetransactionsController";
import { AicommerceSellerMileagetransactionsController } from "./controllers/aiCommerce/seller/mileageTransactions/AicommerceSellerMileagetransactionsController";
import { AicommerceAdminMileagetransactionsController } from "./controllers/aiCommerce/admin/mileageTransactions/AicommerceAdminMileagetransactionsController";
import { AicommerceAdminCouponsController } from "./controllers/aiCommerce/admin/coupons/AicommerceAdminCouponsController";
import { AicommerceAdminCouponissuesController } from "./controllers/aiCommerce/admin/couponIssues/AicommerceAdminCouponissuesController";
import { AicommerceSellerCouponissuesController } from "./controllers/aiCommerce/seller/couponIssues/AicommerceSellerCouponissuesController";
import { AicommerceAdminCouponusesController } from "./controllers/aiCommerce/admin/couponUses/AicommerceAdminCouponusesController";
import { AicommerceSellerCouponusesController } from "./controllers/aiCommerce/seller/couponUses/AicommerceSellerCouponusesController";
import { AicommerceAdminCouponauditsController } from "./controllers/aiCommerce/admin/couponAudits/AicommerceAdminCouponauditsController";
import { AicommerceAdminPaymentfraudeventsController } from "./controllers/aiCommerce/admin/paymentFraudEvents/AicommerceAdminPaymentfraudeventsController";
import { AicommerceAdminPaymentanalyticsController } from "./controllers/aiCommerce/admin/paymentAnalytics/AicommerceAdminPaymentanalyticsController";
import { AicommerceAdminBulletinsController } from "./controllers/aiCommerce/admin/bulletins/AicommerceAdminBulletinsController";
import { AicommerceBulletinsController } from "./controllers/aiCommerce/bulletins/AicommerceBulletinsController";
import { AicommerceBulletinsCommentsController } from "./controllers/aiCommerce/bulletins/comments/AicommerceBulletinsCommentsController";
import { AicommerceBuyerBulletinsCommentsController } from "./controllers/aiCommerce/buyer/bulletins/comments/AicommerceBuyerBulletinsCommentsController";
import { AicommerceInquiriesController } from "./controllers/aiCommerce/inquiries/AicommerceInquiriesController";
import { AicommerceBuyerInquiriesController } from "./controllers/aiCommerce/buyer/inquiries/AicommerceBuyerInquiriesController";
import { AicommerceBuyerInquiriesCommentsController } from "./controllers/aiCommerce/buyer/inquiries/comments/AicommerceBuyerInquiriesCommentsController";
import { AicommerceSellerInquiriesCommentsController } from "./controllers/aiCommerce/seller/inquiries/comments/AicommerceSellerInquiriesCommentsController";
import { AicommerceAdminInquiriesCommentsController } from "./controllers/aiCommerce/admin/inquiries/comments/AicommerceAdminInquiriesCommentsController";
import { AicommerceBuyerReviewsController } from "./controllers/aiCommerce/buyer/reviews/AicommerceBuyerReviewsController";
import { AicommerceSellerReviewsController } from "./controllers/aiCommerce/seller/reviews/AicommerceSellerReviewsController";
import { AicommerceAdminReviewsController } from "./controllers/aiCommerce/admin/reviews/AicommerceAdminReviewsController";
import { AicommerceBuyerReviewsCommentsController } from "./controllers/aiCommerce/buyer/reviews/comments/AicommerceBuyerReviewsCommentsController";
import { AicommerceSellerReviewsCommentsController } from "./controllers/aiCommerce/seller/reviews/comments/AicommerceSellerReviewsCommentsController";
import { AicommerceAdminReviewsCommentsController } from "./controllers/aiCommerce/admin/reviews/comments/AicommerceAdminReviewsCommentsController";
import { AicommerceBuyerFavoritesProductsController } from "./controllers/aiCommerce/buyer/favorites/products/AicommerceBuyerFavoritesProductsController";
import { AicommerceSellerFavoritesProductsController } from "./controllers/aiCommerce/seller/favorites/products/AicommerceSellerFavoritesProductsController";
import { AicommerceAdminFavoritesProductsController } from "./controllers/aiCommerce/admin/favorites/products/AicommerceAdminFavoritesProductsController";
import { AicommerceBuyerFavoritesInquiriesController } from "./controllers/aiCommerce/buyer/favorites/inquiries/AicommerceBuyerFavoritesInquiriesController";
import { AicommerceSellerFavoritesInquiriesController } from "./controllers/aiCommerce/seller/favorites/inquiries/AicommerceSellerFavoritesInquiriesController";
import { AicommerceBuyerFavoritesAddressesController } from "./controllers/aiCommerce/buyer/favorites/addresses/AicommerceBuyerFavoritesAddressesController";
import { AicommerceSellerFavoritesAddressesController } from "./controllers/aiCommerce/seller/favorites/addresses/AicommerceSellerFavoritesAddressesController";
import { AicommerceBuyerFavoritesFoldersController } from "./controllers/aiCommerce/buyer/favorites/folders/AicommerceBuyerFavoritesFoldersController";
import { AicommerceSellerFavoritesFoldersController } from "./controllers/aiCommerce/seller/favorites/folders/AicommerceSellerFavoritesFoldersController";
import { AicommerceBuyerFavoritesProductsAlertsController } from "./controllers/aiCommerce/buyer/favorites/products/alerts/AicommerceBuyerFavoritesProductsAlertsController";
import { AicommerceBuyerFavoritesProductsNotificationsController } from "./controllers/aiCommerce/buyer/favorites/products/notifications/AicommerceBuyerFavoritesProductsNotificationsController";

@Module({
  controllers: [
    AuthBuyerController,
    AuthSellerController,
    AuthAdminController,
    AuthVisitorController,
    AicommerceAdminChannelsController,
    AicommerceAdminChannelsSettingsController,
    AicommerceAdminChannelsSectionsController,
    AicommerceAdminChannelsCategoriesController,
    AicommerceChannelsCategoriesController,
    AicommerceAdminSectiontemplatesController,
    AicommerceAdminCategorytemplatesController,
    AicommerceAdminBusinessruletemplatesController,
    AicommerceAdminAuditlogssystemController,
    AicommerceAdminAnalyticschannelsController,
    AicommerceAdminAttachmentsController,
    AicommerceBuyerAttachmentsController,
    AicommerceAdminSelleronboardingsController,
    AicommerceBuyerSelleronboardingsController,
    AicommerceAdminSellerkycController,
    AicommerceSellerSellerkycController,
    AicommerceAdminSellerprofilesController,
    AicommerceSellerSellerprofilesController,
    AicommerceSellerStoresController,
    AicommerceAdminStoresController,
    AicommerceAdminStoreanalyticsController,
    AicommerceAdminStorebankingController,
    AicommerceAdminStoresettingsController,
    AicommerceSellerStorebankingController,
    AicommerceAdminSellerstatushistoryController,
    AicommerceSellerSellerstatushistoryController,
    AicommerceAdminSellerappealsController,
    AicommerceSellerSellerappealsController,
    AicommerceAdminSellerdisputesController,
    AicommerceAdminProductsController,
    AicommerceSellerProductsController,
    AicommerceAdminProductsVariantsController,
    AicommerceSellerProductsVariantsController,
    AicommerceSellerProductsBundlesController,
    AicommerceSellerProductsImagesController,
    AicommerceAdminProductsImagesController,
    AicommerceSellerProductsContentsController,
    AicommerceAdminProductsContentsController,
    AicommerceProductsSeoController,
    AicommerceSellerProductsSeoController,
    AicommerceAdminProductsSeoController,
    AicommerceProductsLegalcomplianceController,
    AicommerceSellerProductsLegalcomplianceController,
    AicommerceAdminProductsLegalcomplianceController,
    AicommerceSellerProductsCategorybindingsController,
    AicommerceAdminProductsCategorybindingsController,
    AicommerceSellerProductsSectionbindingsController,
    AicommerceAdminProductsSectionbindingsController,
    AicommerceSellerProductsSnapshotsController,
    AicommerceAdminProductsSnapshotsController,
    AicommerceSellerProductsAuditlogsController,
    AicommerceAdminProductsAuditlogsController,
    AicommerceAdminTagsController,
    AicommerceAdminTagsModerationController,
    AicommerceAdminProducttagsController,
    AicommerceSellerProducttagsController,
    AicommerceTrendingproductsController,
    AicommerceAdminTrendingproductsController,
    AicommerceHighlightedproductsController,
    AicommerceAdminHighlightedproductsController,
    AicommerceSellerHighlightedproductsController,
    AicommerceAdminSearchhistoriesController,
    AicommerceAdminRecommendationsnapshotsController,
    AicommerceAdminSearchanalyticsController,
    AicommerceBuyerCartsController,
    AicommerceBuyerCartsItemsController,
    AicommerceBuyerCartsItemoptionsController,
    AicommerceBuyerCartsessionsController,
    AicommerceAdminCartsessionsController,
    AicommerceAdminCarttemplatesController,
    AicommerceSellerCarttemplatesController,
    AicommerceAdminCartmergesController,
    AicommerceAdminCartexpirationsController,
    AicommerceAdminOrdersController,
    AicommerceBuyerOrdersController,
    AicommerceBuyerOrdersItemsController,
    AicommerceAdminOrdersItemsController,
    AicommerceSellerOrdersItemsController,
    AicommerceBuyerOrdersSubordersController,
    AicommerceAdminOrdersSubordersController,
    AicommerceSellerOrdersSubordersController,
    AicommerceBuyerOrdersStatushistoryController,
    AicommerceSellerOrdersStatushistoryController,
    AicommerceAdminOrdersStatushistoryController,
    AicommerceBuyerOrdersPayController,
    AicommerceBuyerOrdersFulfillmentsController,
    AicommerceSellerOrdersFulfillmentsController,
    AicommerceAdminOrdersFulfillmentsController,
    AicommerceBuyerOrdersAftersalesController,
    AicommerceSellerOrdersAftersalesController,
    AicommerceAdminOrdersAftersalesController,
    AicommerceBuyerOrdersCancellationsController,
    AicommerceSellerOrdersCancellationsController,
    AicommerceAdminOrdersCancellationsController,
    AicommerceBuyerOrdersRefundsController,
    AicommerceSellerOrdersRefundsController,
    AicommerceAdminOrdersRefundsController,
    AicommerceBuyerOrdersAnalyticsController,
    AicommerceSellerOrdersAnalyticsController,
    AicommerceAdminOrdersAnalyticsController,
    AicommerceBuyerOrdersSnapshotsController,
    AicommerceSellerOrdersSnapshotsController,
    AicommerceAdminOrdersSnapshotsController,
    AicommerceAdminOrdersAuditlogsController,
    AicommerceAdminPaymentsController,
    AicommerceAdminPaymentmethodsController,
    AicommerceAdminPaymentgatewaysController,
    AicommerceAdminPaymenttransactionsController,
    AicommerceAdminDepositaccountsController,
    AicommerceBuyerDeposittransactionsController,
    AicommerceAdminDeposittransactionsController,
    AicommerceBuyerMileageaccountsController,
    AicommerceAdminMileageaccountsController,
    AicommerceSellerMileageaccountsController,
    AicommerceBuyerMileagetransactionsController,
    AicommerceSellerMileagetransactionsController,
    AicommerceAdminMileagetransactionsController,
    AicommerceAdminCouponsController,
    AicommerceAdminCouponissuesController,
    AicommerceSellerCouponissuesController,
    AicommerceAdminCouponusesController,
    AicommerceSellerCouponusesController,
    AicommerceAdminCouponauditsController,
    AicommerceAdminPaymentfraudeventsController,
    AicommerceAdminPaymentanalyticsController,
    AicommerceAdminBulletinsController,
    AicommerceBulletinsController,
    AicommerceBulletinsCommentsController,
    AicommerceBuyerBulletinsCommentsController,
    AicommerceInquiriesController,
    AicommerceBuyerInquiriesController,
    AicommerceBuyerInquiriesCommentsController,
    AicommerceSellerInquiriesCommentsController,
    AicommerceAdminInquiriesCommentsController,
    AicommerceBuyerReviewsController,
    AicommerceSellerReviewsController,
    AicommerceAdminReviewsController,
    AicommerceBuyerReviewsCommentsController,
    AicommerceSellerReviewsCommentsController,
    AicommerceAdminReviewsCommentsController,
    AicommerceBuyerFavoritesProductsController,
    AicommerceSellerFavoritesProductsController,
    AicommerceAdminFavoritesProductsController,
    AicommerceBuyerFavoritesInquiriesController,
    AicommerceSellerFavoritesInquiriesController,
    AicommerceBuyerFavoritesAddressesController,
    AicommerceSellerFavoritesAddressesController,
    AicommerceBuyerFavoritesFoldersController,
    AicommerceSellerFavoritesFoldersController,
    AicommerceBuyerFavoritesProductsAlertsController,
    AicommerceBuyerFavoritesProductsNotificationsController,
  ],
})
export class MyModule {}
