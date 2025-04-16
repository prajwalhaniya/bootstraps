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
mkdir -p temp_clone && cd temp_clone
git init -q
git sparse-checkout init --cone
git sparse-checkout set "$subdir"
git fetch "$repo_url" "$commit_sha" --depth=1
git checkout FETCH_HEAD

# Move the subdirectory to the destination project
cd ..
mv temp_clone/"$subdir" "$project_name"

# Cleanup
rm -rf temp_clone

echo "✅ Project '$project_name' created from '$subdir' at commit $commit_sha"
