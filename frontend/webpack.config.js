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
    mode: process.env.NODE_ENV || 'production',
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProd ? "js/[name].[contenthash:8].js" : "js/[name].js",
      publicPath: "",
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
    devServer: {
      static: path.resolve(__dirname, "public"),
      port: isNaN(devServerPort) ? 80 : devServerPort,
      host: "0.0.0.0",
      allowedHosts: "all",
      hot: true,
      historyApiFallback: true,
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
