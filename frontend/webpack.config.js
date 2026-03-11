const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const publicPort = parseInt(process.env.PUBLIC_PORT || "8080", 10);
const devWebPort = parseInt(process.env.DEV_WEB_PORT || "11936", 10);
const normalizedProxyTarget = `http://127.0.0.1:${isNaN(publicPort) ? 8080 : publicPort}`;

module.exports = (_env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: "./src/main.tsx",
    mode: process.env.NODE_ENV || 'production',
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProd ? "js/[name].[contenthash:8].js" : "js/[name].js",
      publicPath: isProd ? "" : "/",
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
      port: isNaN(devWebPort) ? 11936 : devWebPort,
      host: "0.0.0.0",
      allowedHosts: "all",
      hot: true,
      historyApiFallback: {
        rewrites: [
          { from: /^\/pan(?:\/.*)?$/i, to: "/index.html" },
          { from: /^\/apppan(?:\/.*)?$/i, to: "/index.html" },
        ],
      },
      client: {
        webSocketURL: "auto://0.0.0.0:0/ws",
      },
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          return middlewares;
        }
        devServer.app.get(/^\/(?:pan|apppan)$/i, (req, res) => {
          const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
          res.redirect(302, `${req.path}/${query}`);
        });
        return middlewares;
      },
      proxy: [
        {
          context: ["/pan/api", "/apppan/api"],
          target: normalizedProxyTarget,
          changeOrigin: true,
          pathRewrite: (requestPath) =>
            requestPath.replace(/^\/(?:pan|apppan)\/api(?=\/|$)/, "/api"),
        },
      ],
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    stats: "minimal",
  };
};
