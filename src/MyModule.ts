import { Module } from "@nestjs/common";

import { ChannelsController } from "./controllers/channels/ChannelsController";
import { SectionsController } from "./controllers/sections/SectionsController";
import { CategoriesController } from "./controllers/categories/CategoriesController";
import { AttachmentsController } from "./controllers/attachments/AttachmentsController";
import { SnapshotsController } from "./controllers/snapshots/SnapshotsController";
import { AihooksController } from "./controllers/aiHooks/AihooksController";
import { UsersController } from "./controllers/users/UsersController";
import { UserprofilesController } from "./controllers/userProfiles/UserprofilesController";
import { UseraddressesController } from "./controllers/userAddresses/UseraddressesController";
import { UsersessionsController } from "./controllers/userSessions/UsersessionsController";
import { UserconsentsController } from "./controllers/userConsents/UserconsentsController";
import { UseridentityverificationsController } from "./controllers/userIdentityVerifications/UseridentityverificationsController";
import { UserexternalauthsController } from "./controllers/userExternalAuths/UserexternalauthsController";
import { RbacrolesController } from "./controllers/rbacRoles/RbacrolesController";
import { RbacpermissionsController } from "./controllers/rbacPermissions/RbacpermissionsController";
import { RbacassignmentsController } from "./controllers/rbacAssignments/RbacassignmentsController";
import { AuditlogsController } from "./controllers/auditLogs/AuditlogsController";
import { SellersController } from "./controllers/sellers/SellersController";
import { SellerverificationsController } from "./controllers/sellerVerifications/SellerverificationsController";
import { SellerpermissionsController } from "./controllers/sellerPermissions/SellerpermissionsController";
import { SellerchannelassignmentsController } from "./controllers/sellerChannelAssignments/SellerchannelassignmentsController";
import { AdminsController } from "./controllers/admins/AdminsController";
import { AdminrolesController } from "./controllers/adminRoles/AdminrolesController";
import { AdminpermissionsController } from "./controllers/adminPermissions/AdminpermissionsController";
import { AdminassignmentsController } from "./controllers/adminAssignments/AdminassignmentsController";
import { AdminactionlogsController } from "./controllers/adminActionLogs/AdminactionlogsController";
import { ProductsController } from "./controllers/products/ProductsController";
import { ProductvariantsController } from "./controllers/productVariants/ProductvariantsController";
import { ProductbundlesController } from "./controllers/productBundles/ProductbundlesController";
import { ProductoptionsController } from "./controllers/productOptions/ProductoptionsController";
import { ProductattributesController } from "./controllers/productAttributes/ProductattributesController";
import { ProductsnapshotsController } from "./controllers/productSnapshots/ProductsnapshotsController";
import { ProductmediaController } from "./controllers/productMedia/ProductmediaController";
import { ProductseometasController } from "./controllers/productSeoMetas/ProductseometasController";
import { TagsController } from "./controllers/tags/TagsController";
import { ProductcategoryassignmentsController } from "./controllers/productCategoryAssignments/ProductcategoryassignmentsController";
import { SearchquerylogsController } from "./controllers/searchQueryLogs/SearchquerylogsController";
import { BoardsController } from "./controllers/boards/BoardsController";
import { BoardconfigsController } from "./controllers/boardConfigs/BoardconfigsController";
import { BoardthreadsController } from "./controllers/boardThreads/BoardthreadsController";
import { BoardpostsController } from "./controllers/boardPosts/BoardpostsController";
import { ProductbulletinsController } from "./controllers/productBulletins/ProductbulletinsController";
import { ProductreviewsController } from "./controllers/productReviews/ProductreviewsController";
import { ProductreviewattachmentsController } from "./controllers/productReviewAttachments/ProductreviewattachmentsController";
import { FavoritesController } from "./controllers/favorites/FavoritesController";
import { CartsController } from "./controllers/carts/CartsController";
import { CartitemsController } from "./controllers/cartItems/CartitemsController";
import { CarttemplatesController } from "./controllers/cartTemplates/CarttemplatesController";
import { OrdersController } from "./controllers/orders/OrdersController";
import { OrderitemsController } from "./controllers/orderItems/OrderitemsController";
import { OrderstatushistoriesController } from "./controllers/orderStatusHistories/OrderstatushistoriesController";
import { PaymentsController } from "./controllers/payments/PaymentsController";
import { ShipmentsController } from "./controllers/shipments/ShipmentsController";
import { ReturnsController } from "./controllers/returns/ReturnsController";
import { ExchangesController } from "./controllers/exchanges/ExchangesController";
import { OrdersnapshotsController } from "./controllers/orderSnapshots/OrdersnapshotsController";
import { OrderauditlogsController } from "./controllers/orderAuditLogs/OrderauditlogsController";
import { AifraudchecksController } from "./controllers/aiFraudChecks/AifraudchecksController";
import { CouponsController } from "./controllers/coupons/CouponsController";
import { CouponrulesController } from "./controllers/couponRules/CouponrulesController";
import { CouponredemptionsController } from "./controllers/couponRedemptions/CouponredemptionsController";
import { UserbalancesController } from "./controllers/userBalances/UserbalancesController";
import { UserdepositsController } from "./controllers/userDeposits/UserdepositsController";
import { UsermileagesController } from "./controllers/userMileages/UsermileagesController";
import { BalanceauditlogsController } from "./controllers/balanceAuditLogs/BalanceauditlogsController";
import { RefundsController } from "./controllers/refunds/RefundsController";
import { DonationsController } from "./controllers/donations/DonationsController";
import { NotificationsController } from "./controllers/notifications/NotificationsController";
import { NotificationtemplatesController } from "./controllers/notificationTemplates/NotificationtemplatesController";
import { NotificationpreferencesController } from "./controllers/notificationPreferences/NotificationpreferencesController";
import { LocalizationstringsController } from "./controllers/localizationStrings/LocalizationstringsController";
import { LocalizationfilesController } from "./controllers/localizationFiles/LocalizationfilesController";
import { AnalyticsdashboardController } from "./controllers/analyticsDashboard/AnalyticsdashboardController";
import { AnalyticsmetricController } from "./controllers/analyticsMetric/AnalyticsmetricController";
import { MetricexportController } from "./controllers/metricExport/MetricexportController";
import { RecommendationController } from "./controllers/recommendation/RecommendationController";
import { FraudcheckController } from "./controllers/fraudCheck/FraudcheckController";
import { AiproviderController } from "./controllers/aiProvider/AiproviderController";
import { AilogController } from "./controllers/aiLog/AilogController";

