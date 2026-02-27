-- Spread existing users across last 30 days (by join order)
-- Keeps Daniel (super admin) at day 1, spreads others naturally

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '28 days'
WHERE email = 'daniel@printforge.com.au';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '25 days'
WHERE email = 'temp@printforge.local';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '18 days'
WHERE email = 'geoffhuens@gmail.com';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '14 days'
WHERE email = 'daniel@me.com';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '9 days'
WHERE email = 'daniel.hallaus@outlook.com.au';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '5 days'
WHERE email = 'craftidad@gmail.com';

UPDATE "User" SET "createdAt" = NOW() - INTERVAL '2 days'
WHERE email = 'tylerjssmith@hotmail.com';

-- Spread quotes across last 30 days (oldest first by ID)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn,
         COUNT(*) OVER () AS total
  FROM "Quote"
)
UPDATE "Quote" q
SET "createdAt" = NOW() - (INTERVAL '1 day' * (30 - (n.rn::float / n.total * 28)::int)),
    "updatedAt" = NOW() - (INTERVAL '1 day' * (30 - (n.rn::float / n.total * 28)::int))
FROM numbered n
WHERE q.id = n.id;

-- Spread jobs similarly
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn,
         COUNT(*) OVER () AS total
  FROM "Job"
)
UPDATE "Job" j
SET "createdAt" = NOW() - (INTERVAL '1 day' * (28 - (n.rn::float / n.total * 26)::int)),
    "updatedAt" = NOW() - (INTERVAL '1 day' * (28 - (n.rn::float / n.total * 26)::int))
FROM numbered n
WHERE j.id = n.id;
