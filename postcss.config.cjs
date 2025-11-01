// CommonJS PostCSS config to ensure PostCSS plugins load correctly when
// package.json declares "type": "module" (which makes .js files ESM).
// Including postcss-import first helps avoid `from` warnings from plugins.
module.exports = {
  plugins: [
    require('postcss-import')(),
    require('tailwindcss')(),
    require('autoprefixer')(),
  ],
};
