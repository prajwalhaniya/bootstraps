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
base_repo_url="https://github.com/prajwalhaniya/bootstraps"

# Select subdirectory URL based on project_type
case "$project_type" in
    nodejs)
        dir_url="$base_repo_url/tree/master/nodejs"
        subdir="nodejs"
        ;;
    React)
        dir_url="$base_repo_url/tree/master/React"
        subdir="React"
        ;;
    python)
        dir_url="$base_repo_url/tree/master/python"
        subdir="python"
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

# Fetch the master branch (no remote added)
git fetch "$base_repo_url.git" master --depth=1
git checkout FETCH_HEAD

# Move the extracted subdir to the target project directory
cd ..
mv temp_clone/"$subdir" "$project_name"

# Cleanup
rm -rf temp_clone

echo "✅ Project '$project_name' created from '$subdir'"