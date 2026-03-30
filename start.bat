@echo off
REM 启动 Jekyll 本地预览
REM 访问：http://localhost:4000
set MSYS_NO_PATHCONV=1
docker stop $(docker ps -q --filter "publish=4000") 2>nul || true
docker run --rm -v //d/workspace/code/2025/zhoutaoq.github.io:/site -p 4000:4000 zhoutaoq-site
