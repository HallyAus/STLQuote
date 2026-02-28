-- Update default for new upload links to include pdf
ALTER TABLE "UploadLink" ALTER COLUMN "allowedTypes" SET DEFAULT 'stl,3mf,step,obj,gcode,pdf';

-- Update existing upload links that still have the old default (add pdf)
UPDATE "UploadLink"
SET "allowedTypes" = "allowedTypes" || ',pdf'
WHERE "allowedTypes" NOT LIKE '%pdf%';
