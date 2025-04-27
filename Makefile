# auto-scheduling プロジェクトデプロイMakefile

# 変数定義
APP_NAME = auto-scheduling
BUILD_DIR = .next
DEPLOY_DIR = /var/www/auto-schedule
APACHE_CONF = /etc/apache2/sites-available/auto-schedule.conf

.PHONY: build deploy setup-server install-deps setup-apache enable-apache clean

# ビルド
build:
	@echo "Next.jsアプリをビルドしています..."
	npm run build

# デプロイ
deploy: build
	@echo "$(DEPLOY_DIR)にアプリをデプロイしています..."
	sudo mkdir -p $(DEPLOY_DIR)
	sudo cp -R $(BUILD_DIR) $(DEPLOY_DIR)/
	sudo cp -R public $(DEPLOY_DIR)/
	sudo cp package.json $(DEPLOY_DIR)/
	sudo cp next.config.ts $(DEPLOY_DIR)/
	sudo cp .env.local $(DEPLOY_DIR)/ || echo "警告: .env.local ファイルが見つかりません"

	@echo "必要な依存関係をインストールしています..."
	cd $(DEPLOY_DIR) && sudo npm install --production

	@echo "権限を設定しています..."
	sudo chown -R www-data:www-data $(DEPLOY_DIR)

	@echo "サーバーを再起動しています..."
	sudo systemctl restart apache2
	sudo systemctl status apache2 --no-pager

	@echo "デプロイ完了: http://localhost/auto-schedule"

# サーバーのセットアップ
setup-server:
	@echo "必要なサーバーパッケージをインストールしています..."
	sudo apt-get update
	sudo apt-get install -y apache2 nodejs npm
	sudo npm install -g pm2

	@echo "Apache モジュールを有効化しています..."
	sudo a2enmod proxy
	sudo a2enmod proxy_http
	sudo a2enmod headers
	sudo a2enmod rewrite

# Node.js 依存関係のインストール
install-deps:
	@echo "Node.js 依存関係をインストールしています..."
	npm install

# クリーンアップ
clean:
	@echo "ビルド成果物をクリーンアップしています..."
	rm -rf $(BUILD_DIR)
	rm -rf node_modules

# すべてをセットアップして実行
all: setup-server install-deps build setup-apache enable-apache deploy
	@echo "セットアップ完了。システムを確認しています..."
	curl -I http://localhost/auto-schedule
