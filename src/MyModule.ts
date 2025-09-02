import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallaibackendAdminChannelsController } from "./controllers/shoppingMallAiBackend/admin/channels/ShoppingmallaibackendAdminChannelsController";
import { ShoppingmallaibackendAdminChannelsSectionsController } from "./controllers/shoppingMallAiBackend/admin/channels/sections/ShoppingmallaibackendAdminChannelsSectionsController";
import { ShoppingmallaibackendAdminChannelsCategoriesController } from "./controllers/shoppingMallAiBackend/admin/channels/categories/ShoppingmallaibackendAdminChannelsCategoriesController";
import { ShoppingmallaibackendAdminSectionsCategorymappingsController } from "./controllers/shoppingMallAiBackend/admin/sections/categoryMappings/ShoppingmallaibackendAdminSectionsCategorymappingsController";
import { ShoppingmallaibackendAdminSystemconfigsController } from "./controllers/shoppingMallAiBackend/admin/systemConfigs/ShoppingmallaibackendAdminSystemconfigsController";
import { ShoppingmallaibackendAdminSystemaudittrailsController } from "./controllers/shoppingMallAiBackend/admin/systemAuditTrails/ShoppingmallaibackendAdminSystemaudittrailsController";
import { ShoppingmallaibackendAdminFilesController } from "./controllers/shoppingMallAiBackend/admin/files/ShoppingmallaibackendAdminFilesController";
import { ShoppingmallaibackendAdminCodebooksController } from "./controllers/shoppingMallAiBackend/admin/codebooks/ShoppingmallaibackendAdminCodebooksController";
import { ShoppingmallaibackendAdminCodebooksEntriesController } from "./controllers/shoppingMallAiBackend/admin/codebooks/entries/ShoppingmallaibackendAdminCodebooksEntriesController";
import { ShoppingmallaibackendAdminCustomersController } from "./controllers/shoppingMallAiBackend/admin/customers/ShoppingmallaibackendAdminCustomersController";
import { ShoppingmallaibackendAdminCustomersSessionsController } from "./controllers/shoppingMallAiBackend/admin/customers/sessions/ShoppingmallaibackendAdminCustomersSessionsController";
import { ShoppingmallaibackendCustomerCustomersSessionsController } from "./controllers/shoppingMallAiBackend/customer/customers/sessions/ShoppingmallaibackendCustomerCustomersSessionsController";
import { ShoppingmallaibackendCustomerCustomersExternalidentitiesController } from "./controllers/shoppingMallAiBackend/customer/customers/externalIdentities/ShoppingmallaibackendCustomerCustomersExternalidentitiesController";
import { ShoppingmallaibackendAdminCustomersExternalidentitiesController } from "./controllers/shoppingMallAiBackend/admin/customers/externalIdentities/ShoppingmallaibackendAdminCustomersExternalidentitiesController";
import { ShoppingmallaibackendCustomerCustomersWithdrawalsController } from "./controllers/shoppingMallAiBackend/customer/customers/withdrawals/ShoppingmallaibackendCustomerCustomersWithdrawalsController";
import { ShoppingmallaibackendAdminCustomersWithdrawalsController } from "./controllers/shoppingMallAiBackend/admin/customers/withdrawals/ShoppingmallaibackendAdminCustomersWithdrawalsController";
import { ShoppingmallaibackendAdminSellersController } from "./controllers/shoppingMallAiBackend/admin/sellers/ShoppingmallaibackendAdminSellersController";
import { ShoppingmallaibackendAdminSellersVerificationsController } from "./controllers/shoppingMallAiBackend/admin/sellers/verifications/ShoppingmallaibackendAdminSellersVerificationsController";
import { ShoppingmallaibackendSellerSellersProfileController } from "./controllers/shoppingMallAiBackend/seller/sellers/profile/ShoppingmallaibackendSellerSellersProfileController";
import { ShoppingmallaibackendSellerSellersSettlementController } from "./controllers/shoppingMallAiBackend/seller/sellers/settlement/ShoppingmallaibackendSellerSellersSettlementController";
import { ShoppingmallaibackendAdminAdminsController } from "./controllers/shoppingMallAiBackend/admin/admins/ShoppingmallaibackendAdminAdminsController";
import { ShoppingmallaibackendProductsController } from "./controllers/shoppingMallAiBackend/products/ShoppingmallaibackendProductsController";
import { ShoppingmallaibackendSellerProductsController } from "./controllers/shoppingMallAiBackend/seller/products/ShoppingmallaibackendSellerProductsController";
import { ShoppingmallaibackendAdminProductsController } from "./controllers/shoppingMallAiBackend/admin/products/ShoppingmallaibackendAdminProductsController";
import { ShoppingmallaibackendAdminAdminsAuditlogsController } from "./controllers/shoppingMallAiBackend/admin/admins/auditLogs/ShoppingmallaibackendAdminAdminsAuditlogsController";
import { ShoppingmallaibackendAdminRoleescalationsController } from "./controllers/shoppingMallAiBackend/admin/roleEscalations/ShoppingmallaibackendAdminRoleescalationsController";
import { ShoppingmallaibackendSellerProductsOptionsController } from "./controllers/shoppingMallAiBackend/seller/products/options/ShoppingmallaibackendSellerProductsOptionsController";
import { ShoppingmallaibackendSellerProductsOptionsUnitsController } from "./controllers/shoppingMallAiBackend/seller/products/options/units/ShoppingmallaibackendSellerProductsOptionsUnitsController";
import { ShoppingmallaibackendAdminProductsOptionsUnitsController } from "./controllers/shoppingMallAiBackend/admin/products/options/units/ShoppingmallaibackendAdminProductsOptionsUnitsController";
import { ShoppingmallaibackendSellerProductsBundlesController } from "./controllers/shoppingMallAiBackend/seller/products/bundles/ShoppingmallaibackendSellerProductsBundlesController";
import { ShoppingmallaibackendAdminProductsBundlesController } from "./controllers/shoppingMallAiBackend/admin/products/bundles/ShoppingmallaibackendAdminProductsBundlesController";
import { ShoppingmallaibackendAdminProductcategoriesController } from "./controllers/shoppingMallAiBackend/admin/productCategories/ShoppingmallaibackendAdminProductcategoriesController";
import { ShoppingmallaibackendAdminProductcategorymappingsController } from "./controllers/shoppingMallAiBackend/admin/productCategoryMappings/ShoppingmallaibackendAdminProductcategorymappingsController";
import { ShoppingmallaibackendSellerProductsFilesController } from "./controllers/shoppingMallAiBackend/seller/products/files/ShoppingmallaibackendSellerProductsFilesController";
import { ShoppingmallaibackendAdminProductsFilesController } from "./controllers/shoppingMallAiBackend/admin/products/files/ShoppingmallaibackendAdminProductsFilesController";
import { ShoppingmallaibackendAdminProducttagsController } from "./controllers/shoppingMallAiBackend/admin/productTags/ShoppingmallaibackendAdminProducttagsController";
import { ShoppingmallaibackendAdminProductsInventoriesController } from "./controllers/shoppingMallAiBackend/admin/products/inventories/ShoppingmallaibackendAdminProductsInventoriesController";
import { ShoppingmallaibackendSellerProductsInventoriesController } from "./controllers/shoppingMallAiBackend/seller/products/inventories/ShoppingmallaibackendSellerProductsInventoriesController";
import { ShoppingmallaibackendCustomerCartsController } from "./controllers/shoppingMallAiBackend/customer/carts/ShoppingmallaibackendCustomerCartsController";
import { ShoppingmallaibackendSellerCartsController } from "./controllers/shoppingMallAiBackend/seller/carts/ShoppingmallaibackendSellerCartsController";
import { ShoppingmallaibackendAdminCartsController } from "./controllers/shoppingMallAiBackend/admin/carts/ShoppingmallaibackendAdminCartsController";
import { ShoppingmallaibackendCustomerCartsItemsController } from "./controllers/shoppingMallAiBackend/customer/carts/items/ShoppingmallaibackendCustomerCartsItemsController";
import { ShoppingmallaibackendSellerCartsItemsController } from "./controllers/shoppingMallAiBackend/seller/carts/items/ShoppingmallaibackendSellerCartsItemsController";
import { ShoppingmallaibackendAdminCartsItemsController } from "./controllers/shoppingMallAiBackend/admin/carts/items/ShoppingmallaibackendAdminCartsItemsController";
import { ShoppingmallaibackendCustomerOrdersController } from "./controllers/shoppingMallAiBackend/customer/orders/ShoppingmallaibackendCustomerOrdersController";
import { ShoppingmallaibackendCustomerOrdersItemsController } from "./controllers/shoppingMallAiBackend/customer/orders/items/ShoppingmallaibackendCustomerOrdersItemsController";
import { ShoppingmallaibackendAdminOrdersItemsController } from "./controllers/shoppingMallAiBackend/admin/orders/items/ShoppingmallaibackendAdminOrdersItemsController";
import { ShoppingmallaibackendAdminOrdersItemsnapshotsController } from "./controllers/shoppingMallAiBackend/admin/orders/itemSnapshots/ShoppingmallaibackendAdminOrdersItemsnapshotsController";
import { ShoppingmallaibackendCustomerOrdersPaymentsController } from "./controllers/shoppingMallAiBackend/customer/orders/payments/ShoppingmallaibackendCustomerOrdersPaymentsController";
import { ShoppingmallaibackendCustomerOrdersPaymentsAttemptsController } from "./controllers/shoppingMallAiBackend/customer/orders/payments/attempts/ShoppingmallaibackendCustomerOrdersPaymentsAttemptsController";
import { ShoppingmallaibackendCustomerOrdersDeliveriesController } from "./controllers/shoppingMallAiBackend/customer/orders/deliveries/ShoppingmallaibackendCustomerOrdersDeliveriesController";
import { ShoppingmallaibackendSellerOrdersDeliveriesController } from "./controllers/shoppingMallAiBackend/seller/orders/deliveries/ShoppingmallaibackendSellerOrdersDeliveriesController";
import { ShoppingmallaibackendAdminOrdersDeliveriesController } from "./controllers/shoppingMallAiBackend/admin/orders/deliveries/ShoppingmallaibackendAdminOrdersDeliveriesController";
import { ShoppingmallaibackendAdminOrdersDeliveriesEventsController } from "./controllers/shoppingMallAiBackend/admin/orders/deliveries/events/ShoppingmallaibackendAdminOrdersDeliveriesEventsController";
import { ShoppingmallaibackendAdminOrdersReturnsController } from "./controllers/shoppingMallAiBackend/admin/orders/returns/ShoppingmallaibackendAdminOrdersReturnsController";
import { ShoppingmallaibackendAdminOrdersExchangesController } from "./controllers/shoppingMallAiBackend/admin/orders/exchanges/ShoppingmallaibackendAdminOrdersExchangesController";
import { ShoppingmallaibackendCustomerOrdersExchangesController } from "./controllers/shoppingMallAiBackend/customer/orders/exchanges/ShoppingmallaibackendCustomerOrdersExchangesController";
import { ShoppingmallaibackendCustomerOrdersRefundsController } from "./controllers/shoppingMallAiBackend/customer/orders/refunds/ShoppingmallaibackendCustomerOrdersRefundsController";
import { ShoppingmallaibackendAdminOrdersRefundsController } from "./controllers/shoppingMallAiBackend/admin/orders/refunds/ShoppingmallaibackendAdminOrdersRefundsController";
import { ShoppingmallaibackendCustomerOrdersIncidentsController } from "./controllers/shoppingMallAiBackend/customer/orders/incidents/ShoppingmallaibackendCustomerOrdersIncidentsController";
import { ShoppingmallaibackendAdminOrdersIncidentsController } from "./controllers/shoppingMallAiBackend/admin/orders/incidents/ShoppingmallaibackendAdminOrdersIncidentsController";
import { ShoppingmallaibackendAdminCouponsController } from "./controllers/shoppingMallAiBackend/admin/coupons/ShoppingmallaibackendAdminCouponsController";
import { ShoppingmallaibackendAdminCouponsIssuancesController } from "./controllers/shoppingMallAiBackend/admin/coupons/issuances/ShoppingmallaibackendAdminCouponsIssuancesController";
import { ShoppingmallaibackendAdminCouponsUsagesController } from "./controllers/shoppingMallAiBackend/admin/coupons/usages/ShoppingmallaibackendAdminCouponsUsagesController";
import { ShoppingmallaibackendAdminCouponsCodesController } from "./controllers/shoppingMallAiBackend/admin/coupons/codes/ShoppingmallaibackendAdminCouponsCodesController";
import { ShoppingmallaibackendAdminCouponsStackingrulesController } from "./controllers/shoppingMallAiBackend/admin/coupons/stackingRules/ShoppingmallaibackendAdminCouponsStackingrulesController";
import { ShoppingmallaibackendAdminCouponsRestrictionsController } from "./controllers/shoppingMallAiBackend/admin/coupons/restrictions/ShoppingmallaibackendAdminCouponsRestrictionsController";
import { ShoppingmallaibackendAdminCouponsNotificationsController } from "./controllers/shoppingMallAiBackend/admin/coupons/notifications/ShoppingmallaibackendAdminCouponsNotificationsController";
import { ShoppingmallaibackendAdminDepositsController } from "./controllers/shoppingMallAiBackend/admin/deposits/ShoppingmallaibackendAdminDepositsController";
import { ShoppingmallaibackendCustomerDepositsTransactionsController } from "./controllers/shoppingMallAiBackend/customer/deposits/transactions/ShoppingmallaibackendCustomerDepositsTransactionsController";
import { ShoppingmallaibackendCustomerMileagesController } from "./controllers/shoppingMallAiBackend/customer/mileages/ShoppingmallaibackendCustomerMileagesController";
import { ShoppingmallaibackendAdminMileagesController } from "./controllers/shoppingMallAiBackend/admin/mileages/ShoppingmallaibackendAdminMileagesController";
import { ShoppingmallaibackendCustomerMileagesTransactionsController } from "./controllers/shoppingMallAiBackend/customer/mileages/transactions/ShoppingmallaibackendCustomerMileagesTransactionsController";
import { ShoppingmallaibackendAdminCoinsController } from "./controllers/shoppingMallAiBackend/admin/coins/ShoppingmallaibackendAdminCoinsController";
import { ShoppingmallaibackendAdminCoinsTransactionsController } from "./controllers/shoppingMallAiBackend/admin/coins/transactions/ShoppingmallaibackendAdminCoinsTransactionsController";
import { ShoppingmallaibackendCustomerCoinsController } from "./controllers/shoppingMallAiBackend/customer/coins/ShoppingmallaibackendCustomerCoinsController";
import { ShoppingmallaibackendCustomerCoinsTransactionsController } from "./controllers/shoppingMallAiBackend/customer/coins/transactions/ShoppingmallaibackendCustomerCoinsTransactionsController";
import { ShoppingmallaibackendCustomerInquiriesController } from "./controllers/shoppingMallAiBackend/customer/inquiries/ShoppingmallaibackendCustomerInquiriesController";
import { ShoppingmallaibackendCustomerInquiriesRepliesController } from "./controllers/shoppingMallAiBackend/customer/inquiries/replies/ShoppingmallaibackendCustomerInquiriesRepliesController";
import { ShoppingmallaibackendAdminFinancialincidentsController } from "./controllers/shoppingMallAiBackend/admin/financialIncidents/ShoppingmallaibackendAdminFinancialincidentsController";
import { ShoppingmallaibackendSellerInquiriesRepliesController } from "./controllers/shoppingMallAiBackend/seller/inquiries/replies/ShoppingmallaibackendSellerInquiriesRepliesController";
import { ShoppingmallaibackendAdminInquiriesRepliesController } from "./controllers/shoppingMallAiBackend/admin/inquiries/replies/ShoppingmallaibackendAdminInquiriesRepliesController";
import { ShoppingmallaibackendCustomerFavoritesController } from "./controllers/shoppingMallAiBackend/customer/favorites/ShoppingmallaibackendCustomerFavoritesController";
import { ShoppingmallaibackendSellerFavoritesController } from "./controllers/shoppingMallAiBackend/seller/favorites/ShoppingmallaibackendSellerFavoritesController";
import { ShoppingmallaibackendAdminFavoritesController } from "./controllers/shoppingMallAiBackend/admin/favorites/ShoppingmallaibackendAdminFavoritesController";
import { ShoppingmallaibackendCustomerFavoritesProductsController } from "./controllers/shoppingMallAiBackend/customer/favorites/products/ShoppingmallaibackendCustomerFavoritesProductsController";
import { ShoppingmallaibackendCustomerFavoritesAddressesController } from "./controllers/shoppingMallAiBackend/customer/favorites/addresses/ShoppingmallaibackendCustomerFavoritesAddressesController";
import { ShoppingmallaibackendCustomerFavoritesInquiriesController } from "./controllers/shoppingMallAiBackend/customer/favorites/inquiries/ShoppingmallaibackendCustomerFavoritesInquiriesController";
import { ShoppingmallaibackendCustomerFavoritefoldersController } from "./controllers/shoppingMallAiBackend/customer/favoriteFolders/ShoppingmallaibackendCustomerFavoritefoldersController";
import { ShoppingmallaibackendArticlesController } from "./controllers/shoppingMallAiBackend/articles/ShoppingmallaibackendArticlesController";
import { ShoppingmallaibackendCustomerArticlesController } from "./controllers/shoppingMallAiBackend/customer/articles/ShoppingmallaibackendCustomerArticlesController";
import { ShoppingmallaibackendArticlesCommentsController } from "./controllers/shoppingMallAiBackend/articles/comments/ShoppingmallaibackendArticlesCommentsController";
import { ShoppingmallaibackendCustomerArticlesCommentsController } from "./controllers/shoppingMallAiBackend/customer/articles/comments/ShoppingmallaibackendCustomerArticlesCommentsController";
import { ShoppingmallaibackendAdminArticlecategoriesController } from "./controllers/shoppingMallAiBackend/admin/articleCategories/ShoppingmallaibackendAdminArticlecategoriesController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallaibackendAdminChannelsController,
    ShoppingmallaibackendAdminChannelsSectionsController,
    ShoppingmallaibackendAdminChannelsCategoriesController,
    ShoppingmallaibackendAdminSectionsCategorymappingsController,
    ShoppingmallaibackendAdminSystemconfigsController,
    ShoppingmallaibackendAdminSystemaudittrailsController,
    ShoppingmallaibackendAdminFilesController,
    ShoppingmallaibackendAdminCodebooksController,
    ShoppingmallaibackendAdminCodebooksEntriesController,
    ShoppingmallaibackendAdminCustomersController,
    ShoppingmallaibackendAdminCustomersSessionsController,
    ShoppingmallaibackendCustomerCustomersSessionsController,
    ShoppingmallaibackendCustomerCustomersExternalidentitiesController,
    ShoppingmallaibackendAdminCustomersExternalidentitiesController,
    ShoppingmallaibackendCustomerCustomersWithdrawalsController,
    ShoppingmallaibackendAdminCustomersWithdrawalsController,
    ShoppingmallaibackendAdminSellersController,
    ShoppingmallaibackendAdminSellersVerificationsController,
    ShoppingmallaibackendSellerSellersProfileController,
    ShoppingmallaibackendSellerSellersSettlementController,
    ShoppingmallaibackendAdminAdminsController,
    ShoppingmallaibackendProductsController,
    ShoppingmallaibackendSellerProductsController,
    ShoppingmallaibackendAdminProductsController,
    ShoppingmallaibackendAdminAdminsAuditlogsController,
    ShoppingmallaibackendAdminRoleescalationsController,
    ShoppingmallaibackendSellerProductsOptionsController,
    ShoppingmallaibackendSellerProductsOptionsUnitsController,
    ShoppingmallaibackendAdminProductsOptionsUnitsController,
    ShoppingmallaibackendSellerProductsBundlesController,
    ShoppingmallaibackendAdminProductsBundlesController,
    ShoppingmallaibackendAdminProductcategoriesController,
    ShoppingmallaibackendAdminProductcategorymappingsController,
    ShoppingmallaibackendSellerProductsFilesController,
    ShoppingmallaibackendAdminProductsFilesController,
    ShoppingmallaibackendAdminProducttagsController,
    ShoppingmallaibackendAdminProductsInventoriesController,
    ShoppingmallaibackendSellerProductsInventoriesController,
    ShoppingmallaibackendCustomerCartsController,
    ShoppingmallaibackendSellerCartsController,
    ShoppingmallaibackendAdminCartsController,
    ShoppingmallaibackendCustomerCartsItemsController,
    ShoppingmallaibackendSellerCartsItemsController,
    ShoppingmallaibackendAdminCartsItemsController,
    ShoppingmallaibackendCustomerOrdersController,
    ShoppingmallaibackendCustomerOrdersItemsController,
    ShoppingmallaibackendAdminOrdersItemsController,
    ShoppingmallaibackendAdminOrdersItemsnapshotsController,
    ShoppingmallaibackendCustomerOrdersPaymentsController,
    ShoppingmallaibackendCustomerOrdersPaymentsAttemptsController,
    ShoppingmallaibackendCustomerOrdersDeliveriesController,
    ShoppingmallaibackendSellerOrdersDeliveriesController,
    ShoppingmallaibackendAdminOrdersDeliveriesController,
    ShoppingmallaibackendAdminOrdersDeliveriesEventsController,
    ShoppingmallaibackendAdminOrdersReturnsController,
    ShoppingmallaibackendAdminOrdersExchangesController,
    ShoppingmallaibackendCustomerOrdersExchangesController,
    ShoppingmallaibackendCustomerOrdersRefundsController,
    ShoppingmallaibackendAdminOrdersRefundsController,
    ShoppingmallaibackendCustomerOrdersIncidentsController,
    ShoppingmallaibackendAdminOrdersIncidentsController,
    ShoppingmallaibackendAdminCouponsController,
    ShoppingmallaibackendAdminCouponsIssuancesController,
    ShoppingmallaibackendAdminCouponsUsagesController,
    ShoppingmallaibackendAdminCouponsCodesController,
    ShoppingmallaibackendAdminCouponsStackingrulesController,
    ShoppingmallaibackendAdminCouponsRestrictionsController,
    ShoppingmallaibackendAdminCouponsNotificationsController,
    ShoppingmallaibackendAdminDepositsController,
    ShoppingmallaibackendCustomerDepositsTransactionsController,
    ShoppingmallaibackendCustomerMileagesController,
    ShoppingmallaibackendAdminMileagesController,
    ShoppingmallaibackendCustomerMileagesTransactionsController,
    ShoppingmallaibackendAdminCoinsController,
    ShoppingmallaibackendAdminCoinsTransactionsController,
    ShoppingmallaibackendCustomerCoinsController,
    ShoppingmallaibackendCustomerCoinsTransactionsController,
    ShoppingmallaibackendCustomerInquiriesController,
    ShoppingmallaibackendCustomerInquiriesRepliesController,
    ShoppingmallaibackendAdminFinancialincidentsController,
    ShoppingmallaibackendSellerInquiriesRepliesController,
    ShoppingmallaibackendAdminInquiriesRepliesController,
    ShoppingmallaibackendCustomerFavoritesController,
    ShoppingmallaibackendSellerFavoritesController,
    ShoppingmallaibackendAdminFavoritesController,
    ShoppingmallaibackendCustomerFavoritesProductsController,
    ShoppingmallaibackendCustomerFavoritesAddressesController,
    ShoppingmallaibackendCustomerFavoritesInquiriesController,
    ShoppingmallaibackendCustomerFavoritefoldersController,
    ShoppingmallaibackendArticlesController,
    ShoppingmallaibackendCustomerArticlesController,
    ShoppingmallaibackendArticlesCommentsController,
    ShoppingmallaibackendCustomerArticlesCommentsController,
    ShoppingmallaibackendAdminArticlecategoriesController,
  ],
})
export class MyModule {}
