#!/bin/bash

echo "🏏 Cricket Fantasy - Cache Infrastructure Test"
echo "=============================================="
echo ""

echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma generate failed!"
    exit 1
fi

echo ""
echo "✅ Prisma client generated successfully!"
echo ""

echo "🧪 Step 2: Running infrastructure tests..."
echo ""

node src/services/cricket-api/test-infrastructure.js

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ ALL TESTS PASSED!"
    echo "=============================================="
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check MongoDB for new cache collections"
    echo "   2. Review TESTING_CACHE_INFRASTRUCTURE.md"
    echo "   3. Ready to continue implementation"
    echo ""
else
    echo ""
    echo "=============================================="
    echo "❌ TESTS FAILED"
    echo "=============================================="
    echo ""
    echo "Check the error messages above and:"
    echo "   1. Ensure MongoDB connection is working"
    echo "   2. Verify .env file is configured"
    echo "   3. Check TESTING_CACHE_INFRASTRUCTURE.md"
    echo ""
    exit 1
fi

