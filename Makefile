# Vakıf Dashboard Makefile
# Makefile for Vakıf Dashboard Next.js Application

.PHONY: help build dev prod clean logs shell stop restart status

# Default target
help: ## Show this help message
	@echo "Vakıf Dashboard - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
dev: ## Start development server (local)
	npm run dev

install: ## Install dependencies
	npm install

build-local: ## Build application locally
	npm run build

# Docker commands
build: ## Build Docker image
	docker-compose build --no-cache

up: ## Start application with Docker Compose
	docker-compose up -d

up-prod: ## Start application (same as up)
	docker-compose up -d

down: ## Stop all containers
	docker-compose down

stop: ## Stop running containers
	docker-compose stop

restart: ## Restart containers
	docker-compose restart

logs: ## Show container logs
	docker-compose logs -f

logs-all: ## Show all container logs
	docker-compose logs -f

shell: ## Access container shell
	docker-compose exec web sh

# Database commands
db-backup: ## Backup SQLite database
	mkdir -p backups
	cp ./vakif.db ./backups/vakif-$(shell date +%Y%m%d-%H%M%S).db
	@echo "Database backed up to backups/"

db-restore: ## Restore database from backup (use: make db-restore FILE=backup.db)
	@if [ -z "$(FILE)" ]; then echo "Usage: make db-restore FILE=backup.db"; exit 1; fi
	cp $(FILE) ./vakif.db
	@echo "Database restored from $(FILE)"

# Cleanup commands
clean: ## Clean up containers and images
	docker-compose down --rmi all --volumes --remove-orphans

clean-all: ## Clean everything Docker related
	docker system prune -af --volumes
	docker-compose down --rmi all --volumes --remove-orphans

# Status and monitoring
status: ## Show container status
	docker-compose ps

health: ## Check application health
	curl -f http://localhost:8082 || echo "Application not healthy"

# Utility commands
create-dirs: ## Create necessary directories
	mkdir -p data uploads backups nginx/ssl

init: create-dirs install ## Initialize project (first time setup)
	@echo "Project initialized. Run 'make dev' for development or 'make up' for Docker."

# Production deployment
deploy: ## Deploy to production
	@echo "Building production image..."
	make build
	@echo "Starting production services..."
	make up-prod
	@echo "Deployment complete. Check status with 'make status'"

# Logs shortcuts
# No separate nginx service

# Quick commands
quick-restart: down up ## Quick restart (down + up)

quick-rebuild: down build up ## Quick rebuild (down + build + up)

# Help with common workflows
workflows: ## Show common workflows
	@echo ""
	@echo "Common Workflows:"
	@echo "=================="
	@echo "First time setup:     make init"
	@echo "Development:          make dev"
	@echo "Docker development:   make up && make logs"
	@echo "Production deploy:    make deploy"
	@echo "Quick restart:        make quick-restart"
	@echo "Backup database:      make db-backup"
	@echo "Clean everything:     make clean-all"
	@echo "" 