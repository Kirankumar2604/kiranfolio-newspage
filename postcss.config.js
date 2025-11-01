// Use CommonJS export so PostCSS loaders that expect module.exports pick up
// the config reliably. Explicitly include postcss-import first so that
// @import rules are resolved before Tailwind runs — this can prevent some
// "from" warnings emitted by plugins that call postcss.parse without a
// proper `from` option.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Export ESM-compatible PostCSS config while using CommonJS-only plugins via
// createRequire. This avoids the "module is not defined" error when the
// project uses "type": "module" in package.json.
export default {
  plugins: [
    require('postcss-import')(),
    require('tailwindcss')(),
    require('autoprefixer')(),
  ],
};
