#!/bin/bash
# install-bob-docker.sh

# Auto-select npm (most reliable in Docker)
selected="npm"

# Validate Node.js 22.15+
node_version=$(node -v | sed 's/v//')
required_version="22.15.0"
min_version=$(printf '%s\n%s' "${required_version}" "${node_version}" | sort -V | head -n1)

if [[ ${min_version} != "${required_version}" ]]; then
    echo "Error: Node.js ${required_version}+ required"
    exit 1
fi

# Fetch and install silently
version=$(curl -s https://s3.us-south.cloud-object-storage.appdomain.cloud/bob-shell/bobshell-version.txt)
dl_url="https://s3.us-south.cloud-object-storage.appdomain.cloud/bob-shell/bobshell-${version}.tgz"

npm install --reg=https://registry.npmjs.org/ \
    --progress=false \
    --loglevel=error \
    -g "${dl_url}" > /tmp/bobshell-install.log 2>&1

# Verify
if command -v bob >/dev/null 2>&1; then
    echo "✓ Bob Shell ${version} installed"
    exit 0
fi

echo "✗ Installation failed"
exit 1
