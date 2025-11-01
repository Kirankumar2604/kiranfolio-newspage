// Use CommonJS export so PostCSS loaders that expect module.exports pick up
// the config reliably. Explicitly include postcss-import first so that
// @import rules are resolved before Tailwind runs — this can prevent some
// "from" warnings emitted by plugins that call postcss.parse without a
// proper `from` option.
module.exports = {
  plugins: [
    require('postcss-import')(),
    require('tailwindcss')(),
    require('autoprefixer')(),
  ],
};
