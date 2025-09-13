#!/bin/bash

# Quick verification script
echo "🔍 Verifying Azure CLI and login status..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   brew install azure-cli"
    exit 1
fi

# Check login status
echo "Checking Azure login status..."
ACCOUNT_INFO=$(az account show 2>/dev/null || echo "not_logged_in")

if [ "$ACCOUNT_INFO" = "not_logged_in" ]; then
    echo "❌ Not logged into Azure. Please run:"
    echo "   az login --tenant 68f381e3-46da-47b9-ba57-6f322b8f0da1"
    exit 1
fi

# Show current account
CURRENT_SUB=$(az account show --query "id" -o tsv)
TARGET_SUB="f689f74a-ee5f-4832-95c7-540397929309"

echo "✅ Azure CLI is ready"
echo "Current subscription: $CURRENT_SUB"
echo "Target subscription:  $TARGET_SUB"

if [ "$CURRENT_SUB" != "$TARGET_SUB" ]; then
    echo "⚠️  Subscription mismatch. Setting correct subscription..."
    az account set --subscription "$TARGET_SUB"
fi

echo ""
echo "✅ Ready to run azure-setup.sh"
echo ""
echo "💡 To start setup, run:"
echo "   ./azure-setup.sh"