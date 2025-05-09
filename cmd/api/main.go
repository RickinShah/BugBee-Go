package main

import (
	"context"
	"database/sql"
	"flag"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/RickinShah/BugBee/internal/jsonlog"
	"github.com/go-redis/redis/v8"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/mailer"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const version = "1.0.0"

type config struct {
	client struct {
		port     int
		host     string
		protocol string
	}
	clients     []string
	port        int
	env         string
	host        string
	protocol    string
	nsfwBaseURL string
	storage     struct {
		postBasePath    string
		profileBasePath string
	}
	db struct {
		dsn          string
		maxOpenConns int
		maxIdleConns int
		maxIdleTime  string
	}
	smtp struct {
		host     string
		port     int
		username string
		password string
		sender   string
	}
	limiter struct {
		rps     float64
		burst   int
		enabled bool
	}
	redis struct {
		address  string
		password string
		db       int
	}
	supabase struct {
		url    string
		apiKey string
	}
}

type application struct {
	config config
	logger *jsonlog.Logger
	models data.Models
	mailer mailer.Mailer
	wg     sync.WaitGroup
}

func main() {
	var cfg config

	flag.IntVar(&cfg.port, "port", 4000, "API server port")
	flag.StringVar(&cfg.client.host, "client-host", "localhost", "Frontend client host")
	flag.StringVar(&cfg.client.protocol, "client-protocol", "https", "Frontend client port")
	flag.IntVar(&cfg.client.port, "client-port", 443, "Frontend client port")
	flag.StringVar(&cfg.env, "env", "development", "Environment (development|staging|production)")
	flag.StringVar(&cfg.storage.postBasePath, "post-directory", "/posts", "Post base directory")
	flag.StringVar(&cfg.storage.profileBasePath, "profile-directory", "/profiles", "Profiles directory")
	flag.StringVar(&cfg.nsfwBaseURL, "nsfw-base-url", "http://localhost:8000", "NSFW Detector Base URL")

	flag.StringVar(&cfg.db.dsn, "db-dsn", "postgres://bugbee:bugbee@localhost/bugbee?sslmode=disable", "PostgreSQL DSN")
	flag.IntVar(&cfg.db.maxOpenConns, "db-max-open-conns", 25, "PostgreSQL max open connections")
	flag.IntVar(&cfg.db.maxIdleConns, "db-max-idle-conns", 25, "PostgreSQL max idle connections")
	flag.StringVar(&cfg.db.maxIdleTime, "db-max-idle-time", "15m", "PostgreSQL max connection idle time")

	flag.Float64Var(&cfg.limiter.rps, "limiter-rps", 300, "Rate limiter maximum requests per second")
	flag.IntVar(&cfg.limiter.burst, "limiter-burst", 400, "Rate limiter maximum burst")
	flag.BoolVar(&cfg.limiter.enabled, "limiter-enabled", true, "Enable rate limiter")

	flag.StringVar(&cfg.smtp.host, "smtp-host", "smtp.gmail.com", "SMTP host")
	flag.IntVar(&cfg.smtp.port, "smtp-port", 587, "SMTP port")
	flag.StringVar(&cfg.smtp.username, "smtp-username", "no-reply@gmail.com", "SMTP username")
	flag.StringVar(&cfg.smtp.password, "smtp-password", "", "SMTP password")
	flag.StringVar(&cfg.smtp.sender, "smtp-sender", "BugBee <no-reply@gmail.com>", "SMTP sender")

	flag.StringVar(&cfg.redis.address, "redis-address", "redis://localhost:6379", "Cache server address")
	flag.StringVar(&cfg.redis.password, "redis-password", "", "Cache server password")
	flag.IntVar(&cfg.redis.db, "cache-db", 0, "Cache server db")
	flag.StringVar(&cfg.host, "host", "localhost", "API server host")
	flag.StringVar(&cfg.protocol, "protocol", "https", "API server http protocol")

	flag.StringVar(&cfg.supabase.url, "supabase-url", "", "Supabase url")
	flag.StringVar(&cfg.supabase.apiKey, "supabase-api-key", "", "Supabase API key")

	clients := flag.String("clients", "http://localhost:5173", "Client URLs for CORS")

	flag.String("encryption-key", "", "Encryption key")

	flag.Parse()

	cfg.clients = strings.Split(*clients, ",")

	logger := jsonlog.New(os.Stdout, jsonlog.LevelInfo)

	db, err := openDb(cfg)

	if err != nil {
		logger.PrintFatal(err, nil)
	}

	defer db.Close()

	logger.PrintInfo("database connection pool established", nil)

	Redis, err := openRedis(cfg)

	if err != nil {
		logger.PrintFatal(err, nil)
	}

	defer Redis.Close()

	logger.PrintInfo("redis connection pool established", nil)

	app := &application{
		config: cfg,
		logger: logger,
		models: data.NewModels(db, Redis),
		mailer: mailer.New(cfg.smtp.host, cfg.smtp.port, cfg.smtp.username, cfg.smtp.password, cfg.smtp.sender),
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	app.StartWorkers(ctx)

	err = app.serve()
	if err != nil {
		logger.PrintFatal(err, nil)
	}

}

func openDb(cfg config) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.db.dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(cfg.db.maxOpenConns)
	db.SetMaxIdleConns(cfg.db.maxIdleConns)

	duration, err := time.ParseDuration(cfg.db.maxIdleTime)
	if err != nil {
		return nil, err
	}

	db.SetConnMaxLifetime(duration)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = db.PingContext(ctx)

	if err != nil {
		return nil, err
	}

	return db, nil
}

func openRedis(cfg config) (*redis.Client, error) {
	opt, _ := redis.ParseURL(cfg.redis.address)
	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := client.Ping(ctx).Result()

	if err != nil {
		return nil, err
	}
	return client, nil
}
