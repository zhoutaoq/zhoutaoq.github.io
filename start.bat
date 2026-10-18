@echo off
chcp 65001 >nul
REM 启动 Jekyll 本地预览
REM 访问：http://localhost:4000
REM
REM 背景说明：本机容器网络拉不到 rubygems，镜像默认入口的 bundle install / jekyll serve 走不通，
REM          所以拆成两个容器：一个持续编译，一个对外提供静态文件。
REM
REM 注意：必须带上 _config.dev.yml，否则 site.url 仍是线上域名，
REM      页面会去 https://zhoutaoq.github.io 拉 CSS/JS，本地改动看不到效果。

setlocal
set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"

echo [1/2] 启动构建容器 site-build ...
docker rm -f site-build >nul 2>&1
docker run -d --name site-build ^
  -e JEKYLL_NO_BUNDLER_REQUIRE=true ^
  -v "%REPO%:/site" ^
  --entrypoint ruby ^
  zhoutaoq-site /usr/gem/bin/jekyll build --watch --force_polling --config _config.yml,_config.dev.yml

echo [2/2] 启动静态服务 site-serve ...
docker rm -f site-serve >nul 2>&1
docker run -d --name site-serve ^
  -p 4000:4000 ^
  -v "%REPO%\_site:/srv:ro" ^
  python:3.11-slim python -m http.server 4000 --directory /srv

echo.
echo Done. Open http://localhost:4000 (first build takes ~10s)
echo Stop : docker rm -f site-build site-serve
endlocal
