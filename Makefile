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

# Apache設定
setup-apache:
	@echo "Apache設定ファイルを作成しています..."
	sudo bash -c 'cat > $(APACHE_CONF) << EOL
<VirtualHost *:80>
    ServerName localhost
    ServerAlias auto-schedule

    # プロキシ設定
    ProxyRequests Off
    ProxyPreserveHost On

    # 静的ファイル
    Alias /auto-schedule/static $(DEPLOY_DIR)/.next/static
    <Directory $(DEPLOY_DIR)/.next/static>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # /auto-schedule パスへのリクエストを Node.js にルーティング
    <Location /auto-schedule>
        ProxyPass http://localhost:3000/auto-schedule
        ProxyPassReverse http://localhost:3000/auto-schedule
    </Location>

    # フロントエンドリクエストも Node.js にルーティング
    <LocationMatch "^/auto-schedule/(.*)$">
        ProxyPass http://localhost:3000/auto-schedule/\$1
        ProxyPassReverse http://localhost:3000/auto-schedule/\$1
    </LocationMatch>

    ErrorLog \${APACHE_LOG_DIR}/auto-schedule-error.log
    CustomLog \${APACHE_LOG_DIR}/auto-schedule-access.log combined
</VirtualHost>
EOL'

	@echo "PM2 サービス設定ファイルを作成しています..."
	sudo bash -c 'cat > /etc/systemd/system/pm2-auto-schedule.service << EOL
[Unit]
Description=PM2 process manager for auto-schedule
After=network.target

[Service]
Type=forking
User=www-data
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Environment=PM2_HOME=/var/www/.pm2
WorkingDirectory=$(DEPLOY_DIR)
ExecStart=/usr/local/bin/pm2 start npm --name "auto-schedule" -- start -- -p 3000
ExecReload=/usr/local/bin/pm2 reload auto-schedule
ExecStop=/usr/local/bin/pm2 stop auto-schedule
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL'

	@echo "PM2 サービスを有効化しています..."
	sudo systemctl daemon-reload
	sudo systemctl enable pm2-auto-schedule

# Apache設定の有効化
enable-apache: setup-apache
	@echo "Apache設定を有効化しています..."
	sudo a2ensite auto-schedule
	sudo systemctl reload apache2

# クリーンアップ
clean:
	@echo "ビルド成果物をクリーンアップしています..."
	rm -rf $(BUILD_DIR)
	rm -rf node_modules

# すべてをセットアップして実行
all: setup-server install-deps build setup-apache enable-apache deploy
	@echo "セットアップ完了。システムを確認しています..."
	curl -I http://localhost/auto-schedule
