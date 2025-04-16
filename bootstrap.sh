#!/bin/bash

# Exit on errors
set -e

# Get project name and type from command line
project_name=$1
project_type=$2

if [ -z "$project_name" ] || [ -z "$project_type" ]; then
    echo "Usage: $0 <project_name> <project_type (nodejs|React)>"
    exit 1
fi

# Config
repo_url="https://github.com/prajwalhaniya/bootstraps.git"

# Select commit SHA and subdir based on project_type
case "$project_type" in
    nodejs)
        commit_sha="ab448202b8f702f7c30270ea3be091257e7b51ef"
        subdir="nodejs"
        ;;
    React)
        commit_sha="b89dd5a3c906bcbe388fe8564feb47543f0d7c7f"
        subdir="React"
        ;;
    *)
        echo "❌ Unsupported project type: $project_type"
        echo "Supported types: nodejs, React"
        exit 1
        ;;
esac

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

# Cleanup
rm -rf temp_clone

echo "✅ Project '$project_name' created from '$subdir' in commit $commit_sha"
