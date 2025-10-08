import { Module } from "@nestjs/common";

import { AuthCustomerController } from "./controllers/auth/customer/AuthCustomerController";
import { AuthCustomerPasswordRequest_resetController } from "./controllers/auth/customer/password/request-reset/AuthCustomerPasswordRequest_resetController";
import { AuthCustomerPasswordResetController } from "./controllers/auth/customer/password/reset/AuthCustomerPasswordResetController";
import { AuthCustomerEmailRequest_verificationController } from "./controllers/auth/customer/email/request-verification/AuthCustomerEmailRequest_verificationController";
import { AuthCustomerEmailVerifyController } from "./controllers/auth/customer/email/verify/AuthCustomerEmailVerifyController";
import { AuthSellerController } from "./controllers/auth/seller/AuthSellerController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { ShoppingmallCategoriesController } from "./controllers/shoppingMall/categories/ShoppingmallCategoriesController";
import { ShoppingmallAdminCategoriesController } from "./controllers/shoppingMall/admin/categories/ShoppingmallAdminCategoriesController";
import { ShoppingmallAdminSystemconfigsController } from "./controllers/shoppingMall/admin/systemConfigs/ShoppingmallAdminSystemconfigsController";
import { ShoppingmallAdminPlatformsettingsController } from "./controllers/shoppingMall/admin/platformSettings/ShoppingmallAdminPlatformsettingsController";
import { ShoppingmallAdminCustomersController } from "./controllers/shoppingMall/admin/customers/ShoppingmallAdminCustomersController";
import { ShoppingmallCustomerCustomersController } from "./controllers/shoppingMall/customer/customers/ShoppingmallCustomerCustomersController";
import { ShoppingmallCustomerCustomersAddressesController } from "./controllers/shoppingMall/customer/customers/addresses/ShoppingmallCustomerCustomersAddressesController";
import { ShoppingmallAdminCustomersAddressesController } from "./controllers/shoppingMall/admin/customers/addresses/ShoppingmallAdminCustomersAddressesController";
import { ShoppingmallAdminSellersController } from "./controllers/shoppingMall/admin/sellers/ShoppingmallAdminSellersController";
import { ShoppingmallSellerSellersController } from "./controllers/shoppingMall/seller/sellers/ShoppingmallSellerSellersController";
import { ShoppingmallSellerSellersAddressesController } from "./controllers/shoppingMall/seller/sellers/addresses/ShoppingmallSellerSellersAddressesController";
import { ShoppingmallAdminSellersAddressesController } from "./controllers/shoppingMall/admin/sellers/addresses/ShoppingmallAdminSellersAddressesController";
import { ShoppingmallAdminAdminsController } from "./controllers/shoppingMall/admin/admins/ShoppingmallAdminAdminsController";
import { ShoppingmallAdminRolesController } from "./controllers/shoppingMall/admin/roles/ShoppingmallAdminRolesController";
import { ShoppingmallProductsController } from "./controllers/shoppingMall/products/ShoppingmallProductsController";
import { ShoppingmallSellerProductsController } from "./controllers/shoppingMall/seller/products/ShoppingmallSellerProductsController";
import { ShoppingmallAdminProductsController } from "./controllers/shoppingMall/admin/products/ShoppingmallAdminProductsController";
import { ShoppingmallAdminProductsSkusController } from "./controllers/shoppingMall/admin/products/skus/ShoppingmallAdminProductsSkusController";
import { ShoppingmallSellerProductsSkusController } from "./controllers/shoppingMall/seller/products/skus/ShoppingmallSellerProductsSkusController";
import { ShoppingmallProductsSkusController } from "./controllers/shoppingMall/products/skus/ShoppingmallProductsSkusController";
import { ShoppingmallProductsOptionsController } from "./controllers/shoppingMall/products/options/ShoppingmallProductsOptionsController";
import { ShoppingmallSellerProductsOptionsController } from "./controllers/shoppingMall/seller/products/options/ShoppingmallSellerProductsOptionsController";
import { ShoppingmallAdminProductsOptionsController } from "./controllers/shoppingMall/admin/products/options/ShoppingmallAdminProductsOptionsController";
import { ShoppingmallSellerProductsOptionsValuesController } from "./controllers/shoppingMall/seller/products/options/values/ShoppingmallSellerProductsOptionsValuesController";
import { ShoppingmallAdminProductsOptionsValuesController } from "./controllers/shoppingMall/admin/products/options/values/ShoppingmallAdminProductsOptionsValuesController";
import { ShoppingmallProductsOptionsValuesController } from "./controllers/shoppingMall/products/options/values/ShoppingmallProductsOptionsValuesController";
import { ShoppingmallProductsImagesController } from "./controllers/shoppingMall/products/images/ShoppingmallProductsImagesController";
import { ShoppingmallSellerProductsImagesController } from "./controllers/shoppingMall/seller/products/images/ShoppingmallSellerProductsImagesController";
import { ShoppingmallAdminProductsImagesController } from "./controllers/shoppingMall/admin/products/images/ShoppingmallAdminProductsImagesController";
import { ShoppingmallAdminProductsSkusImagesController } from "./controllers/shoppingMall/admin/products/skus/images/ShoppingmallAdminProductsSkusImagesController";
import { ShoppingmallSellerProductsSkusImagesController } from "./controllers/shoppingMall/seller/products/skus/images/ShoppingmallSellerProductsSkusImagesController";
import { ShoppingmallProductsSkusImagesController } from "./controllers/shoppingMall/products/skus/images/ShoppingmallProductsSkusImagesController";
import { ShoppingmallSellerProductsSkusInventoryController } from "./controllers/shoppingMall/seller/products/skus/inventory/ShoppingmallSellerProductsSkusInventoryController";
import { ShoppingmallAdminProductsSkusInventoryController } from "./controllers/shoppingMall/admin/products/skus/inventory/ShoppingmallAdminProductsSkusInventoryController";
import { ShoppingmallAdminProductsSkusInventoryLogsController } from "./controllers/shoppingMall/admin/products/skus/inventory/logs/ShoppingmallAdminProductsSkusInventoryLogsController";
import { ShoppingmallSellerProductsSkusInventoryLogsController } from "./controllers/shoppingMall/seller/products/skus/inventory/logs/ShoppingmallSellerProductsSkusInventoryLogsController";
import { ShoppingmallCustomerCartsController } from "./controllers/shoppingMall/customer/carts/ShoppingmallCustomerCartsController";
import { ShoppingmallCustomerCartsCartitemsController } from "./controllers/shoppingMall/customer/carts/cartItems/ShoppingmallCustomerCartsCartitemsController";
import { ShoppingmallCustomerWishlistsController } from "./controllers/shoppingMall/customer/wishlists/ShoppingmallCustomerWishlistsController";
import { ShoppingmallAdminWishlistsController } from "./controllers/shoppingMall/admin/wishlists/ShoppingmallAdminWishlistsController";
import { ShoppingmallCustomerWishlistsWishlistitemsController } from "./controllers/shoppingMall/customer/wishlists/wishlistItems/ShoppingmallCustomerWishlistsWishlistitemsController";
import { ShoppingmallAdminOrdersController } from "./controllers/shoppingMall/admin/orders/ShoppingmallAdminOrdersController";
import { ShoppingmallSellerOrdersController } from "./controllers/shoppingMall/seller/orders/ShoppingmallSellerOrdersController";
import { ShoppingmallCustomerOrdersController } from "./controllers/shoppingMall/customer/orders/ShoppingmallCustomerOrdersController";
import { ShoppingmallAdminOrdersItemsController } from "./controllers/shoppingMall/admin/orders/items/ShoppingmallAdminOrdersItemsController";
import { ShoppingmallSellerOrdersItemsController } from "./controllers/shoppingMall/seller/orders/items/ShoppingmallSellerOrdersItemsController";
import { ShoppingmallCustomerOrdersItemsController } from "./controllers/shoppingMall/customer/orders/items/ShoppingmallCustomerOrdersItemsController";
import { ShoppingmallCustomerOrdersShipmentsController } from "./controllers/shoppingMall/customer/orders/shipments/ShoppingmallCustomerOrdersShipmentsController";
import { ShoppingmallSellerOrdersShipmentsController } from "./controllers/shoppingMall/seller/orders/shipments/ShoppingmallSellerOrdersShipmentsController";
import { ShoppingmallAdminOrdersShipmentsController } from "./controllers/shoppingMall/admin/orders/shipments/ShoppingmallAdminOrdersShipmentsController";
import { ShoppingmallCustomerOrdersStatushistoryController } from "./controllers/shoppingMall/customer/orders/statusHistory/ShoppingmallCustomerOrdersStatushistoryController";
import { ShoppingmallSellerOrdersStatushistoryController } from "./controllers/shoppingMall/seller/orders/statusHistory/ShoppingmallSellerOrdersStatushistoryController";
import { ShoppingmallAdminOrdersStatushistoryController } from "./controllers/shoppingMall/admin/orders/statusHistory/ShoppingmallAdminOrdersStatushistoryController";
import { ShoppingmallCustomerOrdersPaymentsController } from "./controllers/shoppingMall/customer/orders/payments/ShoppingmallCustomerOrdersPaymentsController";
import { ShoppingmallSellerOrdersPaymentsController } from "./controllers/shoppingMall/seller/orders/payments/ShoppingmallSellerOrdersPaymentsController";
import { ShoppingmallAdminOrdersPaymentsController } from "./controllers/shoppingMall/admin/orders/payments/ShoppingmallAdminOrdersPaymentsController";
import { ShoppingmallCustomerOrdersCancellationsController } from "./controllers/shoppingMall/customer/orders/cancellations/ShoppingmallCustomerOrdersCancellationsController";
import { ShoppingmallSellerOrdersCancellationsController } from "./controllers/shoppingMall/seller/orders/cancellations/ShoppingmallSellerOrdersCancellationsController";
import { ShoppingmallAdminOrdersCancellationsController } from "./controllers/shoppingMall/admin/orders/cancellations/ShoppingmallAdminOrdersCancellationsController";
import { ShoppingmallCustomerOrdersRefundsController } from "./controllers/shoppingMall/customer/orders/refunds/ShoppingmallCustomerOrdersRefundsController";
import { ShoppingmallAdminOrdersRefundsController } from "./controllers/shoppingMall/admin/orders/refunds/ShoppingmallAdminOrdersRefundsController";
import { ShoppingmallSellerOrdersRefundsController } from "./controllers/shoppingMall/seller/orders/refunds/ShoppingmallSellerOrdersRefundsController";
import { ShoppingmallAdminOrderaddressesController } from "./controllers/shoppingMall/admin/orderAddresses/ShoppingmallAdminOrderaddressesController";
import { ShoppingmallCustomerOrderaddressesController } from "./controllers/shoppingMall/customer/orderAddresses/ShoppingmallCustomerOrderaddressesController";
import { ShoppingmallAdminOrderpaymentmethodsController } from "./controllers/shoppingMall/admin/orderPaymentMethods/ShoppingmallAdminOrderpaymentmethodsController";
import { ShoppingmallProductsReviewsController } from "./controllers/shoppingMall/products/reviews/ShoppingmallProductsReviewsController";
import { ShoppingmallCustomerProductsReviewsController } from "./controllers/shoppingMall/customer/products/reviews/ShoppingmallCustomerProductsReviewsController";
import { ShoppingmallProductsReviewsImagesController } from "./controllers/shoppingMall/products/reviews/images/ShoppingmallProductsReviewsImagesController";
import { ShoppingmallCustomerProductsReviewsImagesController } from "./controllers/shoppingMall/customer/products/reviews/images/ShoppingmallCustomerProductsReviewsImagesController";
import { ShoppingmallAdminProductsReviewsFlagsController } from "./controllers/shoppingMall/admin/products/reviews/flags/ShoppingmallAdminProductsReviewsFlagsController";
import { ShoppingmallCustomerProductsReviewsFlagsController } from "./controllers/shoppingMall/customer/products/reviews/flags/ShoppingmallCustomerProductsReviewsFlagsController";
import { ShoppingmallSellerProductsReviewsFlagsController } from "./controllers/shoppingMall/seller/products/reviews/flags/ShoppingmallSellerProductsReviewsFlagsController";
import { ShoppingmallAdminProductsReviewsRepliesController } from "./controllers/shoppingMall/admin/products/reviews/replies/ShoppingmallAdminProductsReviewsRepliesController";
import { ShoppingmallProductsReviewsRepliesController } from "./controllers/shoppingMall/products/reviews/replies/ShoppingmallProductsReviewsRepliesController";
import { ShoppingmallSellerProductsReviewsRepliesController } from "./controllers/shoppingMall/seller/products/reviews/replies/ShoppingmallSellerProductsReviewsRepliesController";
import { ShoppingmallAdminOrderhistoriesController } from "./controllers/shoppingMall/admin/orderHistories/ShoppingmallAdminOrderhistoriesController";
import { ShoppingmallSellerOrderhistoriesController } from "./controllers/shoppingMall/seller/orderHistories/ShoppingmallSellerOrderhistoriesController";
import { ShoppingmallCustomerOrderhistoriesController } from "./controllers/shoppingMall/customer/orderHistories/ShoppingmallCustomerOrderhistoriesController";
import { ShoppingmallAdminCustomerserviceeventsController } from "./controllers/shoppingMall/admin/customerServiceEvents/ShoppingmallAdminCustomerserviceeventsController";
import { ShoppingmallSellerCustomerserviceeventsController } from "./controllers/shoppingMall/seller/customerServiceEvents/ShoppingmallSellerCustomerserviceeventsController";
import { ShoppingmallCustomerCustomerserviceeventsController } from "./controllers/shoppingMall/customer/customerServiceEvents/ShoppingmallCustomerCustomerserviceeventsController";
import { ShoppingmallAdminEscalationsController } from "./controllers/shoppingMall/admin/escalations/ShoppingmallAdminEscalationsController";
import { ShoppingmallCustomerEscalationsController } from "./controllers/shoppingMall/customer/escalations/ShoppingmallCustomerEscalationsController";
import { ShoppingmallSellerEscalationsController } from "./controllers/shoppingMall/seller/escalations/ShoppingmallSellerEscalationsController";
import { ShoppingmallAdminAppealsController } from "./controllers/shoppingMall/admin/appeals/ShoppingmallAdminAppealsController";
import { ShoppingmallCustomerAppealsController } from "./controllers/shoppingMall/customer/appeals/ShoppingmallCustomerAppealsController";
import { ShoppingmallSellerAppealsController } from "./controllers/shoppingMall/seller/appeals/ShoppingmallSellerAppealsController";
import { ShoppingmallAdminAdminactionlogsController } from "./controllers/shoppingMall/admin/adminActionLogs/ShoppingmallAdminAdminactionlogsController";
import { ShoppingmallAdminAdminauditlogsController } from "./controllers/shoppingMall/admin/adminAuditLogs/ShoppingmallAdminAdminauditlogsController";
import { ShoppingmallAdminModerationeventlogsController } from "./controllers/shoppingMall/admin/moderationEventLogs/ShoppingmallAdminModerationeventlogsController";
import { ShoppingmallAdminNotificationjobsController } from "./controllers/shoppingMall/admin/notificationJobs/ShoppingmallAdminNotificationjobsController";
import { ShoppingmallAdminAnalyticstriggersController } from "./controllers/shoppingMall/admin/analyticsTriggers/ShoppingmallAdminAnalyticstriggersController";

