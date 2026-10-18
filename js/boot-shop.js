/* Boot, part 2: runs after the catalog is ready (see js/catalog-sync.js).
   Same order as before: cart and wishlist before the router, which mounts the
   URL's route as soon as it loads (/checkout reads window.SG.cart on mount). */
import './price-sync.js';
import './cart.js';
import './wishlist.js';
import './category-portals.js';
import './router.js';
import './nav-routes.js';
import './products.js';
import './scroll-film.js';
import './hero3d-film.js';
import './product-universe.js';
import './drift-product.js';
import './checkout.js';
import './community-home.js';
import './main.js';
import './final-act-motion.js';
import './payment-terminal.js';
