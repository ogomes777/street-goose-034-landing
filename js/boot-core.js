/* Boot, part 1: everything that runs before the catalog. Static imports keep
   the exact evaluation order of the former one-by-one `await import()` chain,
   but the browser fetches the whole group in parallel instead of one
   round trip per file (that waterfall cost seconds on mobile networks). */
import './motion.js';
import './music-player.js';
import './intro-loader.js';
import './data.js';
import './hero.js';
import './config.js';
import './theme.js';
import './i18n.js';
import './settings-menu.js';
import './auth-modal.js';
import './account-menu.js';
import './header-nav.js';
import './mobile-account.js';
import './toast.js';
import './catalog.js';
