module.exports = {
  hooks: {
    readPackage(pkg) {
      // Catch when pnpm reads the package.json of your 'threejs' library
      if (pkg.name === '@webgamekit/threejs') {
        // Manually rewrite its dependency to point to GitHub instead of the Registry
        pkg.dependencies['@webgamekit/animation'] = 'github:cnotv/generative-art#path:packages/animation';
      }
      return pkg;
    }
  }
}
