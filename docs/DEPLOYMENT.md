# SacredScripture Deployment Guide

This guide outlines a simple path from MVP to production.

## Option A: Cheap MVP (Fastest)
- Single VM or bare-metal server.
- Docker Compose for frontend, backend, and PostgreSQL.
- Daily backups of the database and media outputs.
- One domain name with HTTPS.

## Option B: Production (Scalable)
- Managed Postgres.
- App server behind a reverse proxy with TLS.
- Object storage for generated media.
- Automated backups and monitoring.

## Core Requirements
- Domain name and HTTPS.
- Persistent storage for media outputs.
- Secure secrets management for Stripe and JWT.

## Operational Checklist
- Backup strategy tested monthly.
- Log retention for billing and generation events.
- Stripe webhooks configured for the live environment.
- Rate limits to prevent abuse.
