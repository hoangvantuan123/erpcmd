package main

import (
	"log"
	"os"

	"erpsyn/api"
	"erpsyn/cli"
	"erpsyn/config"
	"erpsyn/db"
)

func main() {
	// 1. Tải cấu hình
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Printf("⚠️ Cảnh báo: Không thể tải config.json, sử dụng mặc định: %v\n", err)
	}

	// 2. Khởi tạo CSDL SQLite cục bộ
	database, err := db.InitDB(cfg.DBPath)
	if err != nil {
		log.Fatalf("❌ Lỗi khởi tạo CSDL SQLite (%s): %v\n", cfg.DBPath, err)
	}
	defer database.Close()

	// 3. Khởi tạo Client API
	client := api.NewClient(cfg, database)

	// 4. Khởi chạy Giao diện điều khiển dòng lệnh CodeX CLI
	menu := cli.NewMenu(cfg, database, client)
	menu.Run()

	os.Exit(0)
}
