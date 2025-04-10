#!/bin/bash

# Exit on errors
set -e

# Get the project name from command line
project_name=$1

if [ -z "$project_name" ]; then
    echo "Usage: $0 <project_name>"
    exit 1
fi

# Config
repo_url="https://github.com/prajwalhaniya/bootstraps.git"
commit_sha="ab448202b8f702f7c30270ea3be091257e7b51ef"
subdir="nodejs"

# Create a temp directory
mkdir -p temp_clone && cd temp_clone
git init -q

# Enable sparse-checkout for just the subdir
git sparse-checkout init --cone
git sparse-checkout set "$subdir"

# Fetch the specific commit (no remote added)
git fetch "$repo_url" "$commit_sha" --depth=1
git checkout FETCH_HEAD

# Move the extracted subdir to the target project directory
cd ..
mv temp_clone/"$subdir" "$project_name"

rm -rf temp_clone

echo "✅ Project '$project_name' created from '$subdir' in commit $commit_sha"


