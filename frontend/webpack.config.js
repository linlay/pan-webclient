const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const devServerPort = parseInt(process.env.FRONTEND_DEV_PORT || "80", 10);
const webUiAssetPublicPath = "/pan/";

module.exports = (_env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: "./src/main.tsx",
    mode: isProd ? "production" : "development",
    cache: {
      type: "filesystem",
      buildDependencies: {
        config: [__filename],
      },
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProd ? "js/[name].[contenthash:8].js" : "js/[name].js",
      chunkFilename: isProd
        ? "js/[name].[contenthash:8].chunk.js"
        : "js/[name].chunk.js",
      assetModuleFilename: isProd
        ? "assets/[name].[contenthash:8][ext][query]"
        : "assets/[name][ext][query]",
      publicPath: "auto",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                noEmit: false,
              },
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.scss$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
            {
              loader: "sass-loader",
              options: { api: "modern-compiler" },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        favicon: "./src/static/favicon.svg",
        publicPath: webUiAssetPublicPath,
      }),
      new webpack.DefinePlugin({
        "process.env.REACT_APP_API_BASE_URL": JSON.stringify(
          process.env.REACT_APP_API_BASE_URL || ""
        ),
      }),
      ...(isProd
        ? [
          new MiniCssExtractPlugin({
            filename: "css/[name].[contenthash:8].css",
          }),
        ]
        : []),
    ],
    optimization: {
      moduleIds: isProd ? "deterministic" : "named",
      chunkIds: isProd ? "deterministic" : "named",
      runtimeChunk: isProd
        ? {
          name: "runtime",
        }
        : false,
      splitChunks: isProd
        ? {
          chunks: "all",
          minSize: 20000,
          cacheGroups: {
            reactVendor: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: "vendor-react",
              priority: 30,
              enforce: true,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        }
        : false,
    },
    devServer: {
      static: path.resolve(__dirname, "public"),
      port: isNaN(devServerPort) ? 80 : devServerPort,
      host: "0.0.0.0",
      allowedHosts: "all",
      hot: true,
      historyApiFallback: true,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        Pragma: "no-cache",
        Expires: "0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
      client: {
        webSocketURL: {
          protocol: "auto:",
          hostname: "0.0.0.0",
          port: 0,
          pathname: "/hmr/ws",
        },
      },
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    stats: "minimal",
  };
};
