FROM jekyll/jekyll:latest

# 配置 RubyGems 中国镜像
RUN gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
RUN gem sources -l

WORKDIR /site

EXPOSE 4000

CMD ["jekyll", "serve", "--host", "0.0.0.0", "--port", "4000", "--watch", "--force_polling"]
