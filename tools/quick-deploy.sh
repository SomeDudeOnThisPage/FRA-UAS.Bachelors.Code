#!/bin/bash

DEPLOY_PATH="$HOME/www/maedn-node-server"
REPO_SOURCE=$(dirname "$(dirname "$0")")

# link required files
ln -sf "$REPO_SOURCE" "$DEPLOY_PATH"

# npm install
pushd "$DEPLOY_PATH" && npm install && popd || exit