@Module({
  controllers: [
    AuthCustomerController,
    AuthCustomerPasswordRequest_resetController,
    AuthCustomerPasswordResetController,
    AuthCustomerEmailRequest_verificationController,
    AuthCustomerEmailVerifyController,
    AuthSellerController,
    AuthAdminController,
    ShoppingmallCategoriesController,
    ShoppingmallAdminCategoriesController,
    ShoppingmallAdminSystemconfigsController,
    ShoppingmallAdminPlatformsettingsController,
    ShoppingmallAdminCustomersController,
    ShoppingmallCustomerCustomersController,
    ShoppingmallCustomerCustomersAddressesController,
    ShoppingmallAdminCustomersAddressesController,
    ShoppingmallAdminSellersController,
    ShoppingmallSellerSellersController,
    ShoppingmallSellerSellersAddressesController,
    ShoppingmallAdminSellersAddressesController,
    ShoppingmallAdminAdminsController,
    ShoppingmallAdminRolesController,
    ShoppingmallProductsController,
    ShoppingmallSellerProductsController,
    ShoppingmallAdminProductsController,
    ShoppingmallAdminProductsSkusController,
    ShoppingmallSellerProductsSkusController,
    ShoppingmallProductsSkusController,
    ShoppingmallProductsOptionsController,
    ShoppingmallSellerProductsOptionsController,
    ShoppingmallAdminProductsOptionsController,
    ShoppingmallSellerProductsOptionsValuesController,
    ShoppingmallAdminProductsOptionsValuesController,
    ShoppingmallProductsOptionsValuesController,
    ShoppingmallProductsImagesController,
    ShoppingmallSellerProductsImagesController,
    ShoppingmallAdminProductsImagesController,
    ShoppingmallAdminProductsSkusImagesController,
    ShoppingmallSellerProductsSkusImagesController,
    ShoppingmallProductsSkusImagesController,
    ShoppingmallSellerProductsSkusInventoryController,
    ShoppingmallAdminProductsSkusInventoryController,
    ShoppingmallAdminProductsSkusInventoryLogsController,
    ShoppingmallSellerProductsSkusInventoryLogsController,
    ShoppingmallCustomerCartsController,
    ShoppingmallCustomerCartsCartitemsController,
    ShoppingmallCustomerWishlistsController,
    ShoppingmallAdminWishlistsController,
    ShoppingmallCustomerWishlistsWishlistitemsController,
    ShoppingmallAdminOrdersController,
    ShoppingmallSellerOrdersController,
    ShoppingmallCustomerOrdersController,
    ShoppingmallAdminOrdersItemsController,
    ShoppingmallSellerOrdersItemsController,
    ShoppingmallCustomerOrdersItemsController,
    ShoppingmallCustomerOrdersShipmentsController,
    ShoppingmallSellerOrdersShipmentsController,
    ShoppingmallAdminOrdersShipmentsController,
    ShoppingmallCustomerOrdersStatushistoryController,
    ShoppingmallSellerOrdersStatushistoryController,
    ShoppingmallAdminOrdersStatushistoryController,
    ShoppingmallCustomerOrdersPaymentsController,
    ShoppingmallSellerOrdersPaymentsController,
    ShoppingmallAdminOrdersPaymentsController,
    ShoppingmallCustomerOrdersCancellationsController,
    ShoppingmallSellerOrdersCancellationsController,
    ShoppingmallAdminOrdersCancellationsController,
    ShoppingmallCustomerOrdersRefundsController,
    ShoppingmallAdminOrdersRefundsController,
    ShoppingmallSellerOrdersRefundsController,
    ShoppingmallAdminOrderaddressesController,
    ShoppingmallCustomerOrderaddressesController,
    ShoppingmallAdminOrderpaymentmethodsController,
    ShoppingmallProductsReviewsController,
    ShoppingmallCustomerProductsReviewsController,
    ShoppingmallProductsReviewsImagesController,
    ShoppingmallCustomerProductsReviewsImagesController,
    ShoppingmallAdminProductsReviewsFlagsController,
    ShoppingmallCustomerProductsReviewsFlagsController,
    ShoppingmallSellerProductsReviewsFlagsController,
    ShoppingmallAdminProductsReviewsRepliesController,
    ShoppingmallProductsReviewsRepliesController,
    ShoppingmallSellerProductsReviewsRepliesController,
    ShoppingmallAdminOrderhistoriesController,
    ShoppingmallSellerOrderhistoriesController,
    ShoppingmallCustomerOrderhistoriesController,
    ShoppingmallAdminCustomerserviceeventsController,
    ShoppingmallSellerCustomerserviceeventsController,
    ShoppingmallCustomerCustomerserviceeventsController,
    ShoppingmallAdminEscalationsController,
    ShoppingmallCustomerEscalationsController,
    ShoppingmallSellerEscalationsController,
    ShoppingmallAdminAppealsController,
    ShoppingmallCustomerAppealsController,
    ShoppingmallSellerAppealsController,
    ShoppingmallAdminAdminactionlogsController,
    ShoppingmallAdminAdminauditlogsController,
    ShoppingmallAdminModerationeventlogsController,
    ShoppingmallAdminNotificationjobsController,
    ShoppingmallAdminAnalyticstriggersController,
  ],
})
export class MyModule {}
