#!/bin/bash
export DATABASE_URL="file:./prisma/dev.db"
npx prisma generate
npx prisma db push --accept-data-loss