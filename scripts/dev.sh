#!/usr/bin/env bash

echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

echo "Starting server..."
cd server
bun install
bun run dev &
SERVER_PID=$!
cd ..

echo "Starting client..."
cd client
npm install
npm run dev &
CLIENT_PID=$!
cd ..

echo "Server and client are running."
echo "Press Ctrl+C to stop everything."

# Wait and handle shutdown
trap "echo 'Stopping...'; kill $SERVER_PID $CLIENT_PID; docker compose stop; exit" INT
wait