@Module({
  controllers: [
    ChannelsController,
    SectionsController,
    CategoriesController,
    AttachmentsController,
    SnapshotsController,
    AihooksController,
    UsersController,
    UserprofilesController,
    UseraddressesController,
    UsersessionsController,
    UserconsentsController,
    UseridentityverificationsController,
    UserexternalauthsController,
    RbacrolesController,
    RbacpermissionsController,
    RbacassignmentsController,
    AuditlogsController,
    SellersController,
    SellerverificationsController,
    SellerpermissionsController,
    SellerchannelassignmentsController,
    AdminsController,
    AdminrolesController,
    AdminpermissionsController,
    AdminassignmentsController,
    AdminactionlogsController,
    ProductsController,
    ProductvariantsController,
    ProductbundlesController,
    ProductoptionsController,
    ProductattributesController,
    ProductsnapshotsController,
    ProductmediaController,
    ProductseometasController,
    TagsController,
    ProductcategoryassignmentsController,
    SearchquerylogsController,
    BoardsController,
    BoardconfigsController,
    BoardthreadsController,
    BoardpostsController,
    ProductbulletinsController,
    ProductreviewsController,
    ProductreviewattachmentsController,
    FavoritesController,
    CartsController,
    CartitemsController,
    CarttemplatesController,
    OrdersController,
    OrderitemsController,
    OrderstatushistoriesController,
    PaymentsController,
    ShipmentsController,
    ReturnsController,
    ExchangesController,
    OrdersnapshotsController,
    OrderauditlogsController,
    AifraudchecksController,
    CouponsController,
    CouponrulesController,
    CouponredemptionsController,
    UserbalancesController,
    UserdepositsController,
    UsermileagesController,
    BalanceauditlogsController,
    RefundsController,
    DonationsController,
    NotificationsController,
    NotificationtemplatesController,
    NotificationpreferencesController,
    LocalizationstringsController,
    LocalizationfilesController,
    AnalyticsdashboardController,
    AnalyticsmetricController,
    MetricexportController,
    RecommendationController,
    FraudcheckController,
    AiproviderController,
    AilogController,
  ],
})
export class MyModule {}
