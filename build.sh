#!/bin/bash
set -e

# Install build tools
apt-get update && apt-get install -y build-essential

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install wasm-pack
cargo install wasm-pack

# Build
bun install
bun run build