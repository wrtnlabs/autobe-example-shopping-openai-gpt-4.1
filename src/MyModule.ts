import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallAdminChannelsController } from "./controllers/shoppingMall/admin/channels/ShoppingmallAdminChannelsController";
import { ShoppingmallAdminChannelsSectionsController } from "./controllers/shoppingMall/admin/channels/sections/ShoppingmallAdminChannelsSectionsController";
import { ShoppingmallAdminChannelsCategoriesController } from "./controllers/shoppingMall/admin/channels/categories/ShoppingmallAdminChannelsCategoriesController";
import { ShoppingmallAdminConfigurationsController } from "./controllers/shoppingMall/admin/configurations/ShoppingmallAdminConfigurationsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminCustomersIdentitiesController } from "./controllers/shoppingMall/admin/customers/identities/ShoppingmallAdminCustomersIdentitiesController";
import { ShoppingmallCustomerCustomersExternalaccountsController } from "./controllers/shoppingMall/customer/customers/externalAccounts/ShoppingmallCustomerCustomersExternalaccountsController";
import { ShoppingmallAdminAdminsRoleescalationsController } from "./controllers/shoppingMall/admin/admins/roleEscalations/ShoppingmallAdminAdminsRoleescalationsController";
import { ShoppingmallAdminUserconnectionsController } from "./controllers/shoppingMall/admin/userConnections/ShoppingmallAdminUserconnectionsController";
import { ShoppingmallAdminUseragreementsController } from "./controllers/shoppingMall/admin/userAgreements/ShoppingmallAdminUseragreementsController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallSellerProductsOptionsController } from "./controllers/shoppingMall/seller/products/options/ShoppingmallSellerProductsOptionsController";
import { ShoppingmallAdminProductsOptionsController } from "./controllers/shoppingMall/admin/products/options/ShoppingmallAdminProductsOptionsController";
import { ShoppingmallSellerProductsVariantsController } from "./controllers/shoppingMall/seller/products/variants/ShoppingmallSellerProductsVariantsController";
import { ShoppingmallAdminProductsVariantsController } from "./controllers/shoppingMall/admin/products/variants/ShoppingmallAdminProductsVariantsController";
import { ShoppingmallSellerProductsBundlesController } from "./controllers/shoppingMall/seller/products/bundles/ShoppingmallSellerProductsBundlesController";
import { ShoppingmallAdminProductsBundlesController } from "./controllers/shoppingMall/admin/products/bundles/ShoppingmallAdminProductsBundlesController";
import { ShoppingmallProductsBundlesController } from "./controllers/shoppingMall/products/bundles/ShoppingmallProductsBundlesController";
import { ShoppingmallSellerProductsTagsController } from "./controllers/shoppingMall/seller/products/tags/ShoppingmallSellerProductsTagsController";
import { ShoppingmallAdminProductsTagsController } from "./controllers/shoppingMall/admin/products/tags/ShoppingmallAdminProductsTagsController";
import { ShoppingmallSellerProductsSeoController } from "./controllers/shoppingMall/seller/products/seo/ShoppingmallSellerProductsSeoController";
import { ShoppingmallAdminProductsSeoController } from "./controllers/shoppingMall/admin/products/seo/ShoppingmallAdminProductsSeoController";
import { ShoppingmallSellerProductsContentController } from "./controllers/shoppingMall/seller/products/content/ShoppingmallSellerProductsContentController";
import { ShoppingmallAdminProductsContentController } from "./controllers/shoppingMall/admin/products/content/ShoppingmallAdminProductsContentController";
import { ShoppingmallSellerProductsAttachmentsController } from "./controllers/shoppingMall/seller/products/attachments/ShoppingmallSellerProductsAttachmentsController";
import { ShoppingmallAdminProductsAttachmentsController } from "./controllers/shoppingMall/admin/products/attachments/ShoppingmallAdminProductsAttachmentsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallAdminCartsController } from "./controllers/shoppingMall/admin/carts/ShoppingmallAdminCartsController";
import { ShoppingmallCustomerCartsItemsController } from "./controllers/shoppingMall/customer/carts/items/ShoppingmallCustomerCartsItemsController";
import { ShoppingmallAdminCartsItemsController } from "./controllers/shoppingMall/admin/carts/items/ShoppingmallAdminCartsItemsController";
import { ShoppingmallCustomerCartsSnapshotsController } from "./controllers/shoppingMall/customer/carts/snapshots/ShoppingmallCustomerCartsSnapshotsController";
import { ShoppingmallAdminCartsSnapshotsController } from "./controllers/shoppingMall/admin/carts/snapshots/ShoppingmallAdminCartsSnapshotsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallCustomerOrdersSnapshotsController } from "./controllers/shoppingMall/customer/orders/snapshots/ShoppingmallCustomerOrdersSnapshotsController";
import { ShoppingmallSellerOrdersSnapshotsController } from "./controllers/shoppingMall/seller/orders/snapshots/ShoppingmallSellerOrdersSnapshotsController";
import { ShoppingmallAdminOrdersSnapshotsController } from "./controllers/shoppingMall/admin/orders/snapshots/ShoppingmallAdminOrdersSnapshotsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsSnapshotsController } from "./controllers/shoppingMall/admin/orders/payments/snapshots/ShoppingmallAdminOrdersPaymentsSnapshotsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsItemsController } from "./controllers/shoppingMall/seller/orders/shipments/items/ShoppingmallSellerOrdersShipmentsItemsController";
import { ShoppingmallAdminOrdersShipmentsItemsController } from "./controllers/shoppingMall/admin/orders/shipments/items/ShoppingmallAdminOrdersShipmentsItemsController";
import { ShoppingmallCustomerOrdersDeliveriesController } from "./controllers/shoppingMall/customer/orders/deliveries/ShoppingmallCustomerOrdersDeliveriesController";
import { ShoppingmallSellerOrdersDeliveriesController } from "./controllers/shoppingMall/seller/orders/deliveries/ShoppingmallSellerOrdersDeliveriesController";
import { ShoppingmallAdminOrdersDeliveriesController } from "./controllers/shoppingMall/admin/orders/deliveries/ShoppingmallAdminOrdersDeliveriesController";
import { ShoppingmallCustomerOrdersAftersaleservicesController } from "./controllers/shoppingMall/customer/orders/afterSaleServices/ShoppingmallCustomerOrdersAftersaleservicesController";
import { ShoppingmallSellerOrdersAftersaleservicesController } from "./controllers/shoppingMall/seller/orders/afterSaleServices/ShoppingmallSellerOrdersAftersaleservicesController";
import { ShoppingmallAdminOrdersAftersaleservicesController } from "./controllers/shoppingMall/admin/orders/afterSaleServices/ShoppingmallAdminOrdersAftersaleservicesController";
import { ShoppingmallAdminCouponsController } from "./controllers/shoppingMall/admin/coupons/ShoppingmallAdminCouponsController";
import { ShoppingmallSellerCouponsController } from "./controllers/shoppingMall/seller/coupons/ShoppingmallSellerCouponsController";
import { ShoppingmallAdminCouponsIssuancesController } from "./controllers/shoppingMall/admin/coupons/issuances/ShoppingmallAdminCouponsIssuancesController";
import { ShoppingmallAdminCouponcampaignsController } from "./controllers/shoppingMall/admin/couponCampaigns/ShoppingmallAdminCouponcampaignsController";
import { ShoppingmallAdminDepositsController } from "./controllers/shoppingMall/admin/deposits/ShoppingmallAdminDepositsController";
import { ShoppingmallCustomerDepositsController } from "./controllers/shoppingMall/customer/deposits/ShoppingmallCustomerDepositsController";
import { ShoppingmallCustomerDepositsTransactionsController } from "./controllers/shoppingMall/customer/deposits/transactions/ShoppingmallCustomerDepositsTransactionsController";
import { ShoppingmallAdminDepositsTransactionsController } from "./controllers/shoppingMall/admin/deposits/transactions/ShoppingmallAdminDepositsTransactionsController";
import { ShoppingmallAdminMileagesController } from "./controllers/shoppingMall/admin/mileages/ShoppingmallAdminMileagesController";
import { ShoppingmallCustomerMileagesController } from "./controllers/shoppingMall/customer/mileages/ShoppingmallCustomerMileagesController";
import { ShoppingmallCustomerMileagesTransactionsController } from "./controllers/shoppingMall/customer/mileages/transactions/ShoppingmallCustomerMileagesTransactionsController";
import { ShoppingmallAdminMileagesTransactionsController } from "./controllers/shoppingMall/admin/mileages/transactions/ShoppingmallAdminMileagesTransactionsController";
import { ShoppingmallCustomerDonationsController } from "./controllers/shoppingMall/customer/donations/ShoppingmallCustomerDonationsController";
import { ShoppingmallAdminDonationsController } from "./controllers/shoppingMall/admin/donations/ShoppingmallAdminDonationsController";
import { ShoppingmallBoardsController } from "./controllers/shoppingMall/boards/ShoppingmallBoardsController";
import { ShoppingmallAdminBoardsController } from "./controllers/shoppingMall/admin/boards/ShoppingmallAdminBoardsController";
import { ShoppingmallBoardsPostsController } from "./controllers/shoppingMall/boards/posts/ShoppingmallBoardsPostsController";
import { ShoppingmallCustomerBoardsPostsController } from "./controllers/shoppingMall/customer/boards/posts/ShoppingmallCustomerBoardsPostsController";
import { ShoppingmallSellerBoardsPostsController } from "./controllers/shoppingMall/seller/boards/posts/ShoppingmallSellerBoardsPostsController";
import { ShoppingmallAdminBoardsPostsController } from "./controllers/shoppingMall/admin/boards/posts/ShoppingmallAdminBoardsPostsController";
import { ShoppingmallBoardsPostsCommentsController } from "./controllers/shoppingMall/boards/posts/comments/ShoppingmallBoardsPostsCommentsController";
import { ShoppingmallCustomerBoardsPostsCommentsController } from "./controllers/shoppingMall/customer/boards/posts/comments/ShoppingmallCustomerBoardsPostsCommentsController";
import { ShoppingmallProductsInquiriesController } from "./controllers/shoppingMall/products/inquiries/ShoppingmallProductsInquiriesController";
import { ShoppingmallCustomerProductsInquiriesController } from "./controllers/shoppingMall/customer/products/inquiries/ShoppingmallCustomerProductsInquiriesController";
import { ShoppingmallSellerProductsInquiriesController } from "./controllers/shoppingMall/seller/products/inquiries/ShoppingmallSellerProductsInquiriesController";
import { ShoppingmallAdminProductsInquiriesController } from "./controllers/shoppingMall/admin/products/inquiries/ShoppingmallAdminProductsInquiriesController";
import { ShoppingmallProductsInquiriesAnswersController } from "./controllers/shoppingMall/products/inquiries/answers/ShoppingmallProductsInquiriesAnswersController";
import { ShoppingmallSellerProductsInquiriesAnswersController } from "./controllers/shoppingMall/seller/products/inquiries/answers/ShoppingmallSellerProductsInquiriesAnswersController";
import { ShoppingmallAdminProductsInquiriesAnswersController } from "./controllers/shoppingMall/admin/products/inquiries/answers/ShoppingmallAdminProductsInquiriesAnswersController";
import { ShoppingmallCustomerReviewsController } from "./controllers/shoppingMall/customer/reviews/ShoppingmallCustomerReviewsController";
import { ShoppingmallSellerReviewsController } from "./controllers/shoppingMall/seller/reviews/ShoppingmallSellerReviewsController";
import { ShoppingmallAdminReviewsController } from "./controllers/shoppingMall/admin/reviews/ShoppingmallAdminReviewsController";
import { ShoppingmallCustomerFavoriteproductsController } from "./controllers/shoppingMall/customer/favoriteProducts/ShoppingmallCustomerFavoriteproductsController";
import { ShoppingmallAdminFavoriteproductsController } from "./controllers/shoppingMall/admin/favoriteProducts/ShoppingmallAdminFavoriteproductsController";
import { ShoppingmallCustomerFavoriteaddressesController } from "./controllers/shoppingMall/customer/favoriteAddresses/ShoppingmallCustomerFavoriteaddressesController";
import { ShoppingmallCustomerFavoriteinquiriesController } from "./controllers/shoppingMall/customer/favoriteInquiries/ShoppingmallCustomerFavoriteinquiriesController";
import { ShoppingmallAdminFavoriteinquiriesController } from "./controllers/shoppingMall/admin/favoriteInquiries/ShoppingmallAdminFavoriteinquiriesController";
import { ShoppingmallAdminAttachmentsController } from "./controllers/shoppingMall/admin/attachments/ShoppingmallAdminAttachmentsController";
import { ShoppingmallCustomerAttachmentsController } from "./controllers/shoppingMall/customer/attachments/ShoppingmallCustomerAttachmentsController";
import { ShoppingmallSellerAttachmentsController } from "./controllers/shoppingMall/seller/attachments/ShoppingmallSellerAttachmentsController";
import { ShoppingmallAdminAttachmentsVersionsController } from "./controllers/shoppingMall/admin/attachments/versions/ShoppingmallAdminAttachmentsVersionsController";
import { ShoppingmallSellerAttachmentsVersionsController } from "./controllers/shoppingMall/seller/attachments/versions/ShoppingmallSellerAttachmentsVersionsController";
import { ShoppingmallCustomerAttachmentsVersionsController } from "./controllers/shoppingMall/customer/attachments/versions/ShoppingmallCustomerAttachmentsVersionsController";
import { ShoppingmallAdminEntityattachmentlinksController } from "./controllers/shoppingMall/admin/entityAttachmentLinks/ShoppingmallAdminEntityattachmentlinksController";
import { ShoppingmallEntityattachmentlinksController } from "./controllers/shoppingMall/entityAttachmentLinks/ShoppingmallEntityattachmentlinksController";
import { ShoppingmallAdminEntitysnapshotsController } from "./controllers/shoppingMall/admin/entitySnapshots/ShoppingmallAdminEntitysnapshotsController";
import { ShoppingmallAdminAuditlogsController } from "./controllers/shoppingMall/admin/auditLogs/ShoppingmallAdminAuditlogsController";
import { ShoppingmallAdminDeletioneventsController } from "./controllers/shoppingMall/admin/deletionEvents/ShoppingmallAdminDeletioneventsController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallAdminChannelsController,
    ShoppingmallAdminChannelsSectionsController,
    ShoppingmallAdminChannelsCategoriesController,
    ShoppingmallAdminConfigurationsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallAdminSellersController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminCustomersIdentitiesController,
    ShoppingmallCustomerCustomersExternalaccountsController,
    ShoppingmallAdminAdminsRoleescalationsController,
    ShoppingmallAdminUserconnectionsController,
    ShoppingmallAdminUseragreementsController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallSellerProductsOptionsController,
    ShoppingmallAdminProductsOptionsController,
    ShoppingmallSellerProductsVariantsController,
    ShoppingmallAdminProductsVariantsController,
    ShoppingmallSellerProductsBundlesController,
    ShoppingmallAdminProductsBundlesController,
    ShoppingmallProductsBundlesController,
    ShoppingmallSellerProductsTagsController,
    ShoppingmallAdminProductsTagsController,
    ShoppingmallSellerProductsSeoController,
    ShoppingmallAdminProductsSeoController,
    ShoppingmallSellerProductsContentController,
    ShoppingmallAdminProductsContentController,
    ShoppingmallSellerProductsAttachmentsController,
    ShoppingmallAdminProductsAttachmentsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallAdminCartsController,
    ShoppingmallCustomerCartsItemsController,
    ShoppingmallAdminCartsItemsController,
    ShoppingmallCustomerCartsSnapshotsController,
    ShoppingmallAdminCartsSnapshotsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallCustomerOrdersSnapshotsController,
    ShoppingmallSellerOrdersSnapshotsController,
    ShoppingmallAdminOrdersSnapshotsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsSnapshotsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsItemsController,
    ShoppingmallAdminOrdersShipmentsItemsController,
    ShoppingmallCustomerOrdersDeliveriesController,
    ShoppingmallSellerOrdersDeliveriesController,
    ShoppingmallAdminOrdersDeliveriesController,
    ShoppingmallCustomerOrdersAftersaleservicesController,
    ShoppingmallSellerOrdersAftersaleservicesController,
    ShoppingmallAdminOrdersAftersaleservicesController,
    ShoppingmallAdminCouponsController,
    ShoppingmallSellerCouponsController,
    ShoppingmallAdminCouponsIssuancesController,
    ShoppingmallAdminCouponcampaignsController,
    ShoppingmallAdminDepositsController,
    ShoppingmallCustomerDepositsController,
    ShoppingmallCustomerDepositsTransactionsController,
    ShoppingmallAdminDepositsTransactionsController,
    ShoppingmallAdminMileagesController,
    ShoppingmallCustomerMileagesController,
    ShoppingmallCustomerMileagesTransactionsController,
    ShoppingmallAdminMileagesTransactionsController,
    ShoppingmallCustomerDonationsController,
    ShoppingmallAdminDonationsController,
    ShoppingmallBoardsController,
    ShoppingmallAdminBoardsController,
    ShoppingmallBoardsPostsController,
    ShoppingmallCustomerBoardsPostsController,
    ShoppingmallSellerBoardsPostsController,
    ShoppingmallAdminBoardsPostsController,
    ShoppingmallBoardsPostsCommentsController,
    ShoppingmallCustomerBoardsPostsCommentsController,
    ShoppingmallProductsInquiriesController,
    ShoppingmallCustomerProductsInquiriesController,
    ShoppingmallSellerProductsInquiriesController,
    ShoppingmallAdminProductsInquiriesController,
    ShoppingmallProductsInquiriesAnswersController,
    ShoppingmallSellerProductsInquiriesAnswersController,
    ShoppingmallAdminProductsInquiriesAnswersController,
    ShoppingmallCustomerReviewsController,
    ShoppingmallSellerReviewsController,
    ShoppingmallAdminReviewsController,
    ShoppingmallCustomerFavoriteproductsController,
    ShoppingmallAdminFavoriteproductsController,
    ShoppingmallCustomerFavoriteaddressesController,
    ShoppingmallCustomerFavoriteinquiriesController,
    ShoppingmallAdminFavoriteinquiriesController,
    ShoppingmallAdminAttachmentsController,
    ShoppingmallCustomerAttachmentsController,
    ShoppingmallSellerAttachmentsController,
    ShoppingmallAdminAttachmentsVersionsController,
    ShoppingmallSellerAttachmentsVersionsController,
    ShoppingmallCustomerAttachmentsVersionsController,
    ShoppingmallAdminEntityattachmentlinksController,
    ShoppingmallEntityattachmentlinksController,
    ShoppingmallAdminEntitysnapshotsController,
    ShoppingmallAdminAuditlogsController,
    ShoppingmallAdminDeletioneventsController,
  ],
})
export class MyModule {}
