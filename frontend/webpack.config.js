const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const apiTarget = process.env.SERVER_ORIGIN || "http://127.0.0.1:8080";
const webPort = parseInt(process.env.WEB_PORT || "5173", 10);

module.exports = (_env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: "./src/main.tsx",
    mode: process.env.NODE_ENV || 'production',
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProd ? "js/[name].[contenthash:8].js" : "js/[name].js",
      publicPath: "/",
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
      port: isNaN(webPort) ? 5173 : webPort,
      host: "127.0.0.1",
      hot: true,
      historyApiFallback: true,
      proxy: [
        {
          context: ["/api"],
          target: apiTarget,
          changeOrigin: true,
        },
      ],
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    stats: "minimal",
  };
};
