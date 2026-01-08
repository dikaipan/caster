#!/bin/bash
# Script to apply RETURN_SHIPPED removal migration
# Make sure database server is running before executing this script

echo "🔄 Applying RETURN_SHIPPED removal migration..."
echo ""

# Check if database is accessible
echo "📡 Checking database connection..."
npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Error: Cannot connect to database. Please make sure database server is running."
    exit 1
fi

echo "✅ Database connection OK"
echo ""

# Apply migration
echo "📦 Applying migration..."
npx prisma migrate dev

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📊 Verifying migration..."
    
    # Check if any RETURN_SHIPPED tickets still exist
    RETURN_SHIPPED_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM problem_tickets WHERE status = 'RETURN_SHIPPED'" 2>/dev/null | grep -o '[0-9]*' | head -1)
    
    if [ "$RETURN_SHIPPED_COUNT" = "0" ] || [ -z "$RETURN_SHIPPED_COUNT" ]; then
        echo "✅ No RETURN_SHIPPED tickets found (migration successful)"
    else
        echo "⚠️  Warning: Found $RETURN_SHIPPED_COUNT tickets with RETURN_SHIPPED status"
    fi
    
    echo ""
    echo "🎉 Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

