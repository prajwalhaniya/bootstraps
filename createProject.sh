#!/bin/bash

# Exit on error
set -e

# Arguments
project_name=$1
project_type=$2

if [ -z "$project_name" ] || [ -z "$project_type" ]; then
    echo "Usage: $0 <project_name> <node|react>"
    exit 1
fi

# Configuration
repo_url="https://github.com/prajwalhaniya/bootstraps.git"
commit_sha="76d728a951c4038081413bdb718479f29ba2b367"

# Choose the correct subdirectory
case "$project_type" in
    node)
        subdir="nodejs"
        ;;
    react)
        subdir="react"
        ;;
    *)
        echo "Invalid project type: $project_type"
        echo "Valid options are: node, react"
        exit 1
        ;;
esac

# Create a temporary directory and clone with sparse checkout
tmp_dir=$(mktemp -d)
cd "$tmp_dir"

git init -q
git remote add origin "$repo_url"
git sparse-checkout init --cone
git sparse-checkout set "$subdir"
git fetch origin "$commit_sha" --depth=1
git checkout FETCH_HEAD

# Move the subdirectory to the destination project
cd ..
mv "$tmp_dir/$subdir" "$project_name"

# Cleanup
rm -rf "$tmp_dir"

echo "✅ Project '$project_name' created from '$subdir' at commit $commit_sha